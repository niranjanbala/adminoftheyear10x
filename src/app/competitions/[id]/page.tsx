'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { CompetitionDetail } from '@/components/competitions/competition-detail'

interface CompetitionPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const { id } = await params
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <CompetitionDetail competitionId={id} />
        </div>
      </div>
    </ProtectedRoute>
  )
}