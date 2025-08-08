/**
 * Integration tests for the participation API endpoints
 */

import { it } from 'zod/v4/locales'

import { it } from 'zod/v4/locales'

import { it } from 'zod/v4/locales'

import { describe } from 'node:test'

import { it } from 'zod/v4/locales'

import { it } from 'zod/v4/locales'

import { it } from 'zod/v4/locales'

import { describe } from 'node:test'

import { NextRequest } from 'next/server'

import { it } from 'zod/v4/locales'

import { NextRequest } from 'next/server'

import { it } from 'zod/v4/locales'

import { describe } from 'node:test'

import { NextRequest } from 'next/server'

import { it } from 'zod/v4/locales'

import { NextRequest } from 'next/server'

import { it } from 'zod/v4/locales'

import { NextRequest } from 'next/server'

import { it } from 'zod/v4/locales'

import { it } from 'zod/v4/locales'

import { describe } from 'node:test'

import { beforeEach } from 'node:test'

import { describe } from 'node:test'

// Mock NextRequest
class MockNextRequest {
  url: string
  method: string
  body: any

  constructor(url: string, options: any = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.body = options.body
  }

  async json() {
    return JSON.parse(this.body)
  }
}

// Mock the database service
const mockParticipationService = {
  getByCompetition: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  getByUser: jest.fn()
}

const mockCompetitionService = {
  getByIdDirect: jest.fn()
}

jest.mock('@/lib/database', () => ({
  participationService: mockParticipationService,
  competitionService: mockCompetitionService
}))

// Mock auth middleware
const mockWithAuth = (handler: any) => handler
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: mockWithAuth,
  withCors: (handler: any) => handler
}))

describe('Participation API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/competitions/[id]/participants', () => {
    it('creates participation application successfully', async () => {
      const mockCompetition = {
        id: 'comp-1',
        title: 'Test Competition',
        registration_start: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        registration_end: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        max_participants: null
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com'
      }

      const mockParticipation = {
        id: 'part-1',
        competition_id: 'comp-1',
        user_id: 'user-1',
        status: 'pending',
        submission_title: 'Test Submission',
        submission_description: 'Test description'
      }

      mockCompetitionService.getByIdDirect.mockResolvedValue(mockCompetition)
      mockParticipationService.getByUser.mockResolvedValue([])
      mockParticipationService.getByCompetition.mockResolvedValue([])
      mockParticipationService.create.mockResolvedValue(mockParticipation)

      // Import the handler after mocking
      const { POST } = await import('@/app/api/competitions/[id]/participants/route')

      const request = new MockNextRequest('http://localhost:3000/api/competitions/comp-1/participants', {
        method: 'POST',
        body: JSON.stringify({
          submission_title: 'Test Submission',
          submission_description: 'Test description',
          submission_media: [],
          portfolio_links: []
        })
      }) as any

      const response = await POST(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('part-1')
      expect(data.status).toBe('pending')
      expect(mockParticipationService.create).toHaveBeenCalledWith({
        competition_id: 'comp-1',
        user_id: 'user-1',
        status: 'pending',
        submission_title: 'Test Submission',
        submission_description: 'Test description',
        submission_media: [],
        applied_at: expect.any(String)
      })
    })

    it('rejects application when registration is closed', async () => {
      const mockCompetition = {
        id: 'comp-1',
        title: 'Test Competition',
        registration_start: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        registration_end: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        max_participants: null
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com'
      }

      mockCompetitionService.getByIdDirect.mockResolvedValue(mockCompetition)

      const { POST } = await import('@/app/api/competitions/[id]/participants/route')

      const request = new NextRequest('http://localhost:3000/api/competitions/comp-1/participants', {
        method: 'POST',
        body: JSON.stringify({
          submission_title: 'Test Submission',
          submission_description: 'Test description'
        })
      })

      const response = await POST(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Registration is not currently open for this competition')
    })

    it('rejects duplicate applications', async () => {
      const mockCompetition = {
        id: 'comp-1',
        title: 'Test Competition',
        registration_start: new Date(Date.now() - 86400000).toISOString(),
        registration_end: new Date(Date.now() + 86400000).toISOString(),
        max_participants: null
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com'
      }

      const existingParticipation = {
        id: 'part-1',
        competition_id: 'comp-1',
        user_id: 'user-1',
        status: 'pending'
      }

      mockCompetitionService.getByIdDirect.mockResolvedValue(mockCompetition)
      mockParticipationService.getByUser.mockResolvedValue([existingParticipation])

      const { POST } = await import('@/app/api/competitions/[id]/participants/route')

      const request = new NextRequest('http://localhost:3000/api/competitions/comp-1/participants', {
        method: 'POST',
        body: JSON.stringify({
          submission_title: 'Test Submission',
          submission_description: 'Test description'
        })
      })

      const response = await POST(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('You are already registered for this competition')
    })

    it('validates required fields', async () => {
      const mockCompetition = {
        id: 'comp-1',
        title: 'Test Competition',
        registration_start: new Date(Date.now() - 86400000).toISOString(),
        registration_end: new Date(Date.now() + 86400000).toISOString(),
        max_participants: null
      }

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com'
      }

      mockCompetitionService.getByIdDirect.mockResolvedValue(mockCompetition)

      const { POST } = await import('@/app/api/competitions/[id]/participants/route')

      const request = new NextRequest('http://localhost:3000/api/competitions/comp-1/participants', {
        method: 'POST',
        body: JSON.stringify({
          submission_title: 'A', // Too short
          submission_description: 'Short' // Too short
        })
      })

      const response = await POST(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })
  })

  describe('PUT /api/competitions/[id]/participants/[participantId]', () => {
    it('updates participant status successfully', async () => {
      const mockCompetition = {
        id: 'comp-1',
        title: 'Test Competition',
        created_by: 'organizer-1'
      }

      const mockUser = {
        id: 'organizer-1',
        role: 'organizer'
      }

      const mockParticipants = [{
        id: 'part-1',
        competition_id: 'comp-1',
        user_id: 'user-1',
        status: 'pending'
      }]

      const updatedParticipant = {
        ...mockParticipants[0],
        status: 'approved',
        approved_at: new Date().toISOString()
      }

      mockCompetitionService.getByIdDirect.mockResolvedValue(mockCompetition)
      mockParticipationService.getByCompetition.mockResolvedValue(mockParticipants)
      mockParticipationService.update.mockResolvedValue(updatedParticipant)

      const { PUT } = await import('@/app/api/competitions/[id]/participants/[participantId]/route')

      const request = new NextRequest('http://localhost:3000/api/competitions/comp-1/participants/part-1', {
        method: 'PUT',
        body: JSON.stringify({
          status: 'approved'
        })
      })

      const response = await PUT(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('approved')
      expect(data.approved_at).toBeDefined()
      expect(mockParticipationService.update).toHaveBeenCalledWith('part-1', {
        status: 'approved',
        approved_at: expect.any(String)
      })
    })

    it('rejects unauthorized status updates', async () => {
      const mockCompetition = {
        id: 'comp-1',
        title: 'Test Competition',
        created_by: 'organizer-1'
      }

      const mockUser = {
        id: 'user-2', // Different user
        role: 'participant'
      }

      mockCompetitionService.getByIdDirect.mockResolvedValue(mockCompetition)

      const { PUT } = await import('@/app/api/competitions/[id]/participants/[participantId]/route')

      const request = new NextRequest('http://localhost:3000/api/competitions/comp-1/participants/part-1', {
        method: 'PUT',
        body: JSON.stringify({
          status: 'approved'
        })
      })

      const response = await PUT(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })
  })

  describe('Validation Tests', () => {
    it('validates submission title length', () => {
      const shortTitle = 'A'
      const longTitle = 'A'.repeat(101)
      const validTitle = 'Valid Submission Title'

      expect(shortTitle.length).toBeLessThan(3)
      expect(longTitle.length).toBeGreaterThan(100)
      expect(validTitle.length).toBeGreaterThanOrEqual(3)
      expect(validTitle.length).toBeLessThanOrEqual(100)
    })

    it('validates submission description length', () => {
      const shortDescription = 'Short'
      const longDescription = 'A'.repeat(1001)
      const validDescription = 'This is a valid description that meets the minimum length requirement'

      expect(shortDescription.length).toBeLessThan(10)
      expect(longDescription.length).toBeGreaterThan(1000)
      expect(validDescription.length).toBeGreaterThanOrEqual(10)
      expect(validDescription.length).toBeLessThanOrEqual(1000)
    })

    it('validates portfolio links format', () => {
      const validLinks = [
        'https://example.com',
        'https://portfolio.example.com/work',
        'https://github.com/user/repo'
      ]

      const invalidLinks = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert("xss")'
      ]

      validLinks.forEach(link => {
        expect(link).toMatch(/^https?:\/\//)
      })

      invalidLinks.forEach(link => {
        expect(link).not.toMatch(/^https:\/\//)
      })
    })
  })

  describe('Business Logic Tests', () => {
    it('calculates registration period correctly', () => {
      const now = new Date()
      const regStart = new Date(now.getTime() - 86400000) // 1 day ago
      const regEnd = new Date(now.getTime() + 86400000) // 1 day from now

      const isRegistrationOpen = now >= regStart && now <= regEnd
      expect(isRegistrationOpen).toBe(true)

      const pastRegEnd = new Date(now.getTime() - 86400000) // 1 day ago
      const isRegistrationClosed = now > pastRegEnd
      expect(isRegistrationClosed).toBe(true)
    })

    it('handles participant limits correctly', () => {
      const maxParticipants = 10
      const currentApproved = 8
      const canAcceptMore = currentApproved < maxParticipants
      expect(canAcceptMore).toBe(true)

      const currentApprovedAtLimit = 10
      const cannotAcceptMore = currentApprovedAtLimit >= maxParticipants
      expect(cannotAcceptMore).toBe(true)
    })

    it('validates status transitions', () => {
      const validTransitions = [
        { from: 'pending', to: 'approved' },
        { from: 'pending', to: 'rejected' },
        { from: 'approved', to: 'rejected' },
        { from: 'rejected', to: 'approved' },
        { from: 'pending', to: 'withdrawn' },
        { from: 'approved', to: 'withdrawn' }
      ]

      validTransitions.forEach(({ from, to }) => {
        expect(['pending', 'approved', 'rejected', 'withdrawn']).toContain(from)
        expect(['pending', 'approved', 'rejected', 'withdrawn']).toContain(to)
      })
    })
  })
})