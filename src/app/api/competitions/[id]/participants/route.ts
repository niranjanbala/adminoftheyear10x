import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService, participationService } from '@/lib/database'
import { z } from 'zod'

const participationApplicationSchema = z.object({
  submission_title: z.string().min(3).max(100),
  submission_description: z.string().min(10).max(1000),
  submission_media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    filename: z.string(),
    size: z.number()
  })).optional().default([]),
  portfolio_links: z.array(z.string().url()).optional().default([])
})

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const competitionId = url.pathname.split('/')[3] // /api/competitions/[id]/participants
    
    const competition = await competitionService.getByIdDirect(competitionId)
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if user can view participants (organizer or super admin)
    const canManage = user.id === competition.created_by || user.role === 'super_admin'
    
    const participants = await participationService.getByCompetition(competitionId)
    
    // If not organizer, only show approved participants
    const filteredParticipants = canManage 
      ? participants 
      : participants.filter(p => p.status === 'approved')

    return NextResponse.json(filteredParticipants)
  } catch (error) {
    console.error('Error fetching participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const competitionId = url.pathname.split('/')[3] // /api/competitions/[id]/participants
    
    const competition = await competitionService.getByIdDirect(competitionId)
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if registration is open
    const now = new Date()
    const regStart = competition.registration_start ? new Date(competition.registration_start) : null
    const regEnd = competition.registration_end ? new Date(competition.registration_end) : null
    
    if (!regStart || !regEnd || now < regStart || now > regEnd) {
      return NextResponse.json(
        { error: 'Registration is not currently open for this competition' },
        { status: 400 }
      )
    }

    // Check if user is already participating
    const existingParticipation = await participationService.getByUser(user.id)
    const alreadyParticipating = existingParticipation.some(p => p.competition_id === competitionId)
    
    if (alreadyParticipating) {
      return NextResponse.json(
        { error: 'You are already registered for this competition' },
        { status: 400 }
      )
    }

    // Check max participants limit
    if (competition.max_participants) {
      const currentParticipants = await participationService.getByCompetition(competitionId)
      const approvedCount = currentParticipants.filter(p => p.status === 'approved').length
      
      if (approvedCount >= competition.max_participants) {
        return NextResponse.json(
          { error: 'Competition has reached maximum participant limit' },
          { status: 400 }
        )
      }
    }

    const body = await request.json()
    const validatedData = participationApplicationSchema.parse(body)

    // Create participation record
    const participationData = {
      competition_id: competitionId,
      user_id: user.id,
      status: 'pending' as const,
      submission_title: validatedData.submission_title,
      submission_description: validatedData.submission_description,
      submission_media: validatedData.submission_media,
      applied_at: new Date().toISOString()
    }

    const participation = await participationService.create(participationData)

    return NextResponse.json(participation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating participation:', error)
    return NextResponse.json(
      { error: 'Failed to create participation' },
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
  withAuth(getHandler, { requireVerified: false }),
  corsOptions
)

export const POST = withCors(
  withAuth(postHandler, { requireVerified: true }),
  corsOptions
)