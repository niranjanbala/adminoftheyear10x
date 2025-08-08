import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService } from '@/lib/database'
import { z } from 'zod'

const createCompetitionSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  tier: z.enum(['local', 'national', 'global']),
  country: z.string().min(2).optional(),
  registration_start: z.string(),
  registration_end: z.string(),
  voting_start: z.string(),
  voting_end: z.string(),
  max_participants: z.number().min(1).max(1000).optional(),
  qualification_rules: z.object({
    requiresApproval: z.boolean(),
    topN: z.number().min(1).max(100).optional(),
    minVotes: z.number().min(0).optional(),
  }),
})

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier')
    const country = searchParams.get('country')
    const status = searchParams.get('status')

    const filters: any = {}
    if (tier) filters.tier = tier
    if (country) filters.country = country
    if (status) filters.status = status

    const competitions = await competitionService.getAllDirect(filters)

    return NextResponse.json(competitions)
  } catch (error) {
    console.error('Error fetching competitions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitions' },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest, { user }: any) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = createCompetitionSchema.parse(body)
    
    // Validate dates
    const regStart = new Date(validatedData.registration_start)
    const regEnd = new Date(validatedData.registration_end)
    const voteStart = new Date(validatedData.voting_start)
    const voteEnd = new Date(validatedData.voting_end)

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

    // Create competition
    const competitionData = {
      ...validatedData,
      status: 'draft' as const,
      country: validatedData.tier === 'local' ? validatedData.country : null,
      created_by: user.id,
    }

    const competition = await competitionService.createDirect(competitionData)

    return NextResponse.json(competition, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating competition:', error)
    return NextResponse.json(
      { error: 'Failed to create competition' },
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
  withAuth(postHandler, { requireRole: 'organizer', requireVerified: true }),
  corsOptions
)