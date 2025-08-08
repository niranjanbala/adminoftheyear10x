import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { hubspotAuth, createOrUpdateUserFromHubSpot } from '@/lib/hubspot-auth'
import { withCors, withRateLimit } from '@/lib/auth-middleware'
import type { Database } from '@/lib/supabase'

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_code', request.url)
      )
    }

    // Exchange code for tokens
    const tokens = await hubspotAuth.exchangeCodeForTokens(code)
    
    // Verify HubSpot account and get profile
    const verification = await hubspotAuth.verifyHubSpotAccount(tokens.access_token)
    
    if (!verification.isValid || !verification.profile) {
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_hubspot_account', request.url)
      )
    }

    // Create or update user in our database
    const user = await createOrUpdateUserFromHubSpot(verification.profile, tokens)
    
    // Create Supabase session
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: verification.profile.email,
      password: 'hubspot-oauth-' + verification.profile.id,
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      return NextResponse.redirect(
        new URL('/auth/error?error=auth_failed', request.url)
      )
    }

    // Store HubSpot tokens in session metadata
    await supabase.auth.updateUser({
      data: {
        hubspot_access_token: tokens.access_token,
        hubspot_refresh_token: tokens.refresh_token,
        hubspot_token_expires: Date.now() + (tokens.expires_in * 1000),
      }
    })

    // Redirect to success page or dashboard
    const redirectUrl = state 
      ? decodeURIComponent(state)
      : '/dashboard'
    
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error('HubSpot callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/error?error=callback_failed', request.url)
    )
  }
}

export const GET = withCors(
  withRateLimit(handler, {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyGenerator: (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
  }),
  {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL!] 
      : ['http://localhost:3000'],
    methods: ['GET'],
  }
)