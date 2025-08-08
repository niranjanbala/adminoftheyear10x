import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Project Setup', () => {
  it('renders the home page', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', {
      name: /hubspot admin competition platform/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  it('displays welcome message', () => {
    render(<Home />)
    
    const welcomeText = screen.getByText(/welcome to the global competition/i)
    expect(welcomeText).toBeInTheDocument()
  })
})

describe('Core Infrastructure', () => {
  it('has proper TypeScript types defined', () => {
    // Test that our core types are properly exported
    const { UserRole, CompetitionTier, VerificationStatus } = require('../types')
    
    expect(UserRole.PARTICIPANT).toBe('participant')
    expect(CompetitionTier.LOCAL).toBe('local')
    expect(VerificationStatus.VERIFIED).toBe('verified')
  })

  it('has utility functions available', () => {
    const { cn } = require('../lib/utils')
    
    expect(typeof cn).toBe('function')
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })
})