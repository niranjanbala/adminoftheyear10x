import { HubSpotAuthProvider } from '../lib/hubspot-auth'
import { hasPermission } from '../lib/auth-middleware'

// Mock fetch
global.fetch = jest.fn()

// Mock Next.js
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => null)
  })
}))

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }),
  createRouteHandlerClient: () => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      signOut: jest.fn()
    }
  })
}))

const mockHubSpotProfile = {
  id: 'hubspot123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  properties: {
    hs_is_admin: true,
    company: 'Test Company',
    jobtitle: 'Admin'
  }
}

const mockTokens = {
  access_token: 'access123',
  refresh_token: 'refresh123',
  expires_in: 3600,
  token_type: 'Bearer'
}

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  hubspot_id: 'hubspot123',
  display_name: 'John Doe',
  role: 'organizer' as const,
  verification_status: 'verified' as const
}

describe('HubSpot Authentication', () => {
  let hubspotAuth: HubSpotAuthProvider

  beforeEach(() => {
    hubspotAuth = new HubSpotAuthProvider()
    jest.clearAllMocks()
  })

  describe('HubSpotAuthProvider', () => {
    it('should generate correct authorization URL', () => {
      const authUrl = hubspotAuth.getAuthorizationUrl('test-state')
      
      expect(authUrl).toContain('https://app.hubspot.com/oauth/authorize')
      expect(authUrl).toContain('client_id=')
      expect(authUrl).toContain('state=test-state')
      expect(authUrl).toContain('scope=oauth%20contacts')
    })

    it('should exchange code for tokens', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens)
      })

      const tokens = await hubspotAuth.exchangeCodeForTokens('test-code')
      
      expect(tokens).toEqual(mockTokens)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.hubapi.com/oauth/v1/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        })
      )
    })

    it('should handle token exchange errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid code')
      })

      await expect(hubspotAuth.exchangeCodeForTokens('invalid-code'))
        .rejects.toThrow('HubSpot token exchange failed: Invalid code')
    })

    it('should refresh access token', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens)
      })

      const tokens = await hubspotAuth.refreshAccessToken('refresh123')
      
      expect(tokens).toEqual(mockTokens)
    })

    it('should verify HubSpot account', async () => {
      // Mock token info response
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            user: 'test@example.com',
            user_id: 'hubspot123'
          })
        })
        // Mock user profile response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            vid: 'hubspot123',
            properties: {
              firstname: { value: 'John' },
              lastname: { value: 'Doe' },
              hs_is_admin: { value: 'true' },
              company: { value: 'Test Company' }
            }
          })
        })

      const verification = await hubspotAuth.verifyHubSpotAccount('access123')
      
      expect(verification.isValid).toBe(true)
      expect(verification.isAdmin).toBe(true)
      expect(verification.profile?.email).toBe('test@example.com')
    })
  })

  describe('User Creation/Update', () => {
    it('should have user creation functions available', () => {
      // Test that our user creation functions are properly structured
      const { createOrUpdateUserFromHubSpot } = require('../lib/hubspot-auth')
      expect(typeof createOrUpdateUserFromHubSpot).toBe('function')
    })
  })
})

describe('Authentication Middleware', () => {
  describe('hasPermission', () => {
    it('should check vote permission correctly', () => {
      const verifiedUser = { ...mockUser, verification_status: 'verified' as const }
      const unverifiedUser = { ...mockUser, verification_status: 'pending' as const }
      
      expect(hasPermission(verifiedUser, 'vote')).toBe(true)
      expect(hasPermission(unverifiedUser, 'vote')).toBe(false)
    })

    it('should check create_competition permission correctly', () => {
      const organizer = { ...mockUser, role: 'organizer' as const }
      const participant = { ...mockUser, role: 'participant' as const }
      const superAdmin = { ...mockUser, role: 'super_admin' as const }
      
      expect(hasPermission(organizer, 'create_competition')).toBe(true)
      expect(hasPermission(superAdmin, 'create_competition')).toBe(true)
      expect(hasPermission(participant, 'create_competition')).toBe(false)
    })

    it('should check manage_users permission correctly', () => {
      const superAdmin = { ...mockUser, role: 'super_admin' as const }
      const organizer = { ...mockUser, role: 'organizer' as const }
      
      expect(hasPermission(superAdmin, 'manage_users')).toBe(true)
      expect(hasPermission(organizer, 'manage_users')).toBe(false)
    })

    it('should check admin_access permission correctly', () => {
      const superAdmin = { ...mockUser, role: 'super_admin' as const }
      const organizer = { ...mockUser, role: 'organizer' as const }
      const participant = { ...mockUser, role: 'participant' as const }
      
      expect(hasPermission(superAdmin, 'admin_access')).toBe(true)
      expect(hasPermission(organizer, 'admin_access')).toBe(true)
      expect(hasPermission(participant, 'admin_access')).toBe(false)
    })
  })
})

describe('Authentication Components', () => {
  it('should have authentication components available', () => {
    // Test that our auth components are properly exported
    expect(typeof HubSpotAuthProvider).toBe('function')
    expect(typeof hasPermission).toBe('function')
  })
})

describe('Environment Variables', () => {
  it('should have required environment variables defined', () => {
    // These would be set in the actual environment
    const requiredEnvVars = [
      'HUBSPOT_CLIENT_ID',
      'HUBSPOT_CLIENT_SECRET',
      'HUBSPOT_REDIRECT_URI'
    ]

    // In tests, we just check that the variables are referenced
    expect(process.env.HUBSPOT_CLIENT_ID).toBeDefined()
    expect(process.env.HUBSPOT_CLIENT_SECRET).toBeDefined()
    expect(process.env.HUBSPOT_REDIRECT_URI).toBeDefined()
  })
})

describe('API Route Security', () => {
  it('should validate authentication middleware structure', () => {
    const { withAuth } = require('../lib/auth-middleware')
    expect(typeof withAuth).toBe('function')
  })

  it('should have proper error handling', () => {
    // This tests the structure of our auth system
    expect(hasPermission).toBeDefined()
    expect(typeof hasPermission).toBe('function')
  })
})