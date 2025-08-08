import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { competitionService } from '@/lib/database'
import { VotingInterface } from '@/components/competitions/voting-interface'
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

export default async function VotePage({ params }: PageProps) {
  const competition = await getCompetition(params.id)

  if (!competition) {
    notFound()
  }

  // Check if voting is currently open
  const now = new Date()
  const voteStart = competition.voting_start ? new Date(competition.voting_start) : null
  const voteEnd = competition.voting_end ? new Date(competition.voting_end) : null
  const isVotingOpen = voteStart && voteEnd && now >= voteStart && now <= voteEnd

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/competitions/${competition.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competition
          </Link>
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Vote in Competition</h1>
          <p className="text-xl text-muted-foreground">{competition.title}</p>
          {competition.country && (
            <p className="text-muted-foreground">📍 {competition.country}</p>
          )}
        </div>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      }>
        <VotingInterface
          competitionId={competition.id}
          competitionTitle={competition.title}
          isVotingOpen={!!isVotingOpen}
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
    title: `Vote - ${competition.title}`,
    description: `Vote for your favorite submissions in the ${competition.title} competition`,
  }
}