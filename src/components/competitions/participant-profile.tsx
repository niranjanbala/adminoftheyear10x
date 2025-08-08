'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
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

interface ParticipantProfileProps {
  participant: Participant
  onClose: () => void
  onStatusUpdate?: (participantId: string, status: ParticipationStatus) => void
  isUpdating?: boolean
}

export function ParticipantProfile({ 
  participant, 
  onClose, 
  onStatusUpdate, 
  isUpdating = false 
}: ParticipantProfileProps) {
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Participant Profile</h2>
            <Badge className={getStatusBadgeColor(participant.status)}>
              {participant.status}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl">
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
                  <h3 className="text-lg font-semibold">{participant.user.display_name}</h3>
                  <p className="text-muted-foreground">{participant.user.email}</p>
                  {participant.user.bio && (
                    <p className="mt-2 text-sm">{participant.user.bio}</p>
                  )}
                </div>
              </div>

              {participant.user.skills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {participant.user.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {participant.user.hubspot_experience && (
                <div>
                  <h4 className="font-medium mb-2">HubSpot Experience</h4>
                  <p className="text-sm text-muted-foreground">
                    {participant.user.hubspot_experience}
                  </p>
                </div>
              )}

              {participant.user.portfolio_links.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Portfolio Links</h4>
                  <div className="space-y-1">
                    {participant.user.portfolio_links.map((link, index) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 block"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle>Competition Submission</CardTitle>
              <CardDescription>
                Applied on {formatDate(participant.applied_at)}
                {participant.approved_at && (
                  <span> • Approved on {formatDate(participant.approved_at)}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {participant.submission_title && (
                <div>
                  <h4 className="font-medium mb-2">Submission Title</h4>
                  <p className="text-lg">{participant.submission_title}</p>
                </div>
              )}

              {participant.submission_description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {participant.submission_description}
                  </p>
                </div>
              )}

              {participant.submission_media && participant.submission_media.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Submission Media</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {participant.submission_media.map((media, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        {media.type === 'image' ? (
                          <img
                            src={media.url}
                            alt={media.filename}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <video
                            src={media.url}
                            className="w-full h-32 object-cover"
                            controls
                          />
                        )}
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {media.filename}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {participant.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-medium text-green-900 mb-2">Competition Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Vote Count:</span>
                      <span className="font-medium ml-2">{participant.vote_count}</span>
                    </div>
                    {participant.ranking && (
                      <div>
                        <span className="text-green-700">Current Ranking:</span>
                        <span className="font-medium ml-2">#{participant.ranking}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {onStatusUpdate && (
            <div className="flex gap-3 pt-4 border-t">
              {participant.status === 'pending' && (
                <>
                  <Button
                    onClick={() => onStatusUpdate(participant.id, 'approved')}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating ? 'Processing...' : 'Approve Participant'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => onStatusUpdate(participant.id, 'rejected')}
                    disabled={isUpdating}
                    className="flex-1"
                  >
                    {isUpdating ? 'Processing...' : 'Reject Participant'}
                  </Button>
                </>
              )}
              
              {participant.status === 'approved' && (
                <Button
                  variant="destructive"
                  onClick={() => onStatusUpdate(participant.id, 'rejected')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Processing...' : 'Remove Participant'}
                </Button>
              )}
              
              {participant.status === 'rejected' && (
                <Button
                  onClick={() => onStatusUpdate(participant.id, 'approved')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Processing...' : 'Approve Participant'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}