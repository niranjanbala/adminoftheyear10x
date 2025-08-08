import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { competitionService } from '@/lib/database'
import { ParticipationForm } from '@/components/competitions/participation-form'
import { ParticipationStatus } from '@/components/competitions/participation-status'
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

export default async function ParticipatePage({ params }: PageProps) {
  const competition = await getCompetition(params.id)

  if (!competition) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/competitions/${competition.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competition
          </Link>
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Participate in Competition</h1>
          <p className="text-xl text-muted-foreground">{competition.title}</p>
          {competition.country && (
            <p className="text-muted-foreground">📍 {competition.country}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Show participation status if user is already participating */}
        <Suspense fallback={<div>Loading participation status...</div>}>
          <ParticipationStatus
            competitionId={competition.id}
            competitionTitle={competition.title}
          />
        </Suspense>

        {/* Participation form */}
        <ParticipationForm
          competitionId={competition.id}
          competitionTitle={competition.title}
        />
      </div>
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
    title: `Participate in ${competition.title}`,
    description: `Apply to participate in the ${competition.title} competition`,
  }
}