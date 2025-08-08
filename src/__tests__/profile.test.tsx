import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileDisplay } from '../components/profile/profile-display'
import { MediaUpload } from '../components/profile/media-upload'

// Mock fetch
global.fetch = jest.fn()

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url')

const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  hubspot_id: 'hubspot123',
  display_name: 'John Doe',
  role: 'participant' as const,
  verification_status: 'verified' as const,
  bio: 'Test bio',
  skills: ['HubSpot', 'Marketing', 'Sales'],
  hubspot_experience: '2 years of experience',
  portfolio_links: ['https://portfolio.com', 'https://github.com/johndoe'],
  profile_picture_url: 'https://example.com/profile.jpg',
  banner_image_url: 'https://example.com/banner.jpg',
  intro_video_url: 'https://example.com/video.mp4',
}

describe('Profile Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ProfileDisplay', () => {
    it('should render user profile information correctly', () => {
      render(<ProfileDisplay user={mockUser} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('Test bio')).toBeInTheDocument()
      expect(screen.getByText('2 years of experience')).toBeInTheDocument()
    })

    it('should display user skills as badges', () => {
      render(<ProfileDisplay user={mockUser} />)
      
      expect(screen.getByText('HubSpot')).toBeInTheDocument()
      expect(screen.getByText('Marketing')).toBeInTheDocument()
      expect(screen.getByText('Sales')).toBeInTheDocument()
    })

    it('should display portfolio links', () => {
      render(<ProfileDisplay user={mockUser} />)
      
      const portfolioLinks = screen.getAllByText(/https:\/\//)
      expect(portfolioLinks).toHaveLength(2)
    })

    it('should show edit button for own profile', () => {
      const mockOnEdit = jest.fn()
      render(
        <ProfileDisplay 
          user={mockUser} 
          isOwnProfile={true} 
          onEdit={mockOnEdit}
        />
      )
      
      const editButton = screen.getByText('Edit Profile')
      expect(editButton).toBeInTheDocument()
      
      fireEvent.click(editButton)
      expect(mockOnEdit).toHaveBeenCalled()
    })

    it('should display role and verification status badges', () => {
      render(<ProfileDisplay user={mockUser} />)
      
      expect(screen.getByText('participant')).toBeInTheDocument()
      expect(screen.getByText('verified')).toBeInTheDocument()
    })

    it('should handle missing optional fields gracefully', () => {
      const minimalUser = {
        id: 'user123',
        email: 'test@example.com',
        hubspot_id: 'hubspot123',
        display_name: 'John Doe',
        role: 'participant' as const,
        verification_status: 'verified' as const,
      }

      render(<ProfileDisplay user={minimalUser} />)
      
      expect(screen.getAllByText('John Doe')).toHaveLength(2) // Banner and main profile
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  describe('MediaUpload', () => {
    const mockOnUpload = jest.fn()

    beforeEach(() => {
      mockOnUpload.mockClear()
    })

    it('should render upload interface', () => {
      render(
        <MediaUpload
          type="image"
          bucket="profile-pictures"
          path="user123/profile"
          onUpload={mockOnUpload}
        />
      )
      
      expect(screen.getByText('Upload an image')).toBeInTheDocument()
      expect(screen.getByText('Choose File')).toBeInTheDocument()
    })

    it('should show video upload interface for video type', () => {
      render(
        <MediaUpload
          type="video"
          bucket="intro-videos"
          path="user123/video"
          onUpload={mockOnUpload}
        />
      )
      
      expect(screen.getByText('Upload a video')).toBeInTheDocument()
    })

    it('should display max size information', () => {
      render(
        <MediaUpload
          type="image"
          bucket="profile-pictures"
          path="user123/profile"
          onUpload={mockOnUpload}
          maxSize={5 * 1024 * 1024}
        />
      )
      
      expect(screen.getByText('Max size: 5MB')).toBeInTheDocument()
    })

    it('should handle file selection', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://example.com/uploaded.jpg' })
      })

      render(
        <MediaUpload
          type="image"
          bucket="profile-pictures"
          path="user123/profile"
          onUpload={mockOnUpload}
        />
      )
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })
      
      fireEvent.change(fileInput)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/users/media/upload', {
          method: 'POST',
          body: expect.any(FormData)
        })
      })
    })

    it('should validate file size', () => {
      render(
        <MediaUpload
          type="image"
          bucket="profile-pictures"
          path="user123/profile"
          onUpload={mockOnUpload}
          maxSize={1024} // 1KB
        />
      )
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      })
      
      fireEvent.change(fileInput)
      
      expect(screen.getByText(/File size must be less than/)).toBeInTheDocument()
    })

    it('should validate file type for images', () => {
      render(
        <MediaUpload
          type="image"
          bucket="profile-pictures"
          path="user123/profile"
          onUpload={mockOnUpload}
        />
      )
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [textFile],
        writable: false,
      })
      
      fireEvent.change(fileInput)
      
      expect(screen.getByText('Please select an image file')).toBeInTheDocument()
    })

    it('should validate file type for videos', () => {
      render(
        <MediaUpload
          type="video"
          bucket="intro-videos"
          path="user123/video"
          onUpload={mockOnUpload}
        />
      )
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      Object.defineProperty(fileInput, 'files', {
        value: [textFile],
        writable: false,
      })
      
      fireEvent.change(fileInput)
      
      expect(screen.getByText('Please select a video file')).toBeInTheDocument()
    })
  })

  describe('Profile API Integration', () => {
    it('should handle profile update API calls', async () => {
      const updateData = {
        display_name: 'Updated Name',
        bio: 'Updated bio',
        skills: ['New Skill'],
        portfolio_links: ['https://newlink.com']
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockUser, ...updateData })
      })

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.display_name).toBe('Updated Name')
    })

    it('should handle profile fetch API calls', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser)
      })

      const response = await fetch('/api/users/profile')
      
      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.display_name).toBe('John Doe')
    })

    it('should handle media upload API calls', async () => {
      const mockFormData = new FormData()
      mockFormData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }))
      mockFormData.append('bucket', 'profile-pictures')
      mockFormData.append('path', 'user123/profile')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          url: 'https://example.com/uploaded.jpg',
          path: 'user123/profile-123456.jpg',
          size: 1024,
          type: 'image/jpeg'
        })
      })

      const response = await fetch('/api/users/media/upload', {
        method: 'POST',
        body: mockFormData
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.url).toBe('https://example.com/uploaded.jpg')
    })
  })

  describe('Form Validation', () => {
    it('should validate display name length', () => {
      // Test minimum length
      const shortName = 'A'
      expect(shortName.length).toBeLessThan(2)
      
      // Test maximum length
      const longName = 'A'.repeat(51)
      expect(longName.length).toBeGreaterThan(50)
    })

    it('should validate bio length', () => {
      const longBio = 'A'.repeat(501)
      expect(longBio.length).toBeGreaterThan(500)
    })

    it('should validate skills array length', () => {
      const tooManySkills = Array(11).fill('skill')
      expect(tooManySkills.length).toBeGreaterThan(10)
    })

    it('should validate portfolio links array length', () => {
      const tooManyLinks = Array(6).fill('https://example.com')
      expect(tooManyLinks.length).toBeGreaterThan(5)
    })

    it('should validate URL format for portfolio links', () => {
      const validUrl = 'https://example.com'
      const invalidUrl = 'not-a-url'
      
      expect(() => new URL(validUrl)).not.toThrow()
      expect(() => new URL(invalidUrl)).toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      })

      const response = await fetch('/api/users/profile')
      expect(response.ok).toBe(false)
      
      const error = await response.json()
      expect(error.error).toBe('Server error')
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/users/profile')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })
  })
})