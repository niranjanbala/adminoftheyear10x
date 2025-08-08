/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the auth provider
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'participant',
  verification_status: 'verified'
}

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false
  })
}))

// Mock the router
const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack
  })
}))

// Mock the media upload component
jest.mock('@/components/profile/media-upload', () => ({
  MediaUpload: ({ onUpload }: { onUpload: (files: any[]) => void }) => (
    <div data-testid="media-upload">
      <button onClick={() => onUpload([])}>Upload Media</button>
    </div>
  )
}))

// Mock fetch
global.fetch = jest.fn()

describe('Participation System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('ParticipationForm', () => {
    const defaultProps = {
      competitionId: 'comp-1',
      competitionTitle: 'Test Competition'
    }

    it('renders participation form correctly', async () => {
      const { ParticipationForm } = await import('@/components/competitions/participation-form')
      render(<ParticipationForm {...defaultProps} />)
      
      expect(screen.getByText('Apply to Participate')).toBeInTheDocument()
      expect(screen.getByLabelText(/submission title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/submission description/i)).toBeInTheDocument()
      expect(screen.getByText('Submit Application')).toBeInTheDocument()
    })

    it('validates required fields', async () => {
      const { ParticipationForm } = await import('@/components/competitions/participation-form')
      render(<ParticipationForm {...defaultProps} />)
      
      const submitButton = screen.getByText('Submit Application')
      expect(submitButton).toBeDisabled()
      
      // Fill in title only
      const titleInput = screen.getByLabelText(/submission title/i)
      fireEvent.change(titleInput, { target: { value: 'Test Title' } })
      
      expect(submitButton).toBeDisabled()
      
      // Fill in description
      const descriptionInput = screen.getByLabelText(/submission description/i)
      fireEvent.change(descriptionInput, { target: { value: 'Test description that is long enough' } })
      
      expect(submitButton).not.toBeDisabled()
    })

    it('submits application successfully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'participation-1',
          status: 'pending'
        })
      })

      const onSuccess = jest.fn()
      const { ParticipationForm } = await import('@/components/competitions/participation-form')
      render(<ParticipationForm {...defaultProps} onSuccess={onSuccess} />)
      
      // Fill in form
      fireEvent.change(screen.getByLabelText(/submission title/i), {
        target: { value: 'My Awesome Submission' }
      })
      fireEvent.change(screen.getByLabelText(/submission description/i), {
        target: { value: 'This is a detailed description of my submission' }
      })
      
      // Submit form
      fireEvent.click(screen.getByText('Submit Application'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/competitions/comp-1/participants',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              submission_title: 'My Awesome Submission',
              submission_description: 'This is a detailed description of my submission',
              submission_media: [],
              portfolio_links: []
            })
          })
        )
      })
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('handles submission errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Registration is not currently open'
        })
      })

      render(<ParticipationForm {...defaultProps} />)
      
      // Fill in form
      fireEvent.change(screen.getByLabelText(/submission title/i), {
        target: { value: 'Test Title' }
      })
      fireEvent.change(screen.getByLabelText(/submission description/i), {
        target: { value: 'Test description' }
      })
      
      // Submit form
      fireEvent.click(screen.getByText('Submit Application'))
      
      await waitFor(() => {
        expect(screen.getByText('Registration is not currently open')).toBeInTheDocument()
      })
    })

    it('manages portfolio links correctly', () => {
      render(<ParticipationForm {...defaultProps} />)
      
      // Initially has one empty link field
      expect(screen.getAllByPlaceholderText(/https:\/\/example.com/)).toHaveLength(1)
      
      // Add another link
      fireEvent.click(screen.getByText('Add Another Link'))
      expect(screen.getAllByPlaceholderText(/https:\/\/example.com/)).toHaveLength(2)
      
      // Remove a link
      fireEvent.click(screen.getAllByText('Remove')[0])
      expect(screen.getAllByPlaceholderText(/https:\/\/example.com/)).toHaveLength(1)
    })
  })

  describe('ParticipantManagement', () => {
    const mockParticipants = [
      {
        id: 'part-1',
        user_id: 'user-1',
        status: 'pending',
        submission_title: 'Test Submission',
        submission_description: 'Test description',
        submission_media: [],
        vote_count: 0,
        ranking: null,
        applied_at: '2024-01-01T00:00:00Z',
        approved_at: null,
        user: {
          id: 'user-1',
          display_name: 'Test User',
          email: 'test@example.com',
          profile_picture_url: null,
          bio: 'Test bio',
          skills: ['HubSpot', 'Marketing'],
          hubspot_experience: '2 years',
          portfolio_links: []
        }
      }
    ]

    const defaultProps = {
      competitionId: 'comp-1',
      competitionTitle: 'Test Competition',
      canManage: true
    }

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockParticipants
      })
    })

    it('renders participant management interface', async () => {
      render(<ParticipantManagement {...defaultProps} />)
      
      expect(screen.getByText('Participant Management')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('Test Submission')).toBeInTheDocument()
      })
    })

    it('approves participant successfully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockParticipants
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockParticipants[0],
            status: 'approved',
            approved_at: '2024-01-01T12:00:00Z'
          })
        })

      render(<ParticipantManagement {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      // Click approve button
      fireEvent.click(screen.getByText('Approve'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/competitions/comp-1/participants/part-1',
          expect.objectContaining({
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'approved' })
          })
        )
      })
    })

    it('rejects participant successfully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockParticipants
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockParticipants[0],
            status: 'rejected'
          })
        })

      render(<ParticipantManagement {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      // Click reject button
      fireEvent.click(screen.getByText('Reject'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/competitions/comp-1/participants/part-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'rejected' })
          })
        )
      })
    })

    it('shows different tabs for different participant statuses', async () => {
      render(<ParticipantManagement {...defaultProps} />)
      
      expect(screen.getByText(/Pending \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Approved \(0\)/)).toBeInTheDocument()
      expect(screen.getByText(/Rejected \(0\)/)).toBeInTheDocument()
      expect(screen.getByText(/Withdrawn \(0\)/)).toBeInTheDocument()
    })
  })

  describe('ParticipationStatus', () => {
    const mockParticipation = {
      id: 'part-1',
      competition_id: 'comp-1',
      user_id: 'user-1',
      status: 'pending' as const,
      submission_title: 'My Submission',
      submission_description: 'My submission description',
      submission_media: [],
      vote_count: 0,
      ranking: null,
      applied_at: '2024-01-01T00:00:00Z',
      approved_at: null
    }

    const defaultProps = {
      competitionId: 'comp-1',
      competitionTitle: 'Test Competition'
    }

    it('shows participation status for pending application', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [mockParticipation]
      })

      render(<ParticipationStatus {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Your Participation Status')).toBeInTheDocument()
        expect(screen.getByText('pending')).toBeInTheDocument()
        expect(screen.getByText(/being reviewed/)).toBeInTheDocument()
      })
    })

    it('shows approved status with vote count', async () => {
      const approvedParticipation = {
        ...mockParticipation,
        status: 'approved' as const,
        approved_at: '2024-01-01T12:00:00Z',
        vote_count: 5,
        ranking: 2
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [approvedParticipation]
      })

      render(<ParticipationStatus {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('approved')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument() // vote count
        expect(screen.getByText('#2')).toBeInTheDocument() // ranking
      })
    })

    it('allows withdrawal of application', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockParticipation]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockParticipation,
            status: 'withdrawn'
          })
        })

      render(<ParticipationStatus {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Withdraw Application')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Withdraw Application'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/competitions/comp-1/participants/part-1',
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })
    })
  })

  describe('Integration Tests', () => {
    it('completes full registration workflow', async () => {
      // Mock successful application submission
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'part-1',
          status: 'pending'
        })
      })

      const onSuccess = jest.fn()
      render(
        <ParticipationForm
          competitionId="comp-1"
          competitionTitle="Test Competition"
          onSuccess={onSuccess}
        />
      )
      
      // Fill out and submit application
      fireEvent.change(screen.getByLabelText(/submission title/i), {
        target: { value: 'My Great Submission' }
      })
      fireEvent.change(screen.getByLabelText(/submission description/i), {
        target: { value: 'This is a comprehensive description of my submission' }
      })
      
      fireEvent.click(screen.getByText('Submit Application'))
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('handles registration validation errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Competition has reached maximum participant limit'
        })
      })

      render(
        <ParticipationForm
          competitionId="comp-1"
          competitionTitle="Test Competition"
        />
      )
      
      // Fill out form
      fireEvent.change(screen.getByLabelText(/submission title/i), {
        target: { value: 'Test' }
      })
      fireEvent.change(screen.getByLabelText(/submission description/i), {
        target: { value: 'Test description' }
      })
      
      fireEvent.click(screen.getByText('Submit Application'))
      
      await waitFor(() => {
        expect(screen.getByText('Competition has reached maximum participant limit')).toBeInTheDocument()
      })
    })
  })
})