import { supabase } from './supabase'
import { userService } from './database'

export interface HubSpotProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  properties?: {
    hs_is_admin?: boolean
    company?: string
    jobtitle?: string
  }
}

export interface HubSpotTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export class HubSpotAuthProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.HUBSPOT_CLIENT_ID!
    this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET!
    this.redirectUri = process.env.HUBSPOT_REDIRECT_URI!
  }

  /**
   * Generate HubSpot OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'oauth contacts',
      response_type: 'code',
      ...(state && { state })
    })

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<HubSpotTokens> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HubSpot token exchange failed: ${error}`)
    }

    return response.json()
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<HubSpotTokens> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HubSpot token refresh failed: ${error}`)
    }

    return response.json()
  }

  /**
   * Get user profile from HubSpot API
   */
  async getUserProfile(accessToken: string): Promise<HubSpotProfile> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken)
    
    if (!response.ok) {
      throw new Error('Failed to verify HubSpot access token')
    }

    const tokenInfo = await response.json()
    
    // Get user details
    const userResponse = await fetch(`https://api.hubapi.com/contacts/v1/contact/email/${tokenInfo.user}/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      // Fallback to basic user info from token
      return {
        id: tokenInfo.user_id.toString(),
        email: tokenInfo.user,
        firstName: '',
        lastName: '',
      }
    }

    const userProfile = await userResponse.json()
    
    return {
      id: userProfile.vid?.toString() || tokenInfo.user_id.toString(),
      email: tokenInfo.user,
      firstName: userProfile.properties?.firstname?.value || '',
      lastName: userProfile.properties?.lastname?.value || '',
      properties: {
        hs_is_admin: userProfile.properties?.hs_is_admin?.value === 'true',
        company: userProfile.properties?.company?.value,
        jobtitle: userProfile.properties?.jobtitle?.value,
      }
    }
  }

  /**
   * Verify HubSpot account and determine user role
   */
  async verifyHubSpotAccount(accessToken: string): Promise<{
    isValid: boolean
    isAdmin: boolean
    profile: HubSpotProfile | null
  }> {
    try {
      const profile = await this.getUserProfile(accessToken)
      
      return {
        isValid: true,
        isAdmin: profile.properties?.hs_is_admin || false,
        profile
      }
    } catch (error) {
      console.error('HubSpot verification failed:', error)
      return {
        isValid: false,
        isAdmin: false,
        profile: null
      }
    }
  }
}

/**
 * Create or update user in our database after HubSpot authentication
 */
export async function createOrUpdateUserFromHubSpot(
  hubspotProfile: HubSpotProfile,
  tokens: HubSpotTokens
): Promise<any> {
  try {
    // Check if user already exists
    const existingUser = await userService.getByHubSpotId(hubspotProfile.id)
    
    const userData = {
      hubspot_id: hubspotProfile.id,
      email: hubspotProfile.email,
      display_name: `${hubspotProfile.firstName} ${hubspotProfile.lastName}`.trim() || hubspotProfile.email,
      verification_status: 'verified' as const,
      role: hubspotProfile.properties?.hs_is_admin ? 'organizer' as const : 'participant' as const,
    }

    if (existingUser) {
      // Update existing user
      const updatedUser = await userService.update(existingUser.id, userData)
      
      // Create Supabase auth user if doesn't exist
      const { data: authUser, error } = await supabase.auth.signInWithPassword({
        email: hubspotProfile.email,
        password: 'hubspot-oauth-' + hubspotProfile.id, // Temporary password
      })

      if (error && error.message.includes('Invalid login credentials')) {
        // Create auth user
        await supabase.auth.signUp({
          email: hubspotProfile.email,
          password: 'hubspot-oauth-' + hubspotProfile.id,
          options: {
            data: {
              hubspot_id: hubspotProfile.id,
              display_name: userData.display_name,
            }
          }
        })
      }

      return updatedUser
    } else {
      // Create new user in our database
      const newUser = await userService.create(userData)
      
      // Create Supabase auth user
      await supabase.auth.signUp({
        email: hubspotProfile.email,
        password: 'hubspot-oauth-' + hubspotProfile.id,
        options: {
          data: {
            hubspot_id: hubspotProfile.id,
            display_name: userData.display_name,
          }
        }
      })

      return newUser
    }
  } catch (error) {
    console.error('Error creating/updating user:', error)
    throw error
  }
}

// Singleton instance
export const hubspotAuth = new HubSpotAuthProvider()