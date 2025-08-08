'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { LoginButton } from '@/components/auth/login-button'
import { UserMenu } from '@/components/auth/user-menu'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            HubSpot Admin Competition
          </h1>
          
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="animate-pulse h-8 w-8 bg-gray-200 rounded-full"></div>
            ) : user ? (
              <UserMenu />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              Welcome to the Global Competition
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Compete with HubSpot admins worldwide and showcase your expertise. 
              Participate in local, national, and global competitions to prove you&apos;re the best.
            </p>
          </div>

          {user ? (
            <div className="space-y-4">
              <p className="text-lg">
                Welcome back, <span className="font-semibold">{user.display_name}</span>!
              </p>
              <div className="flex justify-center space-x-4">
                <Button asChild size="lg">
                  <Link href="/competitions">
                    View Competitions
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/profile">
                    My Profile
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                Sign in with your HubSpot account to get started
              </p>
              <LoginButton size="lg" />
            </div>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Local to Global</h3>
              <p className="text-muted-foreground">
                Start local, compete nationally, and advance to the global finale
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Verified Voting</h3>
              <p className="text-muted-foreground">
                Only verified HubSpot users can vote, ensuring fair competition
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Real-time Results</h3>
              <p className="text-muted-foreground">
                Watch live leaderboards and see results update in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}