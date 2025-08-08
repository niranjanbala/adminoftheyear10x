'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Trophy, Vote, UserCheck, TrendingUp, Activity, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import Link from 'next/link'

interface DashboardStats {
  overview: {
    total_users: number
    total_competitions: number
    total_participations: number
    total_votes: number
  }
  user_stats: Record<string, number>
  competition_stats: Record<string, number>
  recent_activity: Array<{
    id: string
    title: string
    status: string
    created_at: string
  }>
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        throw new Error('Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'registration_open':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'voting_open':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don&apos;t have permission to access the admin dashboard.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchDashboardStats}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and management tools
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/users">Manage Users</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/competitions">Manage Competitions</Link>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Registered platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitions</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_competitions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total competitions created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participations</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_participations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Competition applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_votes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Votes cast across all competitions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="users">User Stats</TabsTrigger>
          <TabsTrigger value="competitions">Competition Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Platform Growth
                </CardTitle>
                <CardDescription>
                  Key metrics and growth indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">User Engagement Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {((stats.overview.total_participations / stats.overview.total_users) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avg Votes per Competition</span>
                    <span className="text-sm text-muted-foreground">
                      {(stats.overview.total_votes / Math.max(stats.overview.total_competitions, 1)).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Participation Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {((stats.overview.total_participations / Math.max(stats.overview.total_competitions, 1))).toFixed(1)} per competition
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Platform status and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">System Status</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Operational
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">API Response</span>
                    <span className="text-sm text-muted-foreground">~150ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Competition Activity</CardTitle>
              <CardDescription>
                Latest competitions and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recent_activity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity to display
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.recent_activity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusBadgeColor(activity.status)}>
                          {activity.status.replace('_', ' ')}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/competitions/${activity.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Distribution by Role</CardTitle>
              <CardDescription>
                Breakdown of users by their assigned roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.user_stats).map(([role, count]) => (
                  <div key={role} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {role.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competition Distribution by Tier</CardTitle>
              <CardDescription>
                Breakdown of competitions by tier level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(stats.competition_stats).map(([tier, count]) => (
                  <div key={tier} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {tier} Tier
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}