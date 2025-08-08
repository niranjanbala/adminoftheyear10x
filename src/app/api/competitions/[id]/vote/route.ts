import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService, votingService, participationService } from '@/lib/database'
import { z } from 'zod'
import { headers } from 'next/headers'

const voteSchema = z.object({
  participant_id: z.string().uuid(),
})

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(ip: string, userId: string): string {
  return `${ip}:${userId}`
}

function checkRateLimit(key: string, maxVotes: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= maxVotes) {
    return false
  }
  
  record.count++
  return true
}

async function postHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const competitionId = url.pathname.split('/')[3] // /api/competitions/[id]/vote
    
    // Get client IP
    const headersList = headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const clientIp = forwarded?.split(',')[0] || realIp || '127.0.0.1'
    
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(clientIp, user.id)
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before voting again.' },
        { status: 429 }
      )
    }

    const competition = await competitionService.getByIdDirect(competitionId)
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if voting is open
    const now = new Date()
    const voteStart = competition.voting_start ? new Date(competition.voting_start) : null
    const voteEnd = competition.voting_end ? new Date(competition.voting_end) : null
    
    if (!voteStart || !voteEnd || now < voteStart || now > voteEnd) {
      return NextResponse.json(
        { error: 'Voting is not currently open for this competition' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = voteSchema.parse(body)

    // Verify participant exists and is approved
    const participants = await participationService.getByCompetition(competitionId)
    const participant = participants.find(p => p.id === validatedData.participant_id)
    
    if (!participant || participant.status !== 'approved') {
      return NextResponse.json(
        { error: 'Invalid participant or participant not approved' },
        { status: 400 }
      )
    }

    // Check if user can vote (not their own submission, hasn't voted for this participant)
    if (participant.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot vote for your own submission' },
        { status: 400 }
      )
    }

    const canVote = await votingService.canUserVote(user.id, competitionId, validatedData.participant_id)
    if (!canVote) {
      return NextResponse.json(
        { error: 'You have already voted for this participant' },
        { status: 400 }
      )
    }

    // Cast the vote
    const voteData = {
      competition_id: competitionId,
      participant_id: validatedData.participant_id,
      voter_id: user.id,
      voter_ip: clientIp,
      timestamp: new Date().toISOString(),
      verified: user.verification_status === 'verified'
    }

    const vote = await votingService.castVote(voteData)

    return NextResponse.json({
      success: true,
      vote_id: vote.id,
      message: 'Vote cast successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Duplicate vote detected') {
      return NextResponse.json(
        { error: 'Duplicate vote detected' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return NextResponse.json(
        { error: 'Too many votes from this IP address. Please wait before voting again.' },
        { status: 429 }
      )
    }

    console.error('Error casting vote:', error)
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    )
  }
}

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const competitionId = url.pathname.split('/')[3]
    
    // Get user's voting status for this competition
    const votingStatus = await votingService.getUserVotingStatus(user.id, competitionId)
    
    return NextResponse.json(votingStatus)
  } catch (error) {
    console.error('Error fetching voting status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voting status' },
      { status: 500 }
    )
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['GET', 'POST'],
}

export const GET = withCors(
  withAuth(getHandler, { requireVerified: true }),
  corsOptions
)

export const POST = withCors(
  withAuth(postHandler, { requireVerified: true }),
  corsOptions
)