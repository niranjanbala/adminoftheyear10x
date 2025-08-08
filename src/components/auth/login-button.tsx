'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-provider'

interface LoginButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function LoginButton({ 
  variant = 'default', 
  size = 'default', 
  className,
  children 
}: LoginButtonProps) {
  const { signInWithHubSpot, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithHubSpot()
    } catch (error) {
      console.error('Login failed:', error)
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogin}
      disabled={loading || isLoading}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting...
        </>
      ) : (
        children || (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 3.433-2.043 4.568-1.258 1.249-2.97 1.93-4.814 1.93-1.843 0-3.556-.681-4.814-1.93-1.147-1.135-1.874-2.71-2.043-4.568-.027-.312.207-.576.52-.576h.896c.261 0 .48.183.53.437.123 1.25.634 2.394 1.434 3.188.8.794 1.87 1.232 3.014 1.232s2.214-.438 3.014-1.232c.8-.794 1.311-1.938 1.434-3.188.05-.254.269-.437.53-.437h.896c.313 0 .547.264.52.576z"/>
            </svg>
            Sign in with HubSpot
          </>
        )
      )}
    </Button>
  )
}