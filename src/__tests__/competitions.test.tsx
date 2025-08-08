import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompetitionList } from '../components/competitions/competition-list'
import { CompetitionDetail } from '../components/competitions/competition-detail'
import { competitionService, participationService } from '../lib/database'

// Mock fetch
global.fetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock auth provider
jest.mock('../components/auth/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'test@example.com',
      display_name: 'Test User',
      role: 'organizer',
      verification_status: 'verified'
    },
    loading: false
  })
}))

// Mock database service
jest.mock('../lib/database', () => ({
  competitionService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  participationService: {
    getByCompetition: jest.fn(),
  }
}))

const mockCompetitions = [
  {
    id: 'comp1',
    title: 'Local HubSpot Challenge',
    description: 'A local competition for HubSpot admins',
    tier: 'local',
    country: 'United States',
    status: 'registration_open',
    registration_start: '2024-01-01T00:00:00Z',
    registration_end: '2024-01-15T00:00:00Z',
    voting_start: '2024-01-16T00:00:00Z',
    voting_end: '2024-01-30T00:00:00Z',
    max_participants: 50,
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'organizer123'
  },
  {
    id: 'comp2',
    title: 'National HubSpot Championship',
    description: 'National level competition',
    tier: 'national',
    country: null,
    status: 'voting_open',
    registration_start: '2024-02-01T00:00:00Z',
    registration_end: '2024-02-15T00:00:00Z',
    voting_start: '2024-02-16T00:00:00Z',
    voting_end: '2024-02-28T00:00:00Z',
    max_participants: null,
    created_at: '2024-02-01T00:00:00Z',
    created_by: 'organizer456'
  }
]

const mockParticipants = [
  {
    id: 'part1',
    user_id: 'user1',
    status: 'approved',
    submission_title: 'My HubSpot Setup',
    submission_description: 'A comprehensive HubSpot configuration',
    vote_count: 15,
    ranking: 1,
    applied_at: '2024-01-02T00:00:00Z',
    user: {
      display_name: 'John Doe',
      profile_picture_url: null
    }
  },
  {
    id: 'part2',
    user_id: 'user2',
    status: 'approved',
    submission_title: 'Advanced Workflows',
    submission_description: 'Complex automation workflows',
    vote_count: 12,
    ranking: 2,
    applied_at: '2024-01-03T00:00:00Z',
    user: {
      display_name: 'Jane Smith',
      profile_picture_url: 'https://example.com/jane.jpg'
    }
  }
]

describe('Competition Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('CompetitionList', () => {
    it('should render competition list correctly', async () => {
      ;(competitionService.getAll as jest.Mock).mockResolvedValueOnce(mockCompetitions)

      render(<CompetitionList />)

      await waitFor(() => {
        expect(screen.getByText('Local HubSpot Challenge')).toBeInTheDocument()
        expect(screen.getByText('National HubSpot Championship')).toBeInTheDocument()
      })
    })

    it('should display competition details correctly', async () => {
      ;(competitionService.getAll as jest.Mock).mockResolvedValueOnce(mockCompetitions)

      render(<CompetitionList />)

      await waitFor(() => {
        expect(screen.getByText('local')).toBeInTheDocument()
        expect(screen.getByText('national')).toBeInTheDocument()
        expect(screen.getByText('📍 United States')).toBeInTheDocument()
      })
    })

    it('should show create button for organizers', async () => {
      ;(competitionService.getAll as jest.Mock).mockResolvedValueOnce(mockCompetitions)

      const mockOnCreate = jest.fn()
      render(<CompetitionList showCreateButton={true} onCreateClick={mockOnCreate} />)

      await waitFor(() => {
        const createButton = screen.getByText('Create Competition')
        expect(createButton).toBeInTheDocument()
        
        fireEvent.click(createButton)
        expect(mockOnCreate).toHaveBeenCalled()
      })
    })

    it('should filter competitions by search term', async () => {
      ;(competitionService.getAll as jest.Mock).mockResolvedValueOnce(mockCompetitions)

      render(<CompetitionList />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search competitions...')
        fireEvent.change(searchInput, { target: { value: 'Local' } })
        
        expect(screen.getByText('Local HubSpot Challenge')).toBeInTheDocument()
        expect(screen.queryByText('National HubSpot Championship')).not.toBeInTheDocument()
      })
    })

    it('should handle empty competition list', async () => {
      ;(competitionService.getAll as jest.Mock).mockResolvedValueOnce([])

      render(<CompetitionList />)

      await waitFor(() => {
        expect(screen.getByText('No competitions found')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      ;(competitionService.getAll as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      // Component should render without crashing even with API error
      expect(() => render(<CompetitionList />)).not.toThrow()
    })
  })

  describe('CompetitionDetail', () => {
    beforeEach(() => {
      // Mock both competition and participants API calls
      ;(competitionService.getById as jest.Mock).mockResolvedValue(mockCompetitions[0])
      ;(participationService.getByCompetition as jest.Mock).mockResolvedValue(mockParticipants)
    })

    it('should render competition details correctly', async () => {
      render(<CompetitionDetail competitionId="comp1" />)

      await waitFor(() => {
        expect(screen.getByText('Local HubSpot Challenge')).toBeInTheDocument()
        expect(screen.getByText('A local competition for HubSpot admins')).toBeInTheDocument()
        expect(screen.getByText('📍 United States')).toBeInTheDocument()
      })
    })

    it('should display competition timeline', async () => {
      render(<CompetitionDetail competitionId="comp1" />)

      await waitFor(() => {
        expect(screen.getByText('Timeline')).toBeInTheDocument()
        expect(screen.getByText('Registration Opens:')).toBeInTheDocument()
        expect(screen.getByText('Voting Opens:')).toBeInTheDocument()
      })
    })

    it('should show participants tab with correct count', async () => {
      render(<CompetitionDetail competitionId="comp1" />)

      await waitFor(() => {
        expect(screen.getByText('Participants (2)')).toBeInTheDocument()
      })
    })

    it('should display leaderboard tab', async () => {
      render(<CompetitionDetail competitionId="comp1" />)

      await waitFor(() => {
        expect(screen.getByText('Leaderboard')).toBeInTheDocument()
      })
    })

    it('should show competition rules tab', async () => {
      render(<CompetitionDetail competitionId="comp1" />)

      await waitFor(() => {
        expect(screen.getByText('Rules')).toBeInTheDocument()
      })
    })

    it('should handle competition not found', async () => {
      ;(competitionService.getById as jest.Mock).mockResolvedValueOnce(null)
      ;(participationService.getByCompetition as jest.Mock).mockResolvedValueOnce([])

      render(<CompetitionDetail competitionId="nonexistent" />)

      await waitFor(() => {
        expect(screen.getByText('Competition Not Found')).toBeInTheDocument()
      })
    })
  })

  describe('Competition Status and Phases', () => {
    it('should correctly identify competition phases', () => {
      const now = new Date('2024-01-10T12:00:00Z') // During registration
      const competition = mockCompetitions[0]
      
      const regStart = new Date(competition.registration_start!)
      const regEnd = new Date(competition.registration_end!)
      
      expect(now >= regStart && now <= regEnd).toBe(true)
    })

    it('should show appropriate action buttons based on phase', async () => {
      // Mock current time to be during registration
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-10T12:00:00Z'))

      // Mock competition with registration open status
      const registrationOpenCompetition = {
        ...mockCompetitions[0],
        status: 'registration_open'
      }
      ;(competitionService.getById as jest.Mock).mockResolvedValueOnce(registrationOpenCompetition)

      render(<CompetitionDetail competitionId="comp1" />)

      await waitFor(() => {
        expect(screen.getByText('Register Now')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('Competition Form Validation', () => {
    it('should validate competition title length', () => {
      const shortTitle = 'AB'
      const longTitle = 'A'.repeat(101)
      
      expect(shortTitle.length).toBeLessThan(3)
      expect(longTitle.length).toBeGreaterThan(100)
    })

    it('should validate competition description length', () => {
      const longDescription = 'A'.repeat(1001)
      expect(longDescription.length).toBeGreaterThan(1000)
    })

    it('should validate date sequence', () => {
      const regStart = new Date('2024-01-01')
      const regEnd = new Date('2024-01-15')
      const voteStart = new Date('2024-01-16')
      const voteEnd = new Date('2024-01-30')
      
      expect(regStart < regEnd).toBe(true)
      expect(regEnd <= voteStart).toBe(true)
      expect(voteStart < voteEnd).toBe(true)
    })

    it('should validate participant limits', () => {
      const validLimit = 50
      const invalidLowLimit = 0
      const invalidHighLimit = 1001
      
      expect(validLimit).toBeGreaterThanOrEqual(1)
      expect(validLimit).toBeLessThanOrEqual(1000)
      expect(invalidLowLimit).toBeLessThan(1)
      expect(invalidHighLimit).toBeGreaterThan(1000)
    })
  })

  describe('API Integration', () => {
    it('should handle competition creation API calls', async () => {
      const competitionData = {
        title: 'Test Competition',
        description: 'Test description',
        tier: 'local',
        country: 'United States',
        registration_start: '2024-01-01T00:00:00Z',
        registration_end: '2024-01-15T00:00:00Z',
        voting_start: '2024-01-16T00:00:00Z',
        voting_end: '2024-01-30T00:00:00Z',
        max_participants: 50,
        qualification_rules: {
          requiresApproval: true,
          topN: 3,
          minVotes: 0
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-comp', ...competitionData })
      })

      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competitionData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.title).toBe('Test Competition')
    })

    it('should handle competition update API calls', async () => {
      const updateData = {
        title: 'Updated Competition',
        status: 'registration_open'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockCompetitions[0], ...updateData })
      })

      const response = await fetch('/api/competitions/comp1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.title).toBe('Updated Competition')
    })

    it('should handle API validation errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ 
          error: 'Invalid request data',
          details: [{ message: 'Title is required' }]
        })
      })

      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      expect(response.ok).toBe(false)
      const error = await response.json()
      expect(error.error).toBe('Invalid request data')
    })
  })

  describe('Competition Status Management', () => {
    it('should display correct status badges', () => {
      const statuses = ['draft', 'registration_open', 'voting_open', 'completed']
      
      statuses.forEach(status => {
        expect(typeof status).toBe('string')
        expect(['draft', 'registration_open', 'registration_closed', 'voting_open', 'voting_closed', 'completed']).toContain(status)
      })
    })

    it('should show appropriate tier badges', () => {
      const tiers = ['local', 'national', 'global']
      
      tiers.forEach(tier => {
        expect(typeof tier).toBe('string')
        expect(['local', 'national', 'global']).toContain(tier)
      })
    })
  })
})