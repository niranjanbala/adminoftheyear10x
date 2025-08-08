import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService } from '@/lib/database'
import { z } from 'zod'

const updateCompetitionSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'registration_open', 'registration_closed', 'voting_open', 'voting_closed', 'completed']).optional(),
  registration_start: z.string().optional(),
  registration_end: z.string().optional(),
  voting_start: z.string().optional(),
  voting_end: z.string().optional(),
  max_participants: z.number().min(1).max(1000).optional(),
  qualification_rules: z.object({
    requiresApproval: z.boolean(),
    topN: z.number().min(1).max(100).optional(),
    minVotes: z.number().min(0).optional(),
  }).optional(),
})

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()!
    const competition = await competitionService.getByIdDirect(id)
    
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(competition)
  } catch (error) {
    console.error('Error fetching competition:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competition' },
      { status: 500 }
    )
  }
}

async function putHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()!
    const competition = await competitionService.getByIdDirect(id)
    
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if user can edit this competition
    if (competition.created_by !== user.id && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateCompetitionSchema.parse(body)

    // Validate dates if provided
    if (validatedData.registration_start || validatedData.registration_end || 
        validatedData.voting_start || validatedData.voting_end) {
      
      const regStart = new Date(validatedData.registration_start || competition.registration_start!)
      const regEnd = new Date(validatedData.registration_end || competition.registration_end!)
      const voteStart = new Date(validatedData.voting_start || competition.voting_start!)
      const voteEnd = new Date(validatedData.voting_end || competition.voting_end!)

      if (regStart >= regEnd) {
        return NextResponse.json(
          { error: 'Registration end must be after registration start' },
          { status: 400 }
        )
      }
      if (regEnd > voteStart) {
        return NextResponse.json(
          { error: 'Voting start must be after registration end' },
          { status: 400 }
        )
      }
      if (voteStart >= voteEnd) {
        return NextResponse.json(
          { error: 'Voting end must be after voting start' },
          { status: 400 }
        )
      }
    }

    const updatedCompetition = await competitionService.updateDirect(id, validatedData)

    return NextResponse.json(updatedCompetition)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating competition:', error)
    return NextResponse.json(
      { error: 'Failed to update competition' },
      { status: 500 }
    )
  }
}

async function deleteHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()!
    const competition = await competitionService.getByIdDirect(id)
    
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Check if user can delete this competition
    if (competition.created_by !== user.id && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Only allow deletion of draft competitions
    if (competition.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft competitions can be deleted' },
        { status: 400 }
      )
    }

    await competitionService.deleteDirect(id)

    return NextResponse.json({ message: 'Competition deleted successfully' })
  } catch (error) {
    console.error('Error deleting competition:', error)
    return NextResponse.json(
      { error: 'Failed to delete competition' },
      { status: 500 }
    )
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['GET', 'PUT', 'DELETE'],
}

export const GET = withCors(
  withAuth(getHandler, { requireVerified: false }),
  corsOptions
)

export const PUT = withCors(
  withAuth(putHandler, { requireRole: 'organizer', requireVerified: true }),
  corsOptions
)

export const DELETE = withCors(
  withAuth(deleteHandler, { requireRole: 'organizer', requireVerified: true }),
  corsOptions
)