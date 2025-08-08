'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { CompetitionList } from '@/components/competitions/competition-list'
import { CompetitionForm } from '@/components/competitions/competition-form'
import { useAuth } from '@/components/auth/auth-provider'
// Remove server-side import
import { Button } from '@/components/ui/button'

export default function CompetitionsPage() {
  const { user } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)

  const canCreateCompetition = Boolean(user && (user.role === 'organizer' || user.role === 'super_admin'))

  const handleCreateSuccess = (competition: any) => {
    setShowCreateForm(false)
    // Optionally redirect to the new competition
    window.location.href = `/competitions/${competition.id}`
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {showCreateForm ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Create Competition</h1>
                  <p className="text-muted-foreground">
                    Set up a new HubSpot Admin competition
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Back to Competitions
                </Button>
              </div>
              
              <CompetitionForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          ) : (
            <CompetitionList
              showCreateButton={canCreateCompetition}
              onCreateClick={() => setShowCreateForm(true)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}