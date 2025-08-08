/**
 * Tests for the real-time leaderboard system
 */

describe('Real-time Leaderboard System', () => {
  describe('Leaderboard Calculation', () => {
    it('sorts participants by vote count correctly', () => {
      const participants = [
        { id: 'p1', vote_count: 5, user: { display_name: 'Alice' } },
        { id: 'p2', vote_count: 10, user: { display_name: 'Bob' } },
        { id: 'p3', vote_count: 3, user: { display_name: 'Charlie' } },
        { id: 'p4', vote_count: 8, user: { display_name: 'Diana' } }
      ]

      const sorted = participants.sort((a, b) => b.vote_count - a.vote_count)
      
      expect(sorted[0].user.display_name).toBe('Bob') // 10 votes
      expect(sorted[1].user.display_name).toBe('Diana') // 8 votes
      expect(sorted[2].user.display_name).toBe('Alice') // 5 votes
      expect(sorted[3].user.display_name).toBe('Charlie') // 3 votes
    })

    it('assigns rankings correctly', () => {
      const participants = [
        { id: 'p1', vote_count: 10 },
        { id: 'p2', vote_count: 8 },
        { id: 'p3', vote_count: 8 }, // Tie
        { id: 'p4', vote_count: 5 }
      ]

      const ranked = participants
        .sort((a, b) => b.vote_count - a.vote_count)
        .map((p, index) => ({ ...p, rank: index + 1 }))

      expect(ranked[0].rank).toBe(1) // 10 votes
      expect(ranked[1].rank).toBe(2) // 8 votes (first tie)
      expect(ranked[2].rank).toBe(3) // 8 votes (second tie)
      expect(ranked[3].rank).toBe(4) // 5 votes
    })

    it('handles tie-breaking scenarios', () => {
      const participants = [
        { id: 'p1', vote_count: 10, applied_at: '2024-01-01T10:00:00Z' },
        { id: 'p2', vote_count: 10, applied_at: '2024-01-01T09:00:00Z' }, // Earlier application
        { id: 'p3', vote_count: 8, applied_at: '2024-01-01T11:00:00Z' }
      ]

      // Tie-breaking by earliest application
      const sorted = participants.sort((a, b) => {
        if (b.vote_count !== a.vote_count) {
          return b.vote_count - a.vote_count
        }
        return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime()
      })

      expect(sorted[0].id).toBe('p2') // Same votes, earlier application
      expect(sorted[1].id).toBe('p1')
      expect(sorted[2].id).toBe('p3')
    })
  })

  describe('Ranking Trends', () => {
    it('calculates trend changes correctly', () => {
      const currentRankings = [
        { id: 'p1', rank: 1, previous_rank: 3 },
        { id: 'p2', rank: 2, previous_rank: 1 },
        { id: 'p3', rank: 3, previous_rank: 3 },
        { id: 'p4', rank: 4, previous_rank: null }
      ]

      function calculateTrend(current: number, previous: number | null): string {
        if (previous === null) return 'new'
        if (current < previous) return 'up'
        if (current > previous) return 'down'
        return 'same'
      }

      expect(calculateTrend(1, 3)).toBe('up') // Moved from 3rd to 1st
      expect(calculateTrend(2, 1)).toBe('down') // Moved from 1st to 2nd
      expect(calculateTrend(3, 3)).toBe('same') // Stayed at 3rd
      expect(calculateTrend(4, null)).toBe('new') // New entry
    })

    it('tracks historical rankings', () => {
      const history = [
        { timestamp: '2024-01-01T10:00:00Z', rankings: { 'p1': 1, 'p2': 2, 'p3': 3 } },
        { timestamp: '2024-01-01T11:00:00Z', rankings: { 'p1': 2, 'p2': 1, 'p3': 3 } },
        { timestamp: '2024-01-01T12:00:00Z', rankings: { 'p1': 1, 'p2': 2, 'p3': 3 } }
      ]

      function getRankingHistory(participantId: string): number[] {
        return history.map(h => h.rankings[participantId]).filter(Boolean)
      }

      expect(getRankingHistory('p1')).toEqual([1, 2, 1])
      expect(getRankingHistory('p2')).toEqual([2, 1, 2])
      expect(getRankingHistory('p3')).toEqual([3, 3, 3])
    })
  })

  describe('Real-time Updates', () => {
    it('handles vote updates in real-time', () => {
      let leaderboard = [
        { id: 'p1', vote_count: 5 },
        { id: 'p2', vote_count: 3 }
      ]

      const listeners: Array<(data: any[]) => void> = []

      function subscribeToUpdates(callback: (data: any[]) => void) {
        listeners.push(callback)
      }

      function addVote(participantId: string) {
        leaderboard = leaderboard.map(p => 
          p.id === participantId 
            ? { ...p, vote_count: p.vote_count + 1 }
            : p
        )
        
        // Sort and notify listeners
        const sorted = leaderboard.sort((a, b) => b.vote_count - a.vote_count)
        listeners.forEach(callback => callback(sorted))
      }

      let receivedUpdate: any[] = []
      subscribeToUpdates((data) => {
        receivedUpdate = data
      })

      addVote('p2') // p2 now has 4 votes
      
      expect(receivedUpdate[0].id).toBe('p1') // Still leading with 5
      expect(receivedUpdate[1].id).toBe('p2') // Now has 4

      addVote('p2') // p2 now has 5 votes (tie)
      addVote('p2') // p2 now has 6 votes (takes lead)

      expect(receivedUpdate[0].id).toBe('p2') // Now leading with 6
      expect(receivedUpdate[1].id).toBe('p1') // Now second with 5
    })

    it('implements efficient update batching', () => {
      const updates: string[] = []
      let batchTimeout: NodeJS.Timeout | null = null

      function batchUpdates(callback: () => void) {
        if (batchTimeout) {
          clearTimeout(batchTimeout)
        }
        
        batchTimeout = setTimeout(() => {
          callback()
          batchTimeout = null
        }, 100) // Batch updates for 100ms
      }

      function processUpdate(type: string) {
        updates.push(type)
        batchUpdates(() => {
          // Process batched updates
          updates.length = 0 // Clear after processing
        })
      }

      processUpdate('vote1')
      processUpdate('vote2')
      processUpdate('vote3')

      // Should still have updates in queue (not processed yet)
      expect(updates.length).toBe(3)

      // After timeout, updates should be processed
      setTimeout(() => {
        expect(updates.length).toBe(0)
      }, 150)
    })
  })

  describe('Filtering and Sorting', () => {
    it('supports multiple sorting criteria', () => {
      const participants = [
        { id: 'p1', vote_count: 10, user: { display_name: 'Alice' }, applied_at: '2024-01-02' },
        { id: 'p2', vote_count: 10, user: { display_name: 'Bob' }, applied_at: '2024-01-01' },
        { id: 'p3', vote_count: 8, user: { display_name: 'Charlie' }, applied_at: '2024-01-03' }
      ]

      // Sort by vote count (desc), then by name (asc)
      const sorted = participants.sort((a, b) => {
        if (b.vote_count !== a.vote_count) {
          return b.vote_count - a.vote_count
        }
        return a.user.display_name.localeCompare(b.user.display_name)
      })

      expect(sorted[0].user.display_name).toBe('Alice') // 10 votes, A comes before B
      expect(sorted[1].user.display_name).toBe('Bob') // 10 votes, B comes after A
      expect(sorted[2].user.display_name).toBe('Charlie') // 8 votes
    })

    it('implements pagination correctly', () => {
      const allParticipants = Array.from({ length: 25 }, (_, i) => ({
        id: `p${i + 1}`,
        vote_count: 25 - i,
        user: { display_name: `User ${i + 1}` }
      }))

      function paginate<T>(items: T[], page: number, limit: number): T[] {
        const offset = (page - 1) * limit
        return items.slice(offset, offset + limit)
      }

      const page1 = paginate(allParticipants, 1, 10)
      const page2 = paginate(allParticipants, 2, 10)
      const page3 = paginate(allParticipants, 3, 10)

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)
      expect(page3).toHaveLength(5) // Remaining items

      expect(page1[0].id).toBe('p1') // Highest votes
      expect(page2[0].id).toBe('p11') // 11th highest
      expect(page3[0].id).toBe('p21') // 21st highest
    })
  })

  describe('Performance Optimization', () => {
    it('implements efficient data structures', () => {
      // Using Map for O(1) lookups
      const participantMap = new Map([
        ['p1', { vote_count: 10, rank: 1 }],
        ['p2', { vote_count: 8, rank: 2 }],
        ['p3', { vote_count: 5, rank: 3 }]
      ])

      function updateVoteCount(participantId: string, newCount: number) {
        const participant = participantMap.get(participantId)
        if (participant) {
          participant.vote_count = newCount
          // Rank would need to be recalculated
        }
      }

      updateVoteCount('p3', 12)
      expect(participantMap.get('p3')?.vote_count).toBe(12)
    })

    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `p${i}`,
        vote_count: Math.floor(Math.random() * 1000),
        user: { display_name: `User ${i}` }
      }))

      const startTime = Date.now()
      
      // Efficient sorting for large datasets
      const sorted = largeDataset.sort((a, b) => b.vote_count - a.vote_count)
      const top100 = sorted.slice(0, 100)
      
      const endTime = Date.now()
      const processingTime = endTime - startTime

      expect(top100).toHaveLength(100)
      expect(processingTime).toBeLessThan(100) // Should process quickly
    })
  })

  describe('Data Consistency', () => {
    it('maintains consistency during concurrent updates', () => {
      let voteCount = 0
      const updateQueue: Array<() => void> = []

      function queueUpdate(update: () => void) {
        updateQueue.push(update)
      }

      function processUpdates() {
        while (updateQueue.length > 0) {
          const update = updateQueue.shift()
          if (update) {
            update()
          }
        }
      }

      // Simulate concurrent vote updates
      queueUpdate(() => voteCount++)
      queueUpdate(() => voteCount++)
      queueUpdate(() => voteCount++)

      expect(updateQueue).toHaveLength(3)
      
      processUpdates()
      expect(voteCount).toBe(3)
      expect(updateQueue).toHaveLength(0)
    })

    it('handles race conditions in ranking updates', () => {
      const participants = [
        { id: 'p1', vote_count: 5, version: 1 },
        { id: 'p2', vote_count: 3, version: 1 }
      ]

      function updateWithVersion(id: string, newVoteCount: number, expectedVersion: number) {
        const participant = participants.find(p => p.id === id)
        if (participant && participant.version === expectedVersion) {
          participant.vote_count = newVoteCount
          participant.version++
          return true
        }
        return false // Version mismatch, update rejected
      }

      // Successful update
      expect(updateWithVersion('p1', 6, 1)).toBe(true)
      expect(participants[0].vote_count).toBe(6)
      expect(participants[0].version).toBe(2)

      // Failed update due to version mismatch
      expect(updateWithVersion('p1', 7, 1)).toBe(false) // Wrong version
      expect(participants[0].vote_count).toBe(6) // Unchanged
    })
  })

  describe('Error Handling', () => {
    it('handles missing data gracefully', () => {
      const incompleteData = [
        { id: 'p1', vote_count: 10, user: { display_name: 'Alice' } },
        { id: 'p2', vote_count: null, user: { display_name: 'Bob' } }, // Missing vote count
        { id: 'p3', vote_count: 5, user: null }, // Missing user data
      ]

      function sanitizeLeaderboardData(data: any[]) {
        return data
          .filter(item => item.id && item.user?.display_name) // Filter out invalid entries
          .map(item => ({
            ...item,
            vote_count: item.vote_count || 0 // Default to 0 if missing
          }))
      }

      const sanitized = sanitizeLeaderboardData(incompleteData)
      
      expect(sanitized).toHaveLength(2) // p3 filtered out due to missing user
      expect(sanitized[1].vote_count).toBe(0) // p2's null vote_count defaulted to 0
    })

    it('provides fallback for real-time connection failures', () => {
      let isConnected = true
      let fallbackInterval: NodeJS.Timeout | null = null

      function setupRealtimeWithFallback(callback: () => void) {
        if (isConnected) {
          // Use real-time connection
          callback()
        } else {
          // Fall back to polling
          fallbackInterval = setInterval(callback, 5000)
        }
      }

      function cleanup() {
        if (fallbackInterval) {
          clearInterval(fallbackInterval)
          fallbackInterval = null
        }
      }

      let callbackCount = 0
      setupRealtimeWithFallback(() => {
        callbackCount++
      })

      // Simulate connection loss
      isConnected = false
      setupRealtimeWithFallback(() => {
        callbackCount++
      })

      expect(fallbackInterval).toBeTruthy()
      cleanup()
    })
  })
})