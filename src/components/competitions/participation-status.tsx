'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import type { ParticipationStatus } from '@/types'

interface UserParticipation {
  id: string
  competition_id: string
  user_id: string
  status: ParticipationStatus
  submission_title: string | null
  submission_description: string | null
  submission_media: any[]
  vote_count: number
  ranking: number | null
  applied_at: string
  approved_at: string | null
}

interface ParticipationStatusProps {
  competitionId: string
  competitionTitle: string
  onWithdraw?: () => void
}

export function ParticipationStatus({ 
  competitionId, 
  competitionTitle, 
  onWithdraw 
}: ParticipationStatusProps) {
  const { user } = useAuth()
  const [participation, setParticipation] = useState<UserParticipation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchParticipationStatus()
    }
  }, [competitionId, user])

  const fetchParticipationStatus = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/participants`)
      if (response.ok) {
        const participants = await response.json()
        const userParticipation = participants.find((p: any) => p.user_id === user?.id)
        setParticipation(userParticipation || null)
      }
    } catch (error) {
      console.error('Error fetching participation status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!participation || !user) return

    setIsWithdrawing(true)
    try {
      const response = await fetch(
        `/api/competitions/${competitionId}/participants/${participation.id}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        const updatedParticipation = await response.json()
        setParticipation(updatedParticipation)
        if (onWithdraw) {
          onWithdraw()
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to withdraw from competition')
      }
    } catch (error) {
      console.error('Error withdrawing from competition:', error)
      alert('Failed to withdraw from competition')
    } finally {
      setIsWithdrawing(false)
    }
  }

  const getStatusBadgeColor = (status: ParticipationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusMessage = (status: ParticipationStatus) => {
    switch (status) {
      case 'pending':
        return 'Your application is being reviewed by the competition organizers. You will receive a notification once it has been processed.'
      case 'approved':
        return 'Congratulations! Your application has been approved. You are now participating in this competition and can receive votes.'
      case 'rejected':
        return 'Unfortunately, your application was not approved for this competition. You may contact the organizers for more information.'
      case 'withdrawn':
        return 'You have withdrawn your application from this competition.'
      default:
        return 'Unknown status'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading participation status...</p>
        </CardContent>
      </Card>
    )
  }

  if (!participation) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Participation Status</CardTitle>
            <CardDescription>
              Competition: &quot;{competitionTitle}&quot;
            </CardDescription>
          </div>
          <Badge className={getStatusBadgeColor(participation.status)}>
            {participation.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            {getStatusMessage(participation.status)}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Application Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applied:</span>
                <span>{formatDate(participation.applied_at)}</span>
              </div>
              {participation.approved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved:</span>
                  <span>{formatDate(participation.approved_at)}</span>
                </div>
              )}
              {participation.submission_title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="text-right">{participation.submission_title}</span>
                </div>
              )}
            </div>
          </div>

          {participation.status === 'approved' && (
            <div>
              <h4 className="font-medium mb-2">Competition Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Votes:</span>
                  <span className="font-medium">{participation.vote_count}</span>
                </div>
                {participation.ranking && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Rank:</span>
                    <span className="font-medium">#{participation.ranking}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {participation.submission_description && (
          <div>
            <h4 className="font-medium mb-2">Your Submission</h4>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
              {participation.submission_description}
            </p>
          </div>
        )}

        {participation.submission_media && participation.submission_media.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Submission Media</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {participation.submission_media.map((media, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.filename}
                      className="w-full h-20 object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-20 object-cover"
                      controls
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(participation.status === 'pending' || participation.status === 'approved') && (
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw Application'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You can withdraw your application at any time. This action cannot be undone.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}