'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRight, Trophy, Users, Target, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

interface Participant {
  id: string
  user_id: string
  user: {
    display_name: string
    profile_picture_url: string | null
  }
  submission_title: string | null
  vote_count: number
  ranking: number | null
}

interface TierProgressionProps {
  competitionId: string
  competitionTitle: string
  currentTier: 'local' | 'national' | 'global'
  status: string
  participants: Participant[]
  canManage: boolean
  advancementInfo?: {
    next_tier_competition_id: string
    advanced_participants: number
    advancement_date: string
  }
}

export function TierProgression({
  competitionId,
  competitionTitle,
  currentTier,
  status,
  participants,
  canManage,
  advancementInfo
}: TierProgressionProps) {
  const { user } = useAuth()
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [advancementCriteria, setAdvancementCriteria] = useState({
    top_n: currentTier === 'local' ? 10 : 5,
    min_votes: 0,
    requiresApproval: true
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const nextTier = currentTier === 'local' ? 'national' : 'global'
  const canAdvance = status === 'completed' && currentTier !== 'global' && canManage && !advancementInfo

  // Calculate potential winners based on current criteria
  const sortedParticipants = participants
    .filter(p => p.vote_count > 0)
    .sort((a, b) => b.vote_count - a.vote_count)

  const potentialWinners = sortedParticipants.slice(0, advancementCriteria.top_n)
  const qualifiedByVotes = sortedParticipants.filter(p => p.vote_count >= advancementCriteria.min_votes)

  const handleAdvancement = async () => {
    if (!canAdvance) return

    setIsAdvancing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/competitions/${competitionId}/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          next_tier: nextTier,
          qualification_criteria: advancementCriteria
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to advance competition')
      }

      const result = await response.json()
      setSuccess(result.message)
      
      // Refresh page to show updated state
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Error advancing competition:', error)
      setError(error instanceof Error ? error.message : 'Failed to advance competition')
    } finally {
      setIsAdvancing(false)
    }
  }

  const getTierBadgeColor = (tier: string) => {
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

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'local':
        return <Users className="h-4 w-4" />
      case 'national':
        return <Target className="h-4 w-4" />
      case 'global':
        return <Trophy className="h-4 w-4" />
      default:
        return null
    }
  }

  if (advancementInfo) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900">Competition Advanced</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            This competition has been successfully advanced to the next tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">Advanced Participants:</span>
              <Badge className="bg-green-200 text-green-800">
                {advancementInfo.advanced_participants} winners
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">Advancement Date:</span>
              <span className="text-sm text-green-700">
                {new Date(advancementInfo.advancement_date).toLocaleDateString()}
              </span>
            </div>
            <Button asChild className="w-full">
              <a href={`/competitions/${advancementInfo.next_tier_competition_id}`}>
                View Next Tier Competition
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Tier Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={getTierBadgeColor(currentTier)}>
                {getTierIcon(currentTier)}
                <span className="ml-1">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier</span>
              </Badge>
              <CardTitle>Competition Tier Status</CardTitle>
            </div>
            {currentTier !== 'global' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">Next:</span>
                <Badge className={getTierBadgeColor(nextTier)} variant="outline">
                  {getTierIcon(nextTier)}
                  <span className="ml-1">{nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</span>
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{participants.length}</div>
              <div className="text-sm text-muted-foreground">Total Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {participants.reduce((sum, p) => sum + p.vote_count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {participants.filter(p => p.vote_count > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Participants</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advancement Controls */}
      {canAdvance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Advance to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} Tier
            </CardTitle>
            <CardDescription>
              Select winners from this competition to advance to the next tier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 border border-green-200 bg-green-50 text-green-700 rounded-md">
                {success}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Advancement Criteria</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="top_n">Top N Participants</Label>
                  <Input
                    id="top_n"
                    type="number"
                    min="1"
                    max="50"
                    value={advancementCriteria.top_n}
                    onChange={(e) => setAdvancementCriteria(prev => ({
                      ...prev,
                      top_n: parseInt(e.target.value) || 1
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Advance the top {advancementCriteria.top_n} participants by vote count
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_votes">Minimum Votes (Optional)</Label>
                  <Input
                    id="min_votes"
                    type="number"
                    min="0"
                    value={advancementCriteria.min_votes}
                    onChange={(e) => setAdvancementCriteria(prev => ({
                      ...prev,
                      min_votes: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only advance participants with at least this many votes
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_approval"
                    checked={advancementCriteria.requiresApproval}
                    onCheckedChange={(checked) => setAdvancementCriteria(prev => ({
                      ...prev,
                      requiresApproval: !!checked
                    }))}
                  />
                  <Label htmlFor="requires_approval" className="text-sm">
                    Require organizer approval in next tier
                  </Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Preview: Participants to Advance</h4>
                
                {potentialWinners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No participants meet the current criteria
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {potentialWinners.map((participant, index) => (
                      <div key={participant.id} className="flex items-center gap-3 p-2 border rounded-lg">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
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
                          <div className="font-medium text-sm">{participant.user.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {participant.vote_count} votes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{potentialWinners.length}</strong> participants will be advanced to the{' '}
                    <strong>{nextTier}</strong> tier competition.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAdvancement}
                disabled={isAdvancing || potentialWinners.length === 0}
                className="flex-1"
              >
                {isAdvancing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Advancing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Advance {potentialWinners.length} Winners to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} Tier
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Progression Info */}
      {currentTier !== 'global' && (
        <Card>
          <CardHeader>
            <CardTitle>Tier Progression System</CardTitle>
            <CardDescription>
              How competitions advance through different tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={getTierBadgeColor('local')}>
                  {getTierIcon('local')}
                  <span className="ml-1">Local</span>
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge className={getTierBadgeColor('national')}>
                  {getTierIcon('national')}
                  <span className="ml-1">National</span>
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge className={getTierBadgeColor('global')}>
                  {getTierIcon('global')}
                  <span className="ml-1">Global</span>
                </Badge>
              </div>

              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-medium mb-2">Local Competitions</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• City or region-based</li>
                    <li>• Open registration</li>
                    <li>• Top performers advance</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">National Competitions</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Country-wide competition</li>
                    <li>• Local winners only</li>
                    <li>• Higher stakes voting</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Global Competition</h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Worldwide finale</li>
                    <li>• National champions only</li>
                    <li>• Ultimate recognition</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}