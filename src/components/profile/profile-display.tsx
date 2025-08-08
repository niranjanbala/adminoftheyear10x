'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuthenticatedUser } from '@/lib/auth-middleware'

interface ProfileDisplayProps {
  user: AuthenticatedUser & {
    bio?: string
    skills?: string[]
    hubspot_experience?: string
    portfolio_links?: string[]
    profile_picture_url?: string
    banner_image_url?: string
    intro_video_url?: string
  }
  isOwnProfile?: boolean
  onEdit?: () => void
}

export function ProfileDisplay({ user, isOwnProfile = false, onEdit }: ProfileDisplayProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'organizer':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'voter':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getVerificationBadgeColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner and Profile Picture */}
      <div className="relative">
        {/* Banner Image */}
        <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden">
          {user.banner_image_url ? (
            <img
              src={user.banner_image_url}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold">{user.display_name}</h2>
                <p className="text-lg opacity-90">HubSpot Admin</p>
              </div>
            </div>
          )}
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden">
            {user.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt={user.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Edit Button */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4">
            <Button onClick={onEdit} variant="secondary">
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="pt-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{user.display_name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          
          <div className="flex gap-2">
            <Badge className={getRoleBadgeColor(user.role)}>
              {user.role.replace('_', ' ')}
            </Badge>
            <Badge className={getVerificationBadgeColor(user.verification_status)}>
              {user.verification_status}
            </Badge>
          </div>
        </div>

        {user.bio && (
          <div className="mt-6">
            <p className="text-lg leading-relaxed">{user.bio}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* HubSpot Experience */}
        {user.hubspot_experience && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 3.433-2.043 4.568-1.258 1.249-2.97 1.93-4.814 1.93-1.843 0-3.556-.681-4.814-1.93-1.147-1.135-1.874-2.71-2.043-4.568-.027-.312.207-.576.52-.576h.896c.261 0 .48.183.53.437.123 1.25.634 2.394 1.434 3.188.8.794 1.87 1.232 3.014 1.232s2.214-.438 3.014-1.232c.8-.794 1.311-1.938 1.434-3.188.05-.254.269-.437.53-.437h.896c.313 0 .547.264.52.576z"/>
                </svg>
                HubSpot Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{user.hubspot_experience}</p>
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Portfolio Links */}
      {user.portfolio_links && user.portfolio_links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>Check out my work and projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.portfolio_links.map((link, index) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted transition-colors"
                >
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-blue-600 hover:underline truncate">{link}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Introduction Video */}
      {user.intro_video_url && (
        <Card>
          <CardHeader>
            <CardTitle>Introduction Video</CardTitle>
            <CardDescription>Get to know me better</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-lg overflow-hidden">
              <video
                src={user.intro_video_url}
                controls
                className="w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}