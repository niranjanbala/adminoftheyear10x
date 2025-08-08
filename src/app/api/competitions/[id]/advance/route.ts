import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService, participationService } from '@/lib/database'
import { z } from 'zod'

const advanceSchema = z.object({
  next_tier: z.enum(['national', 'global']),
  winner_count: z.number().min(1).max(100).optional(),
  qualification_criteria: z.object({
    min_votes: z.number().min(0).optional(),
    top_n: z.number().min(1).max(100).optional(),
    requiresApproval: z.boolean().optional()
  }).optional()
})

async function postHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const competitionId = url.pathname.split('/')[3] // /api/competitions/[id]/advance
    
    const competition = await competitionService.getByIdDirect(competitionId)
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if user can manage this competition
    if (competition.created_by !== user.id && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if competition is completed
    if (competition.status !== 'completed') {
      return NextResponse.json(
        { error: 'Competition must be completed before advancing winners' },
        { status: 400 }
      )
    }

    // Check if competition can advance to next tier
    if (competition.tier === 'global') {
      return NextResponse.json(
        { error: 'Global competitions cannot advance further' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = advanceSchema.parse(body)

    // Validate tier progression
    const validProgression = 
      (competition.tier === 'local' && validatedData.next_tier === 'national') ||
      (competition.tier === 'national' && validatedData.next_tier === 'global')

    if (!validProgression) {
      return NextResponse.json(
        { error: 'Invalid tier progression' },
        { status: 400 }
      )
    }

    // Get participants and determine winners
    const participants = await participationService.getByCompetition(competitionId)
    const approvedParticipants = participants.filter(p => p.status === 'approved')
    
    if (approvedParticipants.length === 0) {
      return NextResponse.json(
        { error: 'No approved participants to advance' },
        { status: 400 }
      )
    }

    // Sort by vote count (descending)
    const sortedParticipants = approvedParticipants.sort((a, b) => b.vote_count - a.vote_count)

    // Determine winners based on criteria
    let winners = []
    const criteria = validatedData.qualification_criteria || competition.qualification_rules

    if (criteria?.top_n) {
      winners = sortedParticipants.slice(0, criteria.top_n)
    } else if (criteria?.min_votes) {
      winners = sortedParticipants.filter(p => p.vote_count >= criteria.min_votes)
    } else {
      // Default: top 3 or 10% of participants, whichever is larger
      const defaultCount = Math.max(3, Math.ceil(sortedParticipants.length * 0.1))
      winners = sortedParticipants.slice(0, Math.min(defaultCount, validatedData.winner_count || defaultCount))
    }

    if (winners.length === 0) {
      return NextResponse.json(
        { error: 'No participants meet the qualification criteria' },
        { status: 400 }
      )
    }

    // Create next tier competition
    const nextTierCompetition = await createNextTierCompetition(
      competition,
      validatedData.next_tier,
      winners,
      user.id
    )

    // Update current competition with advancement info
    await competitionService.updateDirect(competitionId, {
      advancement_info: {
        next_tier_competition_id: nextTierCompetition.id,
        advanced_participants: winners.length,
        advancement_date: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      next_competition: nextTierCompetition,
      advanced_participants: winners.length,
      message: `Successfully advanced ${winners.length} participants to ${validatedData.next_tier} tier`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error advancing competition:', error)
    return NextResponse.json(
      { error: 'Failed to advance competition' },
      { status: 500 }
    )
  }
}

async function createNextTierCompetition(
  sourceCompetition: any,
  nextTier: 'national' | 'global',
  winners: any[],
  createdBy: string
) {
  // Calculate dates for next tier competition
  const now = new Date()
  const registrationStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
  const registrationEnd = new Date(registrationStart.getTime() + 14 * 24 * 60 * 60 * 1000) // 2 weeks later
  const votingStart = new Date(registrationEnd.getTime() + 1 * 24 * 60 * 60 * 1000) // 1 day after registration
  const votingEnd = new Date(votingStart.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week of voting

  // Create next tier competition
  const nextCompetitionData = {
    title: `${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} ${sourceCompetition.title}`,
    description: `${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} tier competition featuring winners from local competitions.`,
    tier: nextTier,
    country: nextTier === 'global' ? null : sourceCompetition.country,
    status: 'draft' as const,
    registration_start: registrationStart.toISOString(),
    registration_end: registrationEnd.toISOString(),
    voting_start: votingStart.toISOString(),
    voting_end: votingEnd.toISOString(),
    max_participants: nextTier === 'global' ? 50 : 100,
    qualification_rules: {
      requiresApproval: true,
      topN: nextTier === 'global' ? 10 : 20,
      minVotes: Math.ceil(winners.reduce((sum, w) => sum + w.vote_count, 0) / winners.length * 0.5)
    },
    created_by: createdBy,
    source_competition_id: sourceCompetition.id
  }

  const nextCompetition = await competitionService.createDirect(nextCompetitionData)

  // Auto-register winners in next tier competition
  for (const winner of winners) {
    await participationService.create({
      competition_id: nextCompetition.id,
      user_id: winner.user_id,
      status: 'approved', // Auto-approve winners
      submission_title: winner.submission_title,
      submission_description: winner.submission_description,
      submission_media: winner.submission_media,
      applied_at: new Date().toISOString(),
      approved_at: new Date().toISOString()
    })
  }

  return nextCompetition
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['POST'],
}

export const POST = withCors(
  withAuth(postHandler, { requireRole: 'organizer', requireVerified: true }),
  corsOptions
)