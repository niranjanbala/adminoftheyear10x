'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth/auth-provider'
import { userService } from '@/lib/database'
import { MediaUpload } from './media-upload'
import type { AuthenticatedUser } from '@/lib/auth-middleware'

const profileSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters').max(50, 'Display name must be less than 50 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  hubspot_experience: z.string().max(200, 'Experience must be less than 200 characters').optional(),
  skills: z.array(z.string()).max(10, 'Maximum 10 skills allowed'),
  portfolio_links: z.array(z.string().url('Must be a valid URL')).max(5, 'Maximum 5 portfolio links allowed'),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  user: AuthenticatedUser
  onSuccess?: () => void
}

export function ProfileForm({ user, onSuccess }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [introVideo, setIntroVideo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: user.display_name || '',
      bio: '',
      hubspot_experience: '',
      skills: [],
      portfolio_links: [],
    }
  })

  const skills = watch('skills') || []
  const portfolioLinks = watch('portfolio_links') || []

  const addSkill = () => {
    if (skillInput.trim() && skills.length < 10 && !skills.includes(skillInput.trim())) {
      setValue('skills', [...skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setValue('skills', skills.filter(skill => skill !== skillToRemove))
  }

  const addPortfolioLink = () => {
    if (linkInput.trim() && portfolioLinks.length < 5 && !portfolioLinks.includes(linkInput.trim())) {
      try {
        new URL(linkInput.trim()) // Validate URL
        setValue('portfolio_links', [...portfolioLinks, linkInput.trim()])
        setLinkInput('')
      } catch {
        // Invalid URL, don't add
      }
    }
  }

  const removePortfolioLink = (linkToRemove: string) => {
    setValue('portfolio_links', portfolioLinks.filter(link => link !== linkToRemove))
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)

      const updateData = {
        display_name: data.display_name,
        bio: data.bio || undefined,
        hubspot_experience: data.hubspot_experience || undefined,
        skills: data.skills,
        portfolio_links: data.portfolio_links,
        profile_picture_url: profilePicture || undefined,
        banner_image_url: bannerImage || undefined,
        intro_video_url: introVideo || undefined,
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }
      
      onSuccess?.()
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Media */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Media</CardTitle>
          <CardDescription>
            Upload your profile picture, banner image, and introduction video
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Label>Profile Picture</Label>
              <MediaUpload
                type="image"
                bucket="profile-pictures"
                path={`${user.id}/profile-picture`}
                onUpload={setProfilePicture}
                maxSize={5 * 1024 * 1024} // 5MB
                accept="image/*"
                className="aspect-square"
              />
            </div>
            
            <div>
              <Label>Banner Image</Label>
              <MediaUpload
                type="image"
                bucket="banner-images"
                path={`${user.id}/banner`}
                onUpload={setBannerImage}
                maxSize={10 * 1024 * 1024} // 10MB
                accept="image/*"
                className="aspect-[3/1]"
              />
            </div>
            
            <div>
              <Label>Introduction Video</Label>
              <MediaUpload
                type="video"
                bucket="intro-videos"
                path={`${user.id}/intro-video`}
                onUpload={setIntroVideo}
                maxSize={50 * 1024 * 1024} // 50MB
                accept="video/*"
                className="aspect-video"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Tell the community about yourself and your HubSpot expertise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                {...register('display_name')}
                placeholder="Your display name"
              />
              {errors.display_name && (
                <p className="text-sm text-destructive">{errors.display_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hubspot_experience">HubSpot Experience</Label>
              <Textarea
                id="hubspot_experience"
                {...register('hubspot_experience')}
                placeholder="Describe your experience with HubSpot..."
                rows={3}
              />
              {errors.hubspot_experience && (
                <p className="text-sm text-destructive">{errors.hubspot_experience.message}</p>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                    {skill} ×
                  </Badge>
                ))}
              </div>
              {errors.skills && (
                <p className="text-sm text-destructive">{errors.skills.message}</p>
              )}
            </div>

            {/* Portfolio Links */}
            <div className="space-y-2">
              <Label>Portfolio Links</Label>
              <div className="flex gap-2">
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://your-portfolio.com"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPortfolioLink())}
                />
                <Button type="button" onClick={addPortfolioLink} variant="outline">
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {portfolioLinks.map((link) => (
                  <div key={link} className="flex items-center justify-between p-2 bg-muted rounded">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                      {link}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePortfolioLink(link)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              {errors.portfolio_links && (
                <p className="text-sm text-destructive">{errors.portfolio_links.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Profile'}
              </Button>
              <Button type="button" variant="outline" onClick={() => reset()}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}