import { NextRequest, NextResponse } from 'next/server'
import { hubspotAuth } from '@/lib/hubspot-auth'
import { withCors } from '@/lib/auth-middleware'

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state') || undefined
    
    const authUrl = hubspotAuth.getAuthorizationUrl(state)
    
    return NextResponse.json({
      authUrl,
      success: true
    })
  } catch (error) {
    console.error('HubSpot auth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate HubSpot authentication' },
      { status: 500 }
    )
  }
}

export const GET = withCors(handler, {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!] 
    : ['http://localhost:3000'],
  methods: ['GET'],
})