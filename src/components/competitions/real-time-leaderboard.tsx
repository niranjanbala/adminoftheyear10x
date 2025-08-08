'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Minus, Crown, Medal, Award, RefreshCw } from 'lucide-react'
import { realtimeService } from '@/lib/database'

interface LeaderboardEntry {
  id: string
  user_id: string
  user: {
    display_name: string
    profile_picture_url: string | null
  }
  submission_title: string | null
  vote_count: number
  rank: number
  trend: 'up' | 'down' | 'same' | 'new'
  previous_rank?: number
}

interface LeaderboardStats {
  total_participants: number
  total_votes: number
  last_updated: string
}

interface RealTimeLeaderboardProps {
  competitionId: string
  competitionTitle: string
  showFilters?: boolean
  maxEntries?: number
}

export function RealTimeLeaderboard({ 
  competitionId, 
  competitionTitle, 
  showFilters = true,
  maxEntries = 50 
}: RealTimeLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState('vote_count')
  const [sortOrder, setSortOrder] = useState('desc')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchLeaderboard = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true)
    
    try {
      const params = new URLSearchParams({
        limit: maxEntries.toString(),
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/competitions/${competitionId}/leaderboard?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [competitionId, maxEntries, sortBy, sortOrder])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!autoRefresh) return

    const leaderboardSubscription = realtimeService.subscribeToLeaderboard(
      competitionId,
      () => {
        fetchLeaderboard()
      }
    )

    const votesSubscription = realtimeService.subscribeToVotes(
      competitionId,
      () => {
        fetchLeaderboard()
      }
    )

    // Auto-refresh every 30 seconds as fallback
    const interval = setInterval(() => {
      fetchLeaderboard()
    }, 30000)

    return () => {
      realtimeService.unsubscribe(leaderboardSubscription)
      realtimeService.unsubscribe(votesSubscription)
      clearInterval(interval)
    }
  }, [competitionId, autoRefresh, fetchLeaderboard])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'new':
        return <Badge variant="secondary" className="text-xs">NEW</Badge>
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else {
      return date.toLocaleTimeString()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Leaderboard</h2>
          <p className="text-muted-foreground">
            Real-time rankings for &quot;{competitionTitle}&quot;
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex gap-2 text-sm">
              <Badge variant="secondary">
                {stats.total_participants} participants
              </Badge>
              <Badge variant="secondary">
                {stats.total_votes} votes
              </Badge>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLeaderboard(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort by:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vote_count">Vote Count</SelectItem>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="user.display_name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Order:</label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>
      )}

      {stats && (
        <div className="text-center text-sm text-muted-foreground">
          Last updated: {formatLastUpdated(stats.last_updated)}
          {autoRefresh && <span className="ml-2">• Auto-refreshing</span>}
        </div>
      )}

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No participants to show in leaderboard yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <Card key={entry.id} className={`transition-all duration-300 ${
              entry.rank <= 3 ? 'ring-2 ring-primary/20' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getRankBadgeColor(entry.rank)}>
                        #{entry.rank}
                      </Badge>
                      {getRankIcon(entry.rank)}
                      {getTrendIcon(entry.trend)}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {entry.user.profile_picture_url ? (
                          <img
                            src={entry.user.profile_picture_url}
                            alt={entry.user.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          entry.user.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg">
                          {entry.user.display_name}
                        </h4>
                        {entry.submission_title && (
                          <p className="text-sm text-muted-foreground">
                            {entry.submission_title}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {entry.vote_count}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.vote_count === 1 ? 'vote' : 'votes'}
                    </div>
                    {entry.previous_rank && entry.previous_rank !== entry.rank && (
                      <div className="text-xs text-muted-foreground">
                        was #{entry.previous_rank}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {leaderboard.length >= maxEntries && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Showing top {maxEntries} participants
          </p>
        </div>
      )}
    </div>
  )
}