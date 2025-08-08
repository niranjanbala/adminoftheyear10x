'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { competitionService } from '@/lib/database'
import { useAuth } from '@/components/auth/auth-provider'
import Link from 'next/link'
import type { CompetitionTier, CompetitionStatus } from '@/types'

interface Competition {
  id: string
  title: string
  description: string | null
  tier: CompetitionTier
  country: string | null
  status: CompetitionStatus
  registration_start: string | null
  registration_end: string | null
  voting_start: string | null
  voting_end: string | null
  max_participants: number | null
  created_at: string
  created_by: string
}

interface CompetitionListProps {
  showCreateButton?: boolean
  onCreateClick?: () => void
}

export function CompetitionList({ showCreateButton = false, onCreateClick }: CompetitionListProps) {
  const { user } = useAuth()
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const filters: any = {}
        if (tierFilter !== 'all') filters.tier = tierFilter
        if (statusFilter !== 'all') filters.status = statusFilter

        const data = await competitionService.getAll(filters)
        setCompetitions(data)
      } catch (error) {
        console.error('Error fetching competitions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompetitions()
  }, [tierFilter, statusFilter])

  const getStatusBadgeColor = (status: CompetitionStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'registration_open':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'registration_closed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'voting_open':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'voting_closed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'completed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTierBadgeColor = (tier: CompetitionTier) => {
    switch (tier) {
      case 'local':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'national':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'global':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCompetitionPhase = (competition: Competition) => {
    const now = new Date()
    const regStart = competition.registration_start ? new Date(competition.registration_start) : null
    const regEnd = competition.registration_end ? new Date(competition.registration_end) : null
    const voteStart = competition.voting_start ? new Date(competition.voting_start) : null
    const voteEnd = competition.voting_end ? new Date(competition.voting_end) : null

    if (competition.status === 'draft') return 'Draft'
    if (regStart && now < regStart) return 'Upcoming'
    if (regStart && regEnd && now >= regStart && now <= regEnd) return 'Registration Open'
    if (regEnd && voteStart && now > regEnd && now < voteStart) return 'Registration Closed'
    if (voteStart && voteEnd && now >= voteStart && now <= voteEnd) return 'Voting Open'
    if (voteEnd && now > voteEnd) return 'Completed'
    return 'Unknown'
  }

  const filteredCompetitions = competitions.filter(competition =>
    competition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (competition.description && competition.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Competitions</h2>
          <p className="text-muted-foreground">
            Discover and participate in HubSpot Admin competitions
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={onCreateClick}>
            Create Competition
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search competitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="national">National</SelectItem>
            <SelectItem value="global">Global</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="registration_open">Registration Open</SelectItem>
            <SelectItem value="voting_open">Voting Open</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Competition Grid */}
      {filteredCompetitions.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
          <p className="text-muted-foreground">
            {searchTerm || tierFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more competitions.'
              : 'There are no competitions available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.map((competition) => (
            <Card key={competition.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{competition.title}</CardTitle>
                    <div className="flex gap-2 mb-2">
                      <Badge className={getTierBadgeColor(competition.tier)}>
                        {competition.tier}
                      </Badge>
                      <Badge className={getStatusBadgeColor(competition.status)}>
                        {getCompetitionPhase(competition)}
                      </Badge>
                    </div>
                  </div>
                </div>
                {competition.country && (
                  <p className="text-sm text-muted-foreground">📍 {competition.country}</p>
                )}
              </CardHeader>
              <CardContent>
                {competition.description && (
                  <CardDescription className="mb-4 line-clamp-3">
                    {competition.description}
                  </CardDescription>
                )}
                
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex justify-between">
                    <span>Registration:</span>
                    <span>{formatDate(competition.registration_start)} - {formatDate(competition.registration_end)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Voting:</span>
                    <span>{formatDate(competition.voting_start)} - {formatDate(competition.voting_end)}</span>
                  </div>
                  {competition.max_participants && (
                    <div className="flex justify-between">
                      <span>Max Participants:</span>
                      <span>{competition.max_participants}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/competitions/${competition.id}`}>
                      View Details
                    </Link>
                  </Button>
                  {user && (
                    <Button variant="outline" asChild>
                      <Link href={`/competitions/${competition.id}/participate`}>
                        Participate
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}