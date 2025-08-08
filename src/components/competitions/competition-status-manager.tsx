'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { competitionService } from '@/lib/database'
import { useAuth } from '@/components/auth/auth-provider'
import type { CompetitionStatus } from '@/types'

interface Competition {
  id: string
  title: string
  status: CompetitionStatus
  created_by: string
  registration_start: string | null
  registration_end: string | null
  voting_start: string | null
  voting_end: string | null
}

interface CompetitionStatusManagerProps {
  competition: Competition
  onStatusUpdate?: (newStatus: CompetitionStatus) => void
}

const statusOptions = [
  { value: 'draft', label: 'Draft', description: 'Competition is being prepared' },
  { value: 'registration_open', label: 'Registration Open', description: 'Participants can register' },
  { value: 'registration_closed', label: 'Registration Closed', description: 'Registration period ended' },
  { value: 'voting_open', label: 'Voting Open', description: 'Voting is active' },
  { value: 'voting_closed', label: 'Voting Closed', description: 'Voting period ended' },
  { value: 'completed', label: 'Completed', description: 'Competition finished' },
]

export function CompetitionStatusManager({ competition, onStatusUpdate }: CompetitionStatusManagerProps) {
  const { user } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<CompetitionStatus>(competition.status)
  const [isUpdating, setIsUpdating] = useState(false)

  const canManageStatus = user && (
    user.id === competition.created_by || 
    user.role === 'super_admin'
  )

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

  const getRecommendedStatus = (): CompetitionStatus | null => {
    const now = new Date()
    const regStart = competition.registration_start ? new Date(competition.registration_start) : null
    const regEnd = competition.registration_end ? new Date(competition.registration_end) : null
    const voteStart = competition.voting_start ? new Date(competition.voting_start) : null
    const voteEnd = competition.voting_end ? new Date(competition.voting_end) : null

    if (competition.status === 'draft' && regStart && now >= regStart) {
      return 'registration_open'
    }
    if (competition.status === 'registration_open' && regEnd && now > regEnd) {
      return 'registration_closed'
    }
    if (competition.status === 'registration_closed' && voteStart && now >= voteStart) {
      return 'voting_open'
    }
    if (competition.status === 'voting_open' && voteEnd && now > voteEnd) {
      return 'voting_closed'
    }
    if (competition.status === 'voting_closed') {
      return 'completed'
    }

    return null
  }

  const recommendedStatus = getRecommendedStatus()

  const handleStatusUpdate = async () => {
    if (!canManageStatus || selectedStatus === competition.status) return

    try {
      setIsUpdating(true)
      await competitionService.update(competition.id, { status: selectedStatus })
      onStatusUpdate?.(selectedStatus)
    } catch (error) {
      console.error('Error updating competition status:', error)
      alert(error instanceof Error ? error.message : 'Failed to update status')
      setSelectedStatus(competition.status) // Reset on error
    } finally {
      setIsUpdating(false)
    }
  }

  const handleQuickUpdate = async (status: CompetitionStatus) => {
    if (!canManageStatus) return

    try {
      setIsUpdating(true)
      await competitionService.update(competition.id, { status })
      setSelectedStatus(status)
      onStatusUpdate?.(status)
    } catch (error) {
      console.error('Error updating competition status:', error)
      alert(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  if (!canManageStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Competition Status
            <Badge className={getStatusBadgeColor(competition.status)}>
              {statusOptions.find(s => s.value === competition.status)?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {statusOptions.find(s => s.value === competition.status)?.description}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Competition Status Management
          <Badge className={getStatusBadgeColor(competition.status)}>
            {statusOptions.find(s => s.value === competition.status)?.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage the current status of this competition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendedStatus && recommendedStatus !== competition.status && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Recommended Status Update</h4>
                <p className="text-sm text-blue-700">
                  Based on the timeline, consider updating to: {statusOptions.find(s => s.value === recommendedStatus)?.label}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleQuickUpdate(recommendedStatus)}
                disabled={isUpdating}
              >
                Update to {statusOptions.find(s => s.value === recommendedStatus)?.label}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Change Status</label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as CompetitionStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdating || selectedStatus === competition.status}
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedStatus(competition.status)}
              disabled={selectedStatus === competition.status}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> Status changes affect participant registration and voting availability.</p>
          <p>Make sure to communicate status changes to participants.</p>
        </div>
      </CardContent>
    </Card>
  )
}