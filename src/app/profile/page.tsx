'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProfileDisplay } from '@/components/profile/profile-display'
import { ProfileForm } from '@/components/profile/profile-form'
import { userService } from '@/lib/database'
import { Button } from '@/components/ui/button'

interface ExtendedUser {
  id: string
  email: string
  hubspot_id: string
  display_name: string
  role: 'participant' | 'voter' | 'organizer' | 'super_admin'
  verification_status: 'pending' | 'verified' | 'rejected'
  bio?: string
  skills?: string[]
  hubspot_experience?: string
  portfolio_links?: string[]
  profile_picture_url?: string
  banner_image_url?: string
  intro_video_url?: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<ExtendedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/users/profile')
        if (response.ok) {
          const fullProfile = await response.json()
          setProfileData({
            id: fullProfile.id,
            email: fullProfile.email,
            hubspot_id: fullProfile.hubspot_id,
            display_name: fullProfile.display_name,
            role: fullProfile.role,
            verification_status: fullProfile.verification_status,
            bio: fullProfile.bio || undefined,
            skills: fullProfile.skills || [],
            hubspot_experience: fullProfile.hubspot_experience || undefined,
            portfolio_links: fullProfile.portfolio_links || [],
            profile_picture_url: fullProfile.profile_picture_url || undefined,
            banner_image_url: fullProfile.banner_image_url || undefined,
            intro_video_url: fullProfile.intro_video_url || undefined,
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [user])

  const handleEditSuccess = async () => {
    setIsEditing(false)
    // Refresh profile data
    try {
      const response = await fetch('/api/users/profile')
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfileData({
          id: updatedProfile.id,
          email: updatedProfile.email,
          hubspot_id: updatedProfile.hubspot_id,
          display_name: updatedProfile.display_name,
          role: updatedProfile.role,
          verification_status: updatedProfile.verification_status,
          bio: updatedProfile.bio || undefined,
          skills: updatedProfile.skills || [],
          hubspot_experience: updatedProfile.hubspot_experience || undefined,
          portfolio_links: updatedProfile.portfolio_links || [],
          profile_picture_url: updatedProfile.profile_picture_url || undefined,
          banner_image_url: updatedProfile.banner_image_url || undefined,
          intro_video_url: updatedProfile.intro_video_url || undefined,
        })
      }
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                {isEditing ? 'Edit Profile' : 'My Profile'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing 
                  ? 'Update your profile information and media'
                  : 'Manage your profile and showcase your HubSpot expertise'
                }
              </p>
            </div>
            
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-6">
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
              {user && (
                <ProfileForm 
                  user={user} 
                  onSuccess={handleEditSuccess}
                />
              )}
            </div>
          ) : (
            profileData && (
              <ProfileDisplay
                user={profileData}
                isOwnProfile={true}
                onEdit={() => setIsEditing(true)}
              />
            )
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}