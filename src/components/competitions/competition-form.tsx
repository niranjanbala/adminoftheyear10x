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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/auth/auth-provider'
import { competitionService } from '@/lib/database'
import type { CompetitionTier, CompetitionStatus } from '@/types'

const competitionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  tier: z.enum(['local', 'national', 'global']),
  country: z.string().min(2, 'Country is required').optional(),
  registration_start: z.string().min(1, 'Registration start date is required'),
  registration_end: z.string().min(1, 'Registration end date is required'),
  voting_start: z.string().min(1, 'Voting start date is required'),
  voting_end: z.string().min(1, 'Voting end date is required'),
  max_participants: z.number().min(1, 'Must allow at least 1 participant').max(1000, 'Maximum 1000 participants').optional(),
  qualification_rules: z.object({
    requiresApproval: z.boolean(),
    topN: z.number().min(1).max(100).optional(),
    minVotes: z.number().min(0).optional(),
  }),
})

type CompetitionFormData = z.infer<typeof competitionSchema>

interface CompetitionFormProps {
  onSuccess?: (competition: any) => void
  onCancel?: () => void
  initialData?: Partial<CompetitionFormData>
  isEditing?: boolean
}

export function CompetitionForm({ onSuccess, onCancel, initialData, isEditing = false }: CompetitionFormProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<CompetitionFormData>({
    resolver: zodResolver(competitionSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      tier: initialData?.tier || 'local',
      country: initialData?.country || '',
      registration_start: initialData?.registration_start || '',
      registration_end: initialData?.registration_end || '',
      voting_start: initialData?.voting_start || '',
      voting_end: initialData?.voting_end || '',
      max_participants: initialData?.max_participants || undefined,
      qualification_rules: {
        requiresApproval: initialData?.qualification_rules?.requiresApproval || true,
        topN: initialData?.qualification_rules?.topN || 3,
        minVotes: initialData?.qualification_rules?.minVotes || 0,
      },
    }
  })

  const selectedTier = watch('tier')

  const onSubmit = async (data: CompetitionFormData) => {
    if (!user) return

    try {
      setIsLoading(true)

      // Validate dates
      const regStart = new Date(data.registration_start)
      const regEnd = new Date(data.registration_end)
      const voteStart = new Date(data.voting_start)
      const voteEnd = new Date(data.voting_end)

      if (regStart >= regEnd) {
        throw new Error('Registration end must be after registration start')
      }
      if (regEnd > voteStart) {
        throw new Error('Voting start must be after registration end')
      }
      if (voteStart >= voteEnd) {
        throw new Error('Voting end must be after voting start')
      }

      const competitionData = {
        title: data.title,
        description: data.description || null,
        tier: data.tier as CompetitionTier,
        country: data.tier === 'local' ? data.country : null,
        status: 'draft' as CompetitionStatus,
        registration_start: data.registration_start,
        registration_end: data.registration_end,
        voting_start: data.voting_start,
        voting_end: data.voting_end,
        max_participants: data.max_participants || null,
        qualification_rules: data.qualification_rules,
        created_by: user.id,
      }

      const competition = await competitionService.create(competitionData)
      onSuccess?.(competition)
    } catch (error) {
      console.error('Error creating competition:', error)
      alert(error instanceof Error ? error.message : 'Failed to create competition')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Competition' : 'Create New Competition'}</CardTitle>
          <CardDescription>
            Set up a new HubSpot Admin competition with all the necessary details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Competition Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g., HubSpot Admin Challenge 2024"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier">Competition Tier *</Label>
                <Select onValueChange={(value) => setValue('tier', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tier && (
                  <p className="text-sm text-destructive">{errors.tier.message}</p>
                )}
              </div>
            </div>

            {selectedTier === 'local' && (
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="e.g., United States, Canada, United Kingdom"
                />
                {errors.country && (
                  <p className="text-sm text-destructive">{errors.country.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the competition, its goals, and what participants should expect..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_participants">Maximum Participants</Label>
              <Input
                id="max_participants"
                type="number"
                {...register('max_participants', { valueAsNumber: true })}
                placeholder="Leave empty for unlimited"
              />
              {errors.max_participants && (
                <p className="text-sm text-destructive">{errors.max_participants.message}</p>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Competition Timeline</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="registration_start">Registration Start *</Label>
                  <Input
                    id="registration_start"
                    type="datetime-local"
                    {...register('registration_start')}
                  />
                  {errors.registration_start && (
                    <p className="text-sm text-destructive">{errors.registration_start.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration_end">Registration End *</Label>
                  <Input
                    id="registration_end"
                    type="datetime-local"
                    {...register('registration_end')}
                  />
                  {errors.registration_end && (
                    <p className="text-sm text-destructive">{errors.registration_end.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voting_start">Voting Start *</Label>
                  <Input
                    id="voting_start"
                    type="datetime-local"
                    {...register('voting_start')}
                  />
                  {errors.voting_start && (
                    <p className="text-sm text-destructive">{errors.voting_start.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voting_end">Voting End *</Label>
                  <Input
                    id="voting_end"
                    type="datetime-local"
                    {...register('voting_end')}
                  />
                  {errors.voting_end && (
                    <p className="text-sm text-destructive">{errors.voting_end.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Qualification Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Qualification Rules</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="topN">Winners to Advance</Label>
                  <Input
                    id="topN"
                    type="number"
                    {...register('qualification_rules.topN', { valueAsNumber: true })}
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of top participants to advance to next tier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minVotes">Minimum Votes Required</Label>
                  <Input
                    id="minVotes"
                    type="number"
                    {...register('qualification_rules.minVotes', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum votes needed to be eligible for advancement
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : isEditing ? 'Update Competition' : 'Create Competition'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
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