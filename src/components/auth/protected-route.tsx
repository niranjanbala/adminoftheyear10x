'use client'

import { useAuth } from './auth-provider'
import { LoginButton } from './login-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: 'participant' | 'voter' | 'organizer' | 'super_admin'
  requireVerified?: boolean
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requireRole, 
  requireVerified = false,
  fallback 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Sign In Required
            </CardTitle>
            <CardDescription>
              You need to sign in with your HubSpot account to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginButton className="w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireVerified && user.verification_status !== 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">
              Account Verification Required
            </CardTitle>
            <CardDescription>
              Your HubSpot account needs to be verified before you can access this feature.
              {user.verification_status === 'pending' && ' Verification is currently pending.'}
              {user.verification_status === 'rejected' && ' Your verification was rejected. Please contact support.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (requireRole) {
    const roleHierarchy = {
      'participant': 0,
      'voter': 1,
      'organizer': 2,
      'super_admin': 3
    }

    const userRoleLevel = roleHierarchy[user.role]
    const requiredRoleLevel = roleHierarchy[requireRole]

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                  />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold">
                Access Denied
              </CardTitle>
              <CardDescription>
                You don&apos;t have the required permissions to access this page.
                Required role: {requireRole.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )
    }
  }

  return <>{children}</>
}