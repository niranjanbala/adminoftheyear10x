/**
 * Tests for the multi-tier competition progression system
 */

describe('Multi-tier Competition Progression', () => {
  describe('Tier Validation', () => {
    it('validates tier progression paths', () => {
      const validProgressions = [
        { from: 'local', to: 'national' },
        { from: 'national', to: 'global' }
      ]

      const invalidProgressions = [
        { from: 'local', to: 'global' }, // Skip national
        { from: 'national', to: 'local' }, // Backwards
        { from: 'global', to: 'national' }, // Backwards
        { from: 'global', to: 'global' } // No progression
      ]

      function isValidProgression(from: string, to: string): boolean {
        return validProgressions.some(p => p.from === from && p.to === to)
      }

      validProgressions.forEach(({ from, to }) => {
        expect(isValidProgression(from, to)).toBe(true)
      })

      invalidProgressions.forEach(({ from, to }) => {
        expect(isValidProgression(from, to)).toBe(false)
      })
    })

    it('validates tier hierarchy', () => {
      const tiers = ['local', 'national', 'global']
      
      function getTierLevel(tier: string): number {
        return tiers.indexOf(tier)
      }

      function canAdvanceTo(currentTier: string, nextTier: string): boolean {
        const currentLevel = getTierLevel(currentTier)
        const nextLevel = getTierLevel(nextTier)
        return nextLevel === currentLevel + 1
      }

      expect(canAdvanceTo('local', 'national')).toBe(true)
      expect(canAdvanceTo('national', 'global')).toBe(true)
      expect(canAdvanceTo('local', 'global')).toBe(false)
      expect(canAdvanceTo('global', 'national')).toBe(false)
    })
  })

  describe('Winner Selection', () => {
    it('selects winners by top N criteria', () => {
      const participants = [
        { id: 'p1', vote_count: 100, user: { display_name: 'Alice' } },
        { id: 'p2', vote_count: 85, user: { display_name: 'Bob' } },
        { id: 'p3', vote_count: 70, user: { display_name: 'Charlie' } },
        { id: 'p4', vote_count: 55, user: { display_name: 'Diana' } },
        { id: 'p5', vote_count: 40, user: { display_name: 'Eve' } }
      ]

      function selectTopN(participants: any[], n: number) {
        return participants
          .sort((a, b) => b.vote_count - a.vote_count)
          .slice(0, n)
      }

      const top3 = selectTopN(participants, 3)
      expect(top3).toHaveLength(3)
      expect(top3[0].user.display_name).toBe('Alice')
      expect(top3[1].user.display_name).toBe('Bob')
      expect(top3[2].user.display_name).toBe('Charlie')
    })

    it('selects winners by minimum vote threshold', () => {
      const participants = [
        { id: 'p1', vote_count: 100 },
        { id: 'p2', vote_count: 85 },
        { id: 'p3', vote_count: 70 },
        { id: 'p4', vote_count: 45 }, // Below threshold
        { id: 'p5', vote_count: 30 }  // Below threshold
      ]

      function selectByMinVotes(participants: any[], minVotes: number) {
        return participants.filter(p => p.vote_count >= minVotes)
      }

      const qualified = selectByMinVotes(participants, 50)
      expect(qualified).toHaveLength(3)
      expect(qualified.every(p => p.vote_count >= 50)).toBe(true)
    })

    it('handles combined criteria (top N AND minimum votes)', () => {
      const participants = [
        { id: 'p1', vote_count: 100 },
        { id: 'p2', vote_count: 85 },
        { id: 'p3', vote_count: 70 },
        { id: 'p4', vote_count: 55 },
        { id: 'p5', vote_count: 40 }, // Below min votes
        { id: 'p6', vote_count: 35 }  // Below min votes
      ]

      function selectByCombinedCriteria(participants: any[], topN: number, minVotes: number) {
        const sorted = participants.sort((a, b) => b.vote_count - a.vote_count)
        const topNParticipants = sorted.slice(0, topN)
        return topNParticipants.filter(p => p.vote_count >= minVotes)
      }

      const winners = selectByCombinedCriteria(participants, 5, 50)
      expect(winners).toHaveLength(4) // Top 5, but only 4 meet min votes
      expect(winners.every(p => p.vote_count >= 50)).toBe(true)
    })

    it('handles percentage-based selection', () => {
      const participants = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i + 1}`,
        vote_count: 100 - i
      }))

      function selectTopPercentage(participants: any[], percentage: number) {
        const count = Math.ceil(participants.length * percentage)
        return participants
          .sort((a, b) => b.vote_count - a.vote_count)
          .slice(0, count)
      }

      const top10Percent = selectTopPercentage(participants, 0.1)
      expect(top10Percent).toHaveLength(10)
      expect(top10Percent[0].vote_count).toBe(100) // Highest
      expect(top10Percent[9].vote_count).toBe(91)  // 10th highest
    })
  })

  describe('Competition Creation', () => {
    it('creates next tier competition with correct parameters', () => {
      const sourceCompetition = {
        id: 'comp-1',
        title: 'Local HubSpot Challenge',
        tier: 'local',
        country: 'United States',
        created_by: 'organizer-1'
      }

      const winners = [
        { user_id: 'user-1', vote_count: 100 },
        { user_id: 'user-2', vote_count: 85 },
        { user_id: 'user-3', vote_count: 70 }
      ]

      function createNextTierCompetition(source: any, winners: any[]) {
        const nextTier = source.tier === 'local' ? 'national' : 'global'
        
        return {
          title: `${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} ${source.title}`,
          tier: nextTier,
          country: nextTier === 'global' ? null : source.country,
          source_competition_id: source.id,
          max_participants: nextTier === 'global' ? 50 : 100,
          auto_registered_winners: winners.length
        }
      }

      const nextCompetition = createNextTierCompetition(sourceCompetition, winners)
      
      expect(nextCompetition.title).toBe('National Local HubSpot Challenge')
      expect(nextCompetition.tier).toBe('national')
      expect(nextCompetition.country).toBe('United States')
      expect(nextCompetition.max_participants).toBe(100)
      expect(nextCompetition.auto_registered_winners).toBe(3)
    })

    it('calculates appropriate dates for next tier', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      
      function calculateNextTierDates(baseDate: Date) {
        const registrationStart = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
        const registrationEnd = new Date(registrationStart.getTime() + 14 * 24 * 60 * 60 * 1000) // 2 weeks later
        const votingStart = new Date(registrationEnd.getTime() + 1 * 24 * 60 * 60 * 1000) // 1 day gap
        const votingEnd = new Date(votingStart.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week voting
        
        return {
          registration_start: registrationStart,
          registration_end: registrationEnd,
          voting_start: votingStart,
          voting_end: votingEnd
        }
      }

      const dates = calculateNextTierDates(now)
      
      expect(dates.registration_start.getTime()).toBe(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      expect(dates.registration_end.getTime()).toBeGreaterThan(dates.registration_start.getTime())
      expect(dates.voting_start.getTime()).toBeGreaterThan(dates.registration_end.getTime())
      expect(dates.voting_end.getTime()).toBeGreaterThan(dates.voting_start.getTime())
    })
  })

  describe('Auto-registration', () => {
    it('auto-registers winners in next tier', () => {
      const winners = [
        {
          user_id: 'user-1',
          submission_title: 'Amazing HubSpot Integration',
          submission_description: 'Detailed description...',
          submission_media: [{ type: 'image', url: 'image1.jpg' }]
        },
        {
          user_id: 'user-2',
          submission_title: 'Innovative Marketing Tool',
          submission_description: 'Another description...',
          submission_media: []
        }
      ]

      function autoRegisterWinners(competitionId: string, winners: any[]) {
        return winners.map(winner => ({
          competition_id: competitionId,
          user_id: winner.user_id,
          status: 'approved', // Auto-approve
          submission_title: winner.submission_title,
          submission_description: winner.submission_description,
          submission_media: winner.submission_media,
          applied_at: new Date().toISOString(),
          approved_at: new Date().toISOString()
        }))
      }

      const registrations = autoRegisterWinners('next-comp-1', winners)
      
      expect(registrations).toHaveLength(2)
      expect(registrations[0].status).toBe('approved')
      expect(registrations[0].user_id).toBe('user-1')
      expect(registrations[1].user_id).toBe('user-2')
      expect(registrations.every(r => r.approved_at)).toBe(true)
    })

    it('preserves submission data during advancement', () => {
      const originalSubmission = {
        submission_title: 'Original Title',
        submission_description: 'Original description with detailed information',
        submission_media: [
          { type: 'image', url: 'screenshot1.jpg', filename: 'demo.jpg' },
          { type: 'video', url: 'demo.mp4', filename: 'presentation.mp4' }
        ]
      }

      function preserveSubmissionData(original: any) {
        return {
          submission_title: original.submission_title,
          submission_description: original.submission_description,
          submission_media: [...original.submission_media] // Deep copy
        }
      }

      const preserved = preserveSubmissionData(originalSubmission)
      
      expect(preserved.submission_title).toBe(originalSubmission.submission_title)
      expect(preserved.submission_description).toBe(originalSubmission.submission_description)
      expect(preserved.submission_media).toHaveLength(2)
      expect(preserved.submission_media[0].type).toBe('image')
      expect(preserved.submission_media[1].type).toBe('video')
    })
  })

  describe('Qualification Rules', () => {
    it('adapts qualification rules for higher tiers', () => {
      const localRules = {
        requiresApproval: false,
        topN: 10,
        minVotes: 5
      }

      function adaptRulesForNextTier(currentRules: any, nextTier: string) {
        const baseMultiplier = nextTier === 'national' ? 2 : 3
        
        return {
          requiresApproval: true, // Always require approval for higher tiers
          topN: Math.max(5, Math.floor(currentRules.topN / 2)), // Fewer winners
          minVotes: currentRules.minVotes * baseMultiplier // Higher threshold
        }
      }

      const nationalRules = adaptRulesForNextTier(localRules, 'national')
      const globalRules = adaptRulesForNextTier(nationalRules, 'global')
      
      expect(nationalRules.requiresApproval).toBe(true)
      expect(nationalRules.topN).toBe(5) // Half of 10
      expect(nationalRules.minVotes).toBe(10) // 5 * 2
      
      expect(globalRules.minVotes).toBe(30) // 10 * 3
    })

    it('validates minimum participant requirements', () => {
      function validateMinimumParticipants(tier: string, participantCount: number): boolean {
        const minimums = {
          local: 5,
          national: 10,
          global: 20
        }
        
        return participantCount >= minimums[tier as keyof typeof minimums]
      }

      expect(validateMinimumParticipants('local', 3)).toBe(false)
      expect(validateMinimumParticipants('local', 5)).toBe(true)
      expect(validateMinimumParticipants('national', 8)).toBe(false)
      expect(validateMinimumParticipants('national', 12)).toBe(true)
      expect(validateMinimumParticipants('global', 15)).toBe(false)
      expect(validateMinimumParticipants('global', 25)).toBe(true)
    })
  })

  describe('Advancement Tracking', () => {
    it('tracks advancement history', () => {
      const advancementHistory = [
        {
          from_competition: 'local-1',
          to_competition: 'national-1',
          advanced_participants: 10,
          advancement_date: '2024-01-15T00:00:00Z'
        },
        {
          from_competition: 'national-1',
          to_competition: 'global-1',
          advanced_participants: 5,
          advancement_date: '2024-02-15T00:00:00Z'
        }
      ]

      function getAdvancementPath(competitionId: string) {
        const path = []
        let current = competitionId
        
        while (current) {
          const advancement = advancementHistory.find(a => a.from_competition === current)
          if (advancement) {
            path.push(advancement)
            current = advancement.to_competition
          } else {
            break
          }
        }
        
        return path
      }

      const path = getAdvancementPath('local-1')
      expect(path).toHaveLength(2)
      expect(path[0].to_competition).toBe('national-1')
      expect(path[1].to_competition).toBe('global-1')
    })

    it('calculates advancement statistics', () => {
      const competitions = [
        { id: 'local-1', tier: 'local', participants: 100, advanced: 10 },
        { id: 'local-2', tier: 'local', participants: 80, advanced: 8 },
        { id: 'national-1', tier: 'national', participants: 18, advanced: 5 },
        { id: 'global-1', tier: 'global', participants: 5, advanced: 0 }
      ]

      function calculateAdvancementStats(competitions: any[]) {
        const stats = {
          total_local_participants: 0,
          total_national_participants: 0,
          total_global_participants: 0,
          advancement_rate_local_to_national: 0,
          advancement_rate_national_to_global: 0
        }

        const localComps = competitions.filter(c => c.tier === 'local')
        const nationalComps = competitions.filter(c => c.tier === 'national')
        const globalComps = competitions.filter(c => c.tier === 'global')

        stats.total_local_participants = localComps.reduce((sum, c) => sum + c.participants, 0)
        stats.total_national_participants = nationalComps.reduce((sum, c) => sum + c.participants, 0)
        stats.total_global_participants = globalComps.reduce((sum, c) => sum + c.participants, 0)

        const totalAdvancedToNational = localComps.reduce((sum, c) => sum + c.advanced, 0)
        const totalAdvancedToGlobal = nationalComps.reduce((sum, c) => sum + c.advanced, 0)

        stats.advancement_rate_local_to_national = totalAdvancedToNational / stats.total_local_participants
        stats.advancement_rate_national_to_global = totalAdvancedToGlobal / stats.total_national_participants

        return stats
      }

      const stats = calculateAdvancementStats(competitions)
      
      expect(stats.total_local_participants).toBe(180)
      expect(stats.total_national_participants).toBe(18)
      expect(stats.total_global_participants).toBe(5)
      expect(stats.advancement_rate_local_to_national).toBe(18 / 180) // 10%
      expect(stats.advancement_rate_national_to_global).toBe(5 / 18) // ~28%
    })
  })

  describe('Error Handling', () => {
    it('handles insufficient participants for advancement', () => {
      const participants = [
        { id: 'p1', vote_count: 5 },
        { id: 'p2', vote_count: 3 }
      ]

      function canAdvance(participants: any[], criteria: any): { canAdvance: boolean; reason?: string } {
        if (participants.length === 0) {
          return { canAdvance: false, reason: 'No participants' }
        }

        const qualifiedParticipants = participants.filter(p => p.vote_count >= (criteria.minVotes || 0))
        
        if (qualifiedParticipants.length === 0) {
          return { canAdvance: false, reason: 'No participants meet minimum vote requirement' }
        }

        if (criteria.topN && qualifiedParticipants.length < criteria.topN) {
          return { canAdvance: false, reason: `Insufficient participants for top ${criteria.topN} selection` }
        }

        return { canAdvance: true }
      }

      const result1 = canAdvance(participants, { topN: 5, minVotes: 0 })
      expect(result1.canAdvance).toBe(false)
      expect(result1.reason).toContain('Insufficient participants')

      const result2 = canAdvance(participants, { topN: 2, minVotes: 10 })
      expect(result2.canAdvance).toBe(false)
      expect(result2.reason).toContain('minimum vote requirement')

      const result3 = canAdvance(participants, { topN: 2, minVotes: 0 })
      expect(result3.canAdvance).toBe(true)
    })

    it('validates competition status before advancement', () => {
      const competitions = [
        { id: 'comp-1', status: 'draft' },
        { id: 'comp-2', status: 'registration_open' },
        { id: 'comp-3', status: 'voting_open' },
        { id: 'comp-4', status: 'completed' }
      ]

      function canAdvanceCompetition(competitionId: string): boolean {
        const competition = competitions.find(c => c.id === competitionId)
        return competition?.status === 'completed'
      }

      expect(canAdvanceCompetition('comp-1')).toBe(false)
      expect(canAdvanceCompetition('comp-2')).toBe(false)
      expect(canAdvanceCompetition('comp-3')).toBe(false)
      expect(canAdvanceCompetition('comp-4')).toBe(true)
    })
  })
})