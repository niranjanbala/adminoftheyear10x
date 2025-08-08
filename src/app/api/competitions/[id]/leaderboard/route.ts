import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withCors } from '@/lib/auth-middleware'
import { competitionService } from '@/lib/database'

async function getHandler(request: NextRequest, { user }: any) {
  try {
    const url = new URL(request.url)
    const competitionId = url.pathname.split('/')[3] // /api/competitions/[id]/leaderboard
    
    const competition = await competitionService.getByIdDirect(competitionId)
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const searchParams = url.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'vote_count'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Get leaderboard data
    const leaderboard = await competitionService.getLeaderboard(competitionId)
    
    // Apply sorting
    const sortedLeaderboard = leaderboard.sort((a: any, b: any) => {
      const aValue = a[sortBy] || 0
      const bValue = b[sortBy] || 0
      
      if (sortOrder === 'desc') {
        return bValue - aValue
      } else {
        return aValue - bValue
      }
    })

    // Apply pagination
    const paginatedLeaderboard = sortedLeaderboard.slice(offset, offset + limit)

    // Add ranking information
    const rankedLeaderboard = paginatedLeaderboard.map((participant: any, index: number) => ({
      ...participant,
      rank: offset + index + 1,
      trend: calculateTrend(participant, index) // This would need historical data
    }))

    // Get competition stats
    const stats = await competitionService.getStats(competitionId)

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      stats: {
        total_participants: stats?.total_participants || 0,
        total_votes: stats?.total_votes || 0,
        last_updated: new Date().toISOString()
      },
      pagination: {
        limit,
        offset,
        total: leaderboard.length,
        has_more: offset + limit < leaderboard.length
      }
    })

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

function calculateTrend(participant: any, currentRank: number): 'up' | 'down' | 'same' | 'new' {
  // This is a simplified trend calculation
  // In a real implementation, you'd compare with historical rankings
  const previousRank = participant.previous_rank
  
  if (!previousRank) return 'new'
  if (currentRank < previousRank) return 'up'
  if (currentRank > previousRank) return 'down'
  return 'same'
}

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['GET'],
}

export const GET = withCors(
  withAuth(getHandler, { requireVerified: false }),
  corsOptions
)