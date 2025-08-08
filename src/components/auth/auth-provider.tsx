'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase'
import type { AuthenticatedUser } from '@/lib/auth-middleware'

interface AuthContextType {
  user: AuthenticatedUser | null
  loading: boolean
  signInWithHubSpot: () => Promise<void>
  signOut: () => Promise<void>
  refreshTokens: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Only create Supabase client on the client side
  const [supabase] = useState(() => {
    if (typeof window !== 'undefined') {
      return createClientComponentClient<Database>()
    }
    return null
  })

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setUser({
        id: data.id,
        email: data.email,
        hubspot_id: data.hubspot_id,
        display_name: data.display_name,
        role: data.role,
        verification_status: data.verification_status
      })
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUser(null)
    }
  }

  const signInWithHubSpot = async () => {
    try {
      setLoading(true)
      
      // Get HubSpot auth URL
      const response = await fetch('/api/auth/hubspot/initiate', {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('Failed to initiate HubSpot authentication')
      }
      
      const { authUrl } = await response.json()
      
      // Redirect to HubSpot OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('HubSpot sign-in error:', error)
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    if (!supabase) return
    
    try {
      setLoading(true)
      
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const refreshTokens = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to refresh tokens')
      }
      
      // Tokens are automatically updated in the session
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signInWithHubSpot,
    signOut,
    refreshTokens,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}