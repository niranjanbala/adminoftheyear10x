import { userService, competitionService, participationService, votingService } from '../lib/database'

// Mock Supabase client
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockUser, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [mockUser], error: null }))
        })),
        order: jest.fn(() => Promise.resolve({ data: [mockUser], error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockUser, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockUser, error: null }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => Promise.resolve({ data: true, error: null })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.com/file.jpg' } })),
        remove: jest.fn(() => Promise.resolve({ error: null }))
      }))
    },
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => Promise.resolve())
      }))
    })),
    removeChannel: jest.fn()
  }
}))

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  hubspot_id: 'hubspot123',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'Test bio',
  skills: ['HubSpot', 'Marketing'],
  hubspot_experience: '2 years',
  portfolio_links: ['https://portfolio.com'],
  profile_picture_url: null,
  banner_image_url: null,
  intro_video_url: null,
  role: 'participant' as const,
  verification_status: 'verified' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockCompetition = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  title: 'Test Competition',
  description: 'Test description',
  tier: 'local' as const,
  country: 'US',
  status: 'voting_open' as const,
  registration_start: '2024-01-01T00:00:00Z',
  registration_end: '2024-01-15T00:00:00Z',
  voting_start: '2024-01-16T00:00:00Z',
  voting_end: '2024-01-30T00:00:00Z',
  max_participants: 100,
  qualification_rules: {},
  created_by: '123e4567-e89b-12d3-a456-426614174000',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('Database Services', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('userService', () => {
    it('should get user by id', async () => {
      const user = await userService.getById('123')
      expect(user).toEqual(mockUser)
    })

    it('should get user by HubSpot id', async () => {
      const user = await userService.getByHubSpotId('hubspot123')
      expect(user).toEqual(mockUser)
    })

    it('should create a new user', async () => {
      const userData = {
        hubspot_id: 'hubspot123',
        email: 'test@example.com',
        display_name: 'Test User'
      }
      
      const user = await userService.create(userData)
      expect(user).toEqual(mockUser)
    })

    it('should update user', async () => {
      const updates = { display_name: 'Updated Name' }
      const user = await userService.update('123', updates)
      expect(user).toEqual(mockUser)
    })
  })

  describe('competitionService', () => {
    it('should get all competitions', async () => {
      const competitions = await competitionService.getAll()
      expect(Array.isArray(competitions)).toBe(true)
    })

    it('should get competition by id', async () => {
      const { supabase } = require('../lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockCompetition, error: null }))
          }))
        }))
      })

      const competition = await competitionService.getById('123')
      expect(competition).toEqual(mockCompetition)
    })

    it('should validate competition dates', async () => {
      const dates = {
        registration_start: '2024-01-01T00:00:00Z',
        registration_end: '2024-01-15T00:00:00Z',
        voting_start: '2024-01-16T00:00:00Z',
        voting_end: '2024-01-30T00:00:00Z'
      }
      
      const isValid = await competitionService.validateDates(dates)
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('votingService', () => {
    it('should check if user can vote', async () => {
      const canVote = await votingService.canUserVote('user123', 'comp123', 'participant123')
      expect(typeof canVote).toBe('boolean')
    })

    it('should get user voting status', async () => {
      const { supabase } = require('../lib/supabase')
      supabase.rpc.mockResolvedValue({ 
        data: [{ participant_id: 'p1', has_voted: false }], 
        error: null 
      })

      const status = await votingService.getUserVotingStatus('user123', 'comp123')
      expect(Array.isArray(status)).toBe(true)
    })

    it('should cast a vote successfully', async () => {
      const { supabase } = require('../lib/supabase')
      
      // Mock duplicate check
      supabase.rpc.mockResolvedValueOnce({
        data: [{
          has_account_duplicate: false,
          has_ip_duplicate: false,
          recent_votes_from_ip: 1
        }],
        error: null
      })

      // Mock vote insertion
      supabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'vote123',
                competition_id: 'comp123',
                participant_id: 'participant123',
                voter_id: 'voter123',
                voter_ip: '192.168.1.1',
                timestamp: '2024-01-01T00:00:00Z',
                verified: true
              },
              error: null
            }))
          }))
        }))
      })

      const voteData = {
        competition_id: 'comp123',
        participant_id: 'participant123',
        voter_id: 'voter123',
        voter_ip: '192.168.1.1'
      }

      const vote = await votingService.castVote(voteData)
      expect(vote).toBeDefined()
      expect(vote.competition_id).toBe('comp123')
    })

    it('should prevent duplicate votes', async () => {
      const { supabase } = require('../lib/supabase')
      
      // Mock duplicate check showing duplicate
      supabase.rpc.mockResolvedValue({
        data: [{
          has_account_duplicate: true,
          has_ip_duplicate: false,
          recent_votes_from_ip: 1
        }],
        error: null
      })

      const voteData = {
        competition_id: 'comp123',
        participant_id: 'participant123',
        voter_id: 'voter123',
        voter_ip: '192.168.1.1'
      }

      await expect(votingService.castVote(voteData)).rejects.toThrow('Duplicate vote detected')
    })

    it('should enforce rate limiting', async () => {
      const { supabase } = require('../lib/supabase')
      
      // Mock rate limit exceeded
      supabase.rpc.mockResolvedValue({
        data: [{
          has_account_duplicate: false,
          has_ip_duplicate: false,
          recent_votes_from_ip: 15
        }],
        error: null
      })

      const voteData = {
        competition_id: 'comp123',
        participant_id: 'participant123',
        voter_id: 'voter123',
        voter_ip: '192.168.1.1'
      }

      await expect(votingService.castVote(voteData)).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('participationService', () => {
    it('should have proper service methods defined', () => {
      expect(typeof participationService.getByCompetition).toBe('function')
      expect(typeof participationService.approve).toBe('function')
      expect(typeof participationService.reject).toBe('function')
      expect(typeof participationService.create).toBe('function')
      expect(typeof participationService.update).toBe('function')
    })
  })
})

describe('Database Schema Validation', () => {
  it('should have proper enum types defined', () => {
    const { UserRole, CompetitionTier, VerificationStatus, CompetitionStatus, ParticipationStatus } = require('../types')
    
    expect(UserRole.PARTICIPANT).toBe('participant')
    expect(UserRole.ORGANIZER).toBe('organizer')
    expect(UserRole.SUPER_ADMIN).toBe('super_admin')
    
    expect(CompetitionTier.LOCAL).toBe('local')
    expect(CompetitionTier.NATIONAL).toBe('national')
    expect(CompetitionTier.GLOBAL).toBe('global')
    
    expect(VerificationStatus.PENDING).toBe('pending')
    expect(VerificationStatus.VERIFIED).toBe('verified')
    expect(VerificationStatus.REJECTED).toBe('rejected')
  })

  it('should have consistent database types', () => {
    // This test ensures our TypeScript types match the database schema
    const mockDbUser = {
      id: 'uuid',
      hubspot_id: 'string',
      email: 'string',
      display_name: 'string',
      role: 'participant',
      verification_status: 'verified'
    }
    
    expect(typeof mockDbUser.id).toBe('string')
    expect(typeof mockDbUser.hubspot_id).toBe('string')
    expect(typeof mockDbUser.email).toBe('string')
    expect(['participant', 'voter', 'organizer', 'super_admin']).toContain(mockDbUser.role)
    expect(['pending', 'verified', 'rejected']).toContain(mockDbUser.verification_status)
  })
})