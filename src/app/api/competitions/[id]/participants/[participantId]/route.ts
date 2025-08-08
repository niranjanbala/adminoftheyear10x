import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService, participationService } from '@/lib/database'
import { z } from 'zod'

const updateParticipantSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'withdrawn']),
  feedback: z.string().optional()
})

async function putHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const competitionId = pathParts[3] // /api/competitions/[id]/participants/[participantId]
    const participantId = pathParts[5]
    
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

    const body = await request.json()
    const validatedData = updateParticipantSchema.parse(body)

    // Get current participation
    const participants = await participationService.getByCompetition(competitionId)
    const participant = participants.find(p => p.id === participantId)
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Update participant status
    const updateData: any = {
      status: validatedData.status
    }

    if (validatedData.status === 'approved') {
      updateData.approved_at = new Date().toISOString()
    }

    const updatedParticipant = await participationService.update(participantId, updateData)

    return NextResponse.json(updatedParticipant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating participant:', error)
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    )
  }
}

async function deleteHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const competitionId = pathParts[3]
    const participantId = pathParts[5]
    
    const competition = await competitionService.getByIdDirect(competitionId)
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Get current participation
    const participants = await participationService.getByCompetition(competitionId)
    const participant = participants.find(p => p.id === participantId)
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    // Check permissions - user can withdraw their own participation or organizer can remove
    const canDelete = user.id === participant.user_id || 
                     competition.created_by === user.id || 
                     user.role === 'super_admin'
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // If user is withdrawing their own participation, set status to withdrawn
    // If organizer is removing, delete the record
    if (user.id === participant.user_id) {
      const updatedParticipant = await participationService.update(participantId, {
        status: 'withdrawn'
      })
      return NextResponse.json(updatedParticipant)
    } else {
      // For now, we'll set status to rejected instead of deleting to maintain data integrity
      const updatedParticipant = await participationService.update(participantId, {
        status: 'rejected'
      })
      return NextResponse.json(updatedParticipant)
    }
  } catch (error) {
    console.error('Error removing participant:', error)
    return NextResponse.json(
      { error: 'Failed to remove participant' },
      { status: 500 }
    )
  }
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['PUT', 'DELETE'],
}

export const PUT = withCors(
  withAuth(putHandler, { requireVerified: true }),
  corsOptions
)

export const DELETE = withCors(
  withAuth(deleteHandler, { requireVerified: true }),
  corsOptions
)