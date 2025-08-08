import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { hubspotAuth } from '@/lib/hubspot-auth'
import { withAuth, withCors } from '@/lib/auth-middleware'
import type { Database } from '@/lib/supabase'

async function handler(request: NextRequest, { user, supabase }: any) {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.user_metadata?.hubspot_refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 400 }
      )
    }

    const refreshToken = session.user.user_metadata.hubspot_refresh_token
    
    // Refresh HubSpot tokens
    const newTokens = await hubspotAuth.refreshAccessToken(refreshToken)
    
    // Update user metadata with new tokens
    await supabase.auth.updateUser({
      data: {
        hubspot_access_token: newTokens.access_token,
        hubspot_refresh_token: newTokens.refresh_token,
        hubspot_token_expires: Date.now() + (newTokens.expires_in * 1000),
      }
    })

    return NextResponse.json({
      success: true,
      expires_in: newTokens.expires_in
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh tokens' },
      { status: 500 }
    )
  }
}

const authHandler = withAuth(handler, { requireVerified: true })

export const POST = withCors(
  authHandler,
  {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL!] 
      : ['http://localhost:3000'],
    methods: ['POST'],
  }
)