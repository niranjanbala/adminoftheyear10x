'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { participationService } from '@/lib/database'

interface Participant {
  id: string
  user_id: string
  status: string
  submission_title: string | null
  submission_description: string | null
  submission_media: any[]
  vote_count: number
  ranking: number | null
  applied_at: string
  user: {
    id: string
    display_name: string
    profile_picture_url: string | null
    bio: string | null
  }
}

interface VotingStatus {
  voted_participants: string[]
  total_votes_cast: number
  can_vote: boolean
}

interface VotingInterfaceProps {
  competitionId: string
  competitionTitle: string
  isVotingOpen: boolean
}

export function VotingInterface({ competitionId, competitionTitle, isVotingOpen }: VotingInterfaceProps) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [votingStatus, setVotingStatus] = useState<VotingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [votingParticipant, setVotingParticipant] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && isVotingOpen) {
      fetchData()
    }
  }, [competitionId, user, isVotingOpen])

  const fetchData = async () => {
    try {
      const [participantsData, votingStatusData] = await Promise.all([
        participationService.getByCompetition(competitionId),
        fetch(`/api/competitions/${competitionId}/vote`).then(res => res.json())
      ])

      // Only show approved participants
      const approvedParticipants = participantsData.filter(p => p.status === 'approved')
      setParticipants(approvedParticipants)
      setVotingStatus(votingStatusData)
    } catch (error) {
      console.error('Error fetching voting data:', error)
      setError('Failed to load voting data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async (participantId: string) => {
    if (!user || votingParticipant) return

    setVotingParticipant(participantId)
    setError(null)

    try {
      const response = await fetch(`/api/competitions/${competitionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cast vote')
      }

      // Update local state
      setParticipants(prev => 
        prev.map(p => 
          p.id === participantId 
            ? { ...p, vote_count: p.vote_count + 1 }
            : p
        )
      )

      setVotingStatus(prev => prev ? {
        ...prev,
        voted_participants: [...prev.voted_participants, participantId],
        total_votes_cast: prev.total_votes_cast + 1
      } : null)

    } catch (error) {
      console.error('Error casting vote:', error)
      setError(error instanceof Error ? error.message : 'Failed to cast vote')
    } finally {
      setVotingParticipant(null)
    }
  }

  const hasVotedFor = (participantId: string) => {
    return votingStatus?.voted_participants.includes(participantId) || false
  }

  const isOwnSubmission = (participantUserId: string) => {
    return user?.id === participantUserId
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to vote in competitions.</p>
        </CardContent>
      </Card>
    )
  }

  if (!isVotingOpen) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Voting Not Open</h3>
          <p className="text-muted-foreground">
            Voting is not currently open for this competition. Check back during the voting period.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No approved participants to vote for yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Vote for Your Favorites</h2>
        <p className="text-muted-foreground mb-4">
          Cast your votes for the best submissions in &quot;{competitionTitle}&quot;
        </p>
        {votingStatus && (
          <div className="flex justify-center gap-4 text-sm">
            <Badge variant="secondary">
              Votes Cast: {votingStatus.total_votes_cast}
            </Badge>
            <Badge variant="secondary">
              Participants: {participants.length}
            </Badge>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md text-center">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {participants.map((participant) => (
          <Card key={participant.id} className="relative">
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
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
                <div className="flex-1">
                  <CardTitle className="text-lg">{participant.user.display_name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">{participant.vote_count} votes</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {participant.submission_title && (
                <div>
                  <h4 className="font-semibold mb-2">{participant.submission_title}</h4>
                  {participant.submission_description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {participant.submission_description}
                    </p>
                  )}
                </div>
              )}

              {participant.submission_media && participant.submission_media.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {participant.submission_media.slice(0, 4).map((media, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {media.type === 'image' ? (
                        <img
                          src={media.url}
                          alt={media.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                          controls
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {participant.user.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {participant.user.bio}
                </p>
              )}

              <div className="pt-2">
                {isOwnSubmission(participant.user_id) ? (
                  <Button disabled className="w-full" variant="outline">
                    Your Submission
                  </Button>
                ) : hasVotedFor(participant.id) ? (
                  <Button disabled className="w-full" variant="outline">
                    <Check className="h-4 w-4 mr-2" />
                    Voted
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleVote(participant.id)}
                    disabled={votingParticipant === participant.id}
                    className="w-full"
                  >
                    {votingParticipant === participant.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Voting...
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-2" />
                        Vote
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>You can vote for multiple participants. Each vote helps determine the winners!</p>
        <p className="mt-1">Voting is limited to verified HubSpot users only.</p>
      </div>
    </div>
  )
}