import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { userService } from './database'
import type { Database } from './supabase'

export interface AuthenticatedUser {
  id: string
  email: string
  hubspot_id: string
  display_name: string
  role: 'participant' | 'voter' | 'organizer' | 'super_admin'
  verification_status: 'pending' | 'verified' | 'rejected'
}

export interface AuthContext {
  user: AuthenticatedUser
  supabase: ReturnType<typeof createRouteHandlerClient<Database>>
}

/**
 * Authentication middleware for API routes
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>,
  options: {
    requireRole?: 'participant' | 'voter' | 'organizer' | 'super_admin'
    requireVerified?: boolean
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = createRouteHandlerClient<Database>({ cookies })
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user from our database
      const user = await userService.getById(session.user.id)
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Check verification status if required
      if (options.requireVerified && user.verification_status !== 'verified') {
        return NextResponse.json(
          { error: 'Account verification required' },
          { status: 403 }
        )
      }

      // Check role requirements
      if (options.requireRole) {
        const roleHierarchy = {
          'participant': 0,
          'voter': 1,
          'organizer': 2,
          'super_admin': 3
        }

        const userRoleLevel = roleHierarchy[user.role]
        const requiredRoleLevel = roleHierarchy[options.requireRole]

        if (userRoleLevel < requiredRoleLevel) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }

      const authUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        hubspot_id: user.hubspot_id,
        display_name: user.display_name,
        role: user.role,
        verification_status: user.verification_status
      }

      const context: AuthContext = {
        user: authUser,
        supabase
      }

      return await handler(request, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Get current user from request (for client-side)
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return null
    }

    const user = await userService.getById(session.user.id)
    
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      hubspot_id: user.hubspot_id,
      display_name: user.display_name,
      role: user.role,
      verification_status: user.verification_status
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthenticatedUser,
  permission: 'vote' | 'create_competition' | 'manage_users' | 'admin_access'
): boolean {
  switch (permission) {
    case 'vote':
      return user.verification_status === 'verified'
    
    case 'create_competition':
      return ['organizer', 'super_admin'].includes(user.role)
    
    case 'manage_users':
      return user.role === 'super_admin'
    
    case 'admin_access':
      return ['organizer', 'super_admin'].includes(user.role)
    
    default:
      return false
  }
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    maxRequests: number
    windowMs: number
    keyGenerator?: (request: NextRequest) => string
  }
) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return async (request: NextRequest): Promise<NextResponse> => {
    const key = options.keyGenerator 
      ? options.keyGenerator(request)
      : request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    
    const now = Date.now()
    const windowStart = now - options.windowMs
    
    // Clean up old entries
    requests.forEach((v, k) => {
      if (v.resetTime < windowStart) {
        requests.delete(k)
      }
    })
    
    const current = requests.get(key) || { count: 0, resetTime: now + options.windowMs }
    
    if (current.count >= options.maxRequests && current.resetTime > now) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    current.count++
    requests.set(key, current)
    
    return await handler(request)
  }
}

/**
 * CORS middleware for API routes
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': Array.isArray(options.origin) 
            ? options.origin.join(', ') 
            : options.origin || '*',
          'Access-Control-Allow-Methods': options.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': options.headers?.join(', ') || 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const response = await handler(request)
    
    // Add CORS headers to response
    response.headers.set(
      'Access-Control-Allow-Origin',
      Array.isArray(options.origin) 
        ? options.origin.join(', ') 
        : options.origin || '*'
    )
    
    return response
  }
}