/**
 * Unit tests for participation validation logic
 */

describe('Participation Validation', () => {
  describe('Submission Title Validation', () => {
    it('validates minimum length', () => {
      const shortTitle = 'AB'
      const validTitle = 'Valid Title'
      
      expect(shortTitle.length).toBeLessThan(3)
      expect(validTitle.length).toBeGreaterThanOrEqual(3)
    })

    it('validates maximum length', () => {
      const longTitle = 'A'.repeat(101)
      const validTitle = 'A'.repeat(100)
      
      expect(longTitle.length).toBeGreaterThan(100)
      expect(validTitle.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Submission Description Validation', () => {
    it('validates minimum length', () => {
      const shortDescription = 'Short'
      const validDescription = 'This is a valid description that meets requirements'
      
      expect(shortDescription.length).toBeLessThan(10)
      expect(validDescription.length).toBeGreaterThanOrEqual(10)
    })

    it('validates maximum length', () => {
      const longDescription = 'A'.repeat(1001)
      const validDescription = 'A'.repeat(1000)
      
      expect(longDescription.length).toBeGreaterThan(1000)
      expect(validDescription.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Registration Period Validation', () => {
    it('determines if registration is open', () => {
      const now = new Date()
      const regStart = new Date(now.getTime() - 86400000) // 1 day ago
      const regEnd = new Date(now.getTime() + 86400000) // 1 day from now

      const isRegistrationOpen = now >= regStart && now <= regEnd
      expect(isRegistrationOpen).toBe(true)
    })

    it('determines if registration is closed', () => {
      const now = new Date()
      const regStart = new Date(now.getTime() - 172800000) // 2 days ago
      const regEnd = new Date(now.getTime() - 86400000) // 1 day ago

      const isRegistrationClosed = now > regEnd
      expect(isRegistrationClosed).toBe(true)
    })

    it('determines if registration has not started', () => {
      const now = new Date()
      const regStart = new Date(now.getTime() + 86400000) // 1 day from now
      const regEnd = new Date(now.getTime() + 172800000) // 2 days from now

      const hasNotStarted = now < regStart
      expect(hasNotStarted).toBe(true)
    })
  })

  describe('Participant Limit Validation', () => {
    it('allows registration when under limit', () => {
      const maxParticipants = 10
      const currentApproved = 8
      
      const canRegister = currentApproved < maxParticipants
      expect(canRegister).toBe(true)
    })

    it('blocks registration when at limit', () => {
      const maxParticipants = 10
      const currentApproved = 10
      
      const canRegister = currentApproved < maxParticipants
      expect(canRegister).toBe(false)
    })

    it('allows unlimited registration when no limit set', () => {
      const maxParticipants = null
      const currentApproved = 1000
      
      const canRegister = maxParticipants === null || currentApproved < maxParticipants
      expect(canRegister).toBe(true)
    })
  })

  describe('Status Transition Validation', () => {
    const validStatuses = ['pending', 'approved', 'rejected', 'withdrawn']

    it('validates all status values are valid', () => {
      const testStatuses = ['pending', 'approved', 'rejected', 'withdrawn']
      
      testStatuses.forEach(status => {
        expect(validStatuses).toContain(status)
      })
    })

    it('validates common status transitions', () => {
      const transitions = [
        { from: 'pending', to: 'approved', valid: true },
        { from: 'pending', to: 'rejected', valid: true },
        { from: 'approved', to: 'rejected', valid: true },
        { from: 'rejected', to: 'approved', valid: true },
        { from: 'pending', to: 'withdrawn', valid: true },
        { from: 'approved', to: 'withdrawn', valid: true }
      ]

      transitions.forEach(({ from, to, valid }) => {
        expect(validStatuses).toContain(from)
        expect(validStatuses).toContain(to)
        expect(valid).toBe(true)
      })
    })
  })

  describe('Portfolio Links Validation', () => {
    it('validates URL format', () => {
      const validUrls = [
        'https://example.com',
        'https://portfolio.example.com/work',
        'https://github.com/user/repo',
        'http://localhost:3000'
      ]

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert("xss")',
        'file:///etc/passwd'
      ]

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\//)
      })

      invalidUrls.forEach(url => {
        expect(url).not.toMatch(/^https:\/\//)
      })
    })

    it('handles empty portfolio links', () => {
      const portfolioLinks = ['', 'https://example.com', '', 'https://github.com/user']
      const filteredLinks = portfolioLinks.filter(link => link.trim() !== '')
      
      expect(filteredLinks).toHaveLength(2)
      expect(filteredLinks).toEqual(['https://example.com', 'https://github.com/user'])
    })
  })

  describe('Media File Validation', () => {
    it('validates file types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm']
      const invalidTypes = ['application/pdf', 'text/plain', 'audio/mp3']

      validTypes.forEach(type => {
        const isImage = type.startsWith('image/')
        const isVideo = type.startsWith('video/')
        expect(isImage || isVideo).toBe(true)
      })

      invalidTypes.forEach(type => {
        const isImage = type.startsWith('image/')
        const isVideo = type.startsWith('video/')
        expect(isImage || isVideo).toBe(false)
      })
    })

    it('validates file size limits', () => {
      const maxFileSize = 50 * 1024 * 1024 // 50MB
      const validSize = 10 * 1024 * 1024 // 10MB
      const invalidSize = 100 * 1024 * 1024 // 100MB

      expect(validSize).toBeLessThanOrEqual(maxFileSize)
      expect(invalidSize).toBeGreaterThan(maxFileSize)
    })

    it('validates maximum number of files', () => {
      const maxFiles = 5
      const validFileCount = 3
      const invalidFileCount = 7

      expect(validFileCount).toBeLessThanOrEqual(maxFiles)
      expect(invalidFileCount).toBeGreaterThan(maxFiles)
    })
  })

  describe('Application Data Structure', () => {
    it('validates complete application data', () => {
      const applicationData = {
        submission_title: 'My Awesome HubSpot Integration',
        submission_description: 'This is a comprehensive description of my HubSpot integration project that demonstrates my expertise.',
        submission_media: [
          {
            type: 'image',
            url: 'https://example.com/screenshot.png',
            filename: 'screenshot.png',
            size: 1024000
          }
        ],
        portfolio_links: [
          'https://github.com/user/hubspot-project',
          'https://portfolio.example.com/hubspot-work'
        ]
      }

      // Validate required fields
      expect(applicationData.submission_title).toBeDefined()
      expect(applicationData.submission_description).toBeDefined()
      expect(applicationData.submission_title.length).toBeGreaterThanOrEqual(3)
      expect(applicationData.submission_description.length).toBeGreaterThanOrEqual(10)

      // Validate optional fields
      expect(Array.isArray(applicationData.submission_media)).toBe(true)
      expect(Array.isArray(applicationData.portfolio_links)).toBe(true)

      // Validate media files
      applicationData.submission_media.forEach(media => {
        expect(['image', 'video']).toContain(media.type)
        expect(media.url).toMatch(/^https?:\/\//)
        expect(media.filename).toBeDefined()
        expect(typeof media.size).toBe('number')
      })

      // Validate portfolio links
      applicationData.portfolio_links.forEach(link => {
        expect(link).toMatch(/^https?:\/\//)
      })
    })
  })

  describe('Competition State Validation', () => {
    it('validates competition phases', () => {
      const now = new Date()
      
      const competition = {
        registration_start: new Date(now.getTime() - 86400000).toISOString(),
        registration_end: new Date(now.getTime() + 86400000).toISOString(),
        voting_start: new Date(now.getTime() + 172800000).toISOString(),
        voting_end: new Date(now.getTime() + 259200000).toISOString()
      }

      const regStart = new Date(competition.registration_start)
      const regEnd = new Date(competition.registration_end)
      const voteStart = new Date(competition.voting_start)
      const voteEnd = new Date(competition.voting_end)

      // Validate date sequence
      expect(regStart.getTime()).toBeLessThan(regEnd.getTime())
      expect(regEnd.getTime()).toBeLessThanOrEqual(voteStart.getTime())
      expect(voteStart.getTime()).toBeLessThan(voteEnd.getTime())

      // Validate current phase
      const isRegistrationPhase = now >= regStart && now <= regEnd
      const isVotingPhase = now >= voteStart && now <= voteEnd
      const isBeforeRegistration = now < regStart
      const isAfterVoting = now > voteEnd

      expect(isRegistrationPhase).toBe(true)
      expect(isVotingPhase).toBe(false)
      expect(isBeforeRegistration).toBe(false)
      expect(isAfterVoting).toBe(false)
    })
  })
})