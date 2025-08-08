'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/components/auth/auth-provider'
import { MediaUpload } from '@/components/profile/media-upload'
import type { MediaFile } from '@/types'

interface ParticipationFormProps {
  competitionId: string
  competitionTitle: string
  onSuccess?: () => void
}

export function ParticipationForm({ competitionId, competitionTitle, onSuccess }: ParticipationFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    submission_title: '',
    submission_description: '',
    submission_media: [] as MediaFile[],
    portfolio_links: ['']
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePortfolioLinkChange = (index: number, value: string) => {
    const newLinks = [...formData.portfolio_links]
    newLinks[index] = value
    setFormData(prev => ({
      ...prev,
      portfolio_links: newLinks
    }))
  }

  const addPortfolioLink = () => {
    setFormData(prev => ({
      ...prev,
      portfolio_links: [...prev.portfolio_links, '']
    }))
  }

  const removePortfolioLink = (index: number) => {
    const newLinks = formData.portfolio_links.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      portfolio_links: newLinks.length > 0 ? newLinks : ['']
    }))
  }

  const handleMediaUpload = (files: MediaFile[]) => {
    setFormData(prev => ({
      ...prev,
      submission_media: files
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Filter out empty portfolio links
      const portfolioLinks = formData.portfolio_links.filter(link => link.trim() !== '')
      
      const response = await fetch(`/api/competitions/${competitionId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission_title: formData.submission_title,
          submission_description: formData.submission_description,
          submission_media: formData.submission_media,
          portfolio_links: portfolioLinks
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit application')
      }

      // Success
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/competitions/${competitionId}?tab=participants`)
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to participate in competitions.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply to Participate</CardTitle>
        <CardDescription>
          Submit your application to participate in &quot;{competitionTitle}&quot;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="submission_title">Submission Title *</Label>
            <Input
              id="submission_title"
              value={formData.submission_title}
              onChange={(e) => handleInputChange('submission_title', e.target.value)}
              placeholder="Enter a title for your submission"
              required
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground">
              {formData.submission_title.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="submission_description">Submission Description *</Label>
            <Textarea
              id="submission_description"
              value={formData.submission_description}
              onChange={(e) => handleInputChange('submission_description', e.target.value)}
              placeholder="Describe your submission, your approach, and what makes it unique..."
              required
              maxLength={1000}
              rows={6}
            />
            <p className="text-sm text-muted-foreground">
              {formData.submission_description.length}/1000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Submission Media</Label>
            <MediaUpload
              onUpload={handleMediaUpload}
              maxFiles={5}
              acceptedTypes={['image/*', 'video/*']}
              maxFileSize={50 * 1024 * 1024} // 50MB
            />
            <p className="text-sm text-muted-foreground">
              Upload images or videos showcasing your work (optional, max 5 files, 50MB each)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Portfolio Links</Label>
            <div className="space-y-2">
              {formData.portfolio_links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(e) => handlePortfolioLinkChange(index, e.target.value)}
                    placeholder="https://example.com/your-work"
                    type="url"
                  />
                  {formData.portfolio_links.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePortfolioLink(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              {formData.portfolio_links.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPortfolioLink}
                >
                  Add Another Link
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Add links to your portfolio, previous work, or relevant projects (optional)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Before You Submit</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Make sure your submission title and description clearly explain your work</li>
              <li>• Upload high-quality media files that showcase your best work</li>
              <li>• Include relevant portfolio links that demonstrate your HubSpot expertise</li>
              <li>• Your application will be reviewed by the competition organizers</li>
              <li>• You&apos;ll receive a notification once your application is processed</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.submission_title || !formData.submission_description}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}