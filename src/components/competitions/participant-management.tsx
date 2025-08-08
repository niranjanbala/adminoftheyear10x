'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/auth/auth-provider'
import { ParticipantProfile } from './participant-profile'
import type { ParticipationStatus } from '@/types'

interface Participant {
  id: string
  user_id: string
  status: ParticipationStatus
  submission_title: string | null
  submission_description: string | null
  submission_media: any[]
  vote_count: number
  ranking: number | null
  applied_at: string
  approved_at: string | null
  user: {
    id: string
    display_name: string
    email: string
    profile_picture_url: string | null
    bio: string | null
    skills: string[]
    hubspot_experience: string | null
    portfolio_links: string[]
  }
}

interface ParticipantManagementProps {
  competitionId: string
  competitionTitle: string
  canManage: boolean
}

export function ParticipantManagement({ competitionId, competitionTitle, canManage }: ParticipantManagementProps) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchParticipants()
  }, [competitionId])

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/participants`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data)
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (participantId: string, newStatus: ParticipationStatus) => {
    if (!canManage) return

    setActionLoading(participantId)
    try {
      const response = await fetch(`/api/competitions/${competitionId}/participants/${participantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedParticipant = await response.json()
        setParticipants(prev => 
          prev.map(p => p.id === participantId ? { ...p, ...updatedParticipant } : p)
        )
        
        // Update selected participant if it's the one being updated
        if (selectedParticipant?.id === participantId) {
          setSelectedParticipant(prev => prev ? { ...prev, ...updatedParticipant } : null)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update participant status')
      }
    } catch (error) {
      console.error('Error updating participant:', error)
      alert('Failed to update participant status')
    } finally {
      setActionLoading(null)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pendingParticipants = participants.filter(p => p.status === 'pending')
  const approvedParticipants = participants.filter(p => p.status === 'approved')
  const rejectedParticipants = participants.filter(p => p.status === 'rejected')
  const withdrawnParticipants = participants.filter(p => p.status === 'withdrawn')

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
          <h2 className="text-2xl font-bold">Participant Management</h2>
          <p className="text-muted-foreground">
            Manage participants for &quot;{competitionTitle}&quot;
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">
            Total: {participants.length}
          </Badge>
          {pendingParticipants.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Pending: {pendingParticipants.length}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            Pending ({pendingParticipants.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedParticipants.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedParticipants.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawn">
            Withdrawn ({withdrawnParticipants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingParticipants.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No pending applications.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingParticipants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                          <div>
                            <h4 className="font-semibold text-lg">{participant.user.display_name}</h4>
                            <p className="text-sm text-muted-foreground">{participant.user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Applied {formatDate(participant.applied_at)}
                            </p>
                          </div>
                          <Badge className={getStatusBadgeColor(participant.status)}>
                            {participant.status}
                          </Badge>
                        </div>

                        {participant.submission_title && (
                          <div className="mb-4">
                            <h5 className="font-medium mb-1">{participant.submission_title}</h5>
                            {participant.submission_description && (
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {participant.submission_description}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedParticipant(participant)}
                          >
                            View Details
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(participant.id, 'approved')}
                                disabled={actionLoading === participant.id}
                              >
                                {actionLoading === participant.id ? 'Processing...' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusUpdate(participant.id, 'rejected')}
                                disabled={actionLoading === participant.id}
                              >
                                {actionLoading === participant.id ? 'Processing...' : 'Reject'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedParticipants.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No approved participants yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvedParticipants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                          <div>
                            <h4 className="font-semibold text-lg">{participant.user.display_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Approved {participant.approved_at ? formatDate(participant.approved_at) : 'Recently'}
                            </p>
                            <p className="text-sm font-medium">
                              Votes: {participant.vote_count}
                              {participant.ranking && ` • Rank: #${participant.ranking}`}
                            </p>
                          </div>
                          <Badge className={getStatusBadgeColor(participant.status)}>
                            {participant.status}
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedParticipant(participant)}
                          >
                            View Details
                          </Button>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusUpdate(participant.id, 'rejected')}
                              disabled={actionLoading === participant.id}
                            >
                              {actionLoading === participant.id ? 'Processing...' : 'Remove'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedParticipants.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No rejected participants.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rejectedParticipants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                          <div>
                            <h4 className="font-semibold text-lg">{participant.user.display_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Applied {formatDate(participant.applied_at)}
                            </p>
                          </div>
                          <Badge className={getStatusBadgeColor(participant.status)}>
                            {participant.status}
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedParticipant(participant)}
                          >
                            View Details
                          </Button>
                          {canManage && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(participant.id, 'approved')}
                              disabled={actionLoading === participant.id}
                            >
                              {actionLoading === participant.id ? 'Processing...' : 'Approve'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdrawn" className="space-y-4">
          {withdrawnParticipants.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No withdrawn participants.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {withdrawnParticipants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                          <div>
                            <h4 className="font-semibold text-lg">{participant.user.display_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Withdrew their application
                            </p>
                          </div>
                          <Badge className={getStatusBadgeColor(participant.status)}>
                            {participant.status}
                          </Badge>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedParticipant(participant)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Participant Profile Modal */}
      {selectedParticipant && (
        <ParticipantProfile
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          onStatusUpdate={canManage ? handleStatusUpdate : undefined}
          isUpdating={actionLoading === selectedParticipant.id}
        />
      )}
    </div>
  )
}