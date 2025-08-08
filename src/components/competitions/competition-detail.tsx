'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { competitionService, participationService } from '@/lib/database'
import { useAuth } from '@/components/auth/auth-provider'
import { CompetitionStatusManager } from './competition-status-manager'
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
  qualification_rules: any
  created_at: string
  created_by: string
}

interface Participant {
  id: string
  user_id: string
  status: string
  submission_title: string | null
  submission_description: string | null
  vote_count: number
  ranking: number | null
  applied_at: string
  user: {
    display_name: string
    profile_picture_url: string | null
  }
}

interface CompetitionDetailProps {
  competitionId: string
}

export function CompetitionDetail({ competitionId }: CompetitionDetailProps) {
  const { user } = useAuth()
  const [competition, setCompetition] = useState<Competition | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userParticipation, setUserParticipation] = useState<Participant | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [competitionData, participantsData] = await Promise.all([
          competitionService.getById(competitionId),
          participationService.getByCompetition(competitionId)
        ])

        setCompetition(competitionData as Competition)
        setParticipants(participantsData as Participant[])

        // Check if current user is participating
        if (user) {
          const userParticipant = participantsData.find(p => p.user_id === user.id)
          setUserParticipation(userParticipant || null)
        }
      } catch (error) {
        console.error('Error fetching competition data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [competitionId, user])

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCompetitionPhase = () => {
    if (!competition) return 'Unknown'
    
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

  const canRegister = () => {
    if (!competition || !user) return false
    if (userParticipation) return false
    
    const now = new Date()
    const regStart = competition.registration_start ? new Date(competition.registration_start) : null
    const regEnd = competition.registration_end ? new Date(competition.registration_end) : null
    
    return regStart && regEnd && now >= regStart && now <= regEnd
  }

  const canVote = () => {
    if (!competition || !user) return false
    
    const now = new Date()
    const voteStart = competition.voting_start ? new Date(competition.voting_start) : null
    const voteEnd = competition.voting_end ? new Date(competition.voting_end) : null
    
    return voteStart && voteEnd && now >= voteStart && now <= voteEnd
  }

  const canManageCompetition = () => {
    if (!competition || !user) return false
    return user.id === competition.created_by || user.role === 'super_admin'
  }

  const handleStatusUpdate = (newStatus: CompetitionStatus) => {
    if (competition) {
      setCompetition({ ...competition, status: newStatus })
    }
  }

  const approvedParticipants = participants.filter(p => p.status === 'approved')
  const pendingParticipants = participants.filter(p => p.status === 'pending')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Competition Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The competition you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/competitions">Back to Competitions</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">{competition.title}</h1>
            <Badge className={getTierBadgeColor(competition.tier)}>
              {competition.tier}
            </Badge>
            <Badge className={getStatusBadgeColor(competition.status)}>
              {getCompetitionPhase()}
            </Badge>
          </div>
          
          {competition.country && (
            <p className="text-lg text-muted-foreground mb-2">📍 {competition.country}</p>
          )}
          
          {competition.description && (
            <p className="text-lg leading-relaxed">{competition.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {canRegister() && (
            <Button size="lg" asChild>
              <Link href={`/competitions/${competition.id}/participate`}>
                Register Now
              </Link>
            </Button>
          )}
          {canVote() && (
            <Button variant="outline" size="lg" asChild>
              <Link href={`/competitions/${competition.id}/vote`}>
                Vote Now
              </Link>
            </Button>
          )}
          {userParticipation && (
            <Badge variant="secondary" className="text-center py-2">
              You are {userParticipation.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Competition Details */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${canManageCompetition() ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants ({approvedParticipants.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          {canManageCompetition() && (
            <TabsTrigger value="manage">Manage</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Registration Opens:</span>
                  <span>{formatDate(competition.registration_start)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Registration Closes:</span>
                  <span>{formatDate(competition.registration_end)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Voting Opens:</span>
                  <span>{formatDate(competition.voting_start)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Voting Closes:</span>
                  <span>{formatDate(competition.voting_end)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competition Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Participants:</span>
                  <span>{approvedParticipants.length}</span>
                </div>
                {competition.max_participants && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Max Participants:</span>
                    <span>{competition.max_participants}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Pending Applications:</span>
                  <span>{pendingParticipants.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Votes:</span>
                  <span>{approvedParticipants.reduce((sum, p) => sum + p.vote_count, 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          {approvedParticipants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No participants yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedParticipants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {participant.user.profile_picture_url ? (
                          <img
                            src={participant.user.profile_picture_url}
                            alt={participant.user.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          participant.user.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold">{participant.user.display_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(participant.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {participant.submission_title && (
                      <div>
                        <h5 className="font-medium mb-1">{participant.submission_title}</h5>
                        {participant.submission_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {participant.submission_description}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          {approvedParticipants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No participants to show in leaderboard.</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Current Rankings</CardTitle>
                <CardDescription>
                  Live leaderboard showing current vote counts and rankings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvedParticipants
                    .sort((a, b) => b.vote_count - a.vote_count)
                    .map((participant, index) => (
                      <div key={participant.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-muted-foreground">
                            #{index + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              {participant.user.profile_picture_url ? (
                                <img
                                  src={participant.user.profile_picture_url}
                                  alt={participant.user.display_name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                participant.user.display_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold">{participant.user.display_name}</h4>
                              {participant.submission_title && (
                                <p className="text-sm text-muted-foreground">
                                  {participant.submission_title}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{participant.vote_count}</div>
                          <div className="text-sm text-muted-foreground">votes</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competition Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Qualification Rules</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Participants must have a verified HubSpot account</li>
                  <li>• Registration is required during the registration period</li>
                  {competition.qualification_rules?.requiresApproval && (
                    <li>• All submissions require organizer approval</li>
                  )}
                  {competition.qualification_rules?.topN && (
                    <li>• Top {competition.qualification_rules.topN} participants will advance to the next tier</li>
                  )}
                  {competition.qualification_rules?.minVotes && (
                    <li>• Minimum {competition.qualification_rules.minVotes} votes required for advancement</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Voting Rules</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Only verified HubSpot users can vote</li>
                  <li>• One vote per participant per voter</li>
                  <li>• Voting is only allowed during the voting period</li>
                  <li>• Vote manipulation or fraud will result in disqualification</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">General Rules</h4>
                <ul className="space-y-2 text-sm">
                  <li>• All submissions must be original work</li>
                  <li>• Participants must comply with HubSpot&apos;s terms of service</li>
                  <li>• Organizers reserve the right to disqualify participants for rule violations</li>
                  <li>• Decisions by organizers are final</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageCompetition() && (
          <TabsContent value="manage" className="space-y-6">
            <CompetitionStatusManager
              competition={competition}
              onStatusUpdate={handleStatusUpdate}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Competition Management</CardTitle>
                <CardDescription>
                  Additional management options for this competition
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/competitions/${competition.id}/edit`}>
                      Edit Competition
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/competitions/${competition.id}/participants`}>
                      Manage Participants
                    </Link>
                  </Button>
                  {competition.status === 'draft' && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
                          competitionService.delete(competition.id)
                            .then(() => {
                              window.location.href = '/competitions'
                            })
                            .catch(error => {
                              alert(error.message)
                            })
                        }
                      }}
                    >
                      Delete Competition
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}