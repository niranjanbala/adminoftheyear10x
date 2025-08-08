import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { competitionService } from '@/lib/database'
import { ParticipantManagement } from '@/components/competitions/participant-management'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: {
    id: string
  }
}

async function getCompetition(id: string) {
  try {
    const competition = await competitionService.getByIdDirect(id)
    return competition
  } catch (error) {
    console.error('Error fetching competition:', error)
    return null
  }
}

export default async function ParticipantsPage({ params }: PageProps) {
  const competition = await getCompetition(params.id)

  if (!competition) {
    notFound()
  }

  // For now, we'll assume the user has permission to manage if they're accessing this page
  // In a real implementation, you'd check the user's session and permissions here
  const canManage = true // This should be replaced with actual permission checking

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/competitions/${competition.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competition
          </Link>
        </Button>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }>
        <ParticipantManagement
          competitionId={competition.id}
          competitionTitle={competition.title}
          canManage={canManage}
        />
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const competition = await getCompetition(params.id)
  
  if (!competition) {
    return {
      title: 'Competition Not Found',
    }
  }

  return {
    title: `Manage Participants - ${competition.title}`,
    description: `Manage participants for the ${competition.title} competition`,
  }
}