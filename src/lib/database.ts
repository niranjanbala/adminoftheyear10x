import { supabase } from './supabase'
import type { Database } from './supabase'

type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type Competition = Tables['competitions']['Row']
type Participation = Tables['participations']['Row']
type Vote = Tables['votes']['Row']

// User operations
export const userService = {
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async getByHubSpotId(hubspotId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('hubspot_id', hubspotId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(userData: Tables['users']['Insert']): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Tables['users']['Update']): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getVerifiedUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_status', 'verified')
    
    if (error) throw error
    return data
  }
}

// Competition operations
export const competitionService = {
  async getAll(filters?: {
    tier?: string
    country?: string
    status?: string
  }): Promise<Competition[]> {
    let query = supabase.from('competitions').select('*')
    
    if (filters?.tier) query = query.eq('tier', filters.tier)
    if (filters?.country) query = query.eq('country', filters.country)
    if (filters?.status) query = query.eq('status', filters.status)
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getById(id: string): Promise<Competition | null> {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(competitionData: Tables['competitions']['Insert']): Promise<Competition> {
    const { data, error } = await supabase
      .from('competitions')
      .insert(competitionData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Tables['competitions']['Update']): Promise<Competition> {
    const { data, error } = await supabase
      .from('competitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getLeaderboard(competitionId: string) {
    const { data, error } = await supabase
      .rpc('get_competition_leaderboard', { comp_id: competitionId })
    
    if (error) throw error
    return data
  },

  async getStats(competitionId: string) {
    const { data, error } = await supabase
      .rpc('get_competition_stats', { comp_id: competitionId })
    
    if (error) throw error
    return data[0]
  },

  async validateDates(dates: {
    registration_start: string
    registration_end: string
    voting_start: string
    voting_end: string
  }): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('validate_competition_dates', {
        reg_start: dates.registration_start,
        reg_end: dates.registration_end,
        vote_start: dates.voting_start,
        vote_end: dates.voting_end
      })
    
    if (error) throw error
    return data
  }
}

// Participation operations
export const participationService = {
  async getByCompetition(competitionId: string): Promise<Participation[]> {
    const { data, error } = await supabase
      .from('participations')
      .select(`
        *,
        user:users(*)
      `)
      .eq('competition_id', competitionId)
      .order('vote_count', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getByUser(userId: string): Promise<Participation[]> {
    const { data, error } = await supabase
      .from('participations')
      .select(`
        *,
        competition:competitions(*)
      `)
      .eq('user_id', userId)
      .order('applied_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async create(participationData: Tables['participations']['Insert']): Promise<Participation> {
    const { data, error } = await supabase
      .from('participations')
      .insert(participationData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Tables['participations']['Update']): Promise<Participation> {
    const { data, error } = await supabase
      .from('participations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async approve(id: string): Promise<Participation> {
    return this.update(id, { 
      status: 'approved', 
      approved_at: new Date().toISOString() 
    })
  },

  async reject(id: string): Promise<Participation> {
    return this.update(id, { status: 'rejected' })
  }
}

// Voting operations
export const votingService = {
  async canUserVote(userId: string, competitionId: string, participantId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('can_user_vote', {
        user_id: userId,
        comp_id: competitionId,
        participant_id: participantId
      })
    
    if (error) throw error
    return data
  },

  async getUserVotingStatus(userId: string, competitionId: string) {
    const { data, error } = await supabase
      .rpc('get_user_voting_status', {
        user_id: userId,
        comp_id: competitionId
      })
    
    if (error) throw error
    return data
  },

  async castVote(voteData: Tables['votes']['Insert']): Promise<Vote> {
    // First check for duplicates
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .rpc('check_duplicate_vote_attempt', {
        comp_id: voteData.competition_id,
        participant_id: voteData.participant_id,
        voter_id: voteData.voter_id,
        voter_ip: voteData.voter_ip
      })
    
    if (duplicateError) throw duplicateError
    
    const check = duplicateCheck[0]
    if (check.has_account_duplicate || check.has_ip_duplicate) {
      throw new Error('Duplicate vote detected')
    }
    
    if (check.recent_votes_from_ip > 10) {
      throw new Error('Rate limit exceeded')
    }
    
    // Cast the vote
    const { data, error } = await supabase
      .from('votes')
      .insert(voteData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getVotesByCompetition(competitionId: string): Promise<Vote[]> {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('competition_id', competitionId)
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getTrendingParticipants(competitionId: string, hoursBack: number = 24) {
    const { data, error } = await supabase
      .rpc('get_trending_participants', {
        comp_id: competitionId,
        hours_back: hoursBack
      })
    
    if (error) throw error
    return data
  }
}

// Storage operations
export const storageService = {
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: { cacheControl?: string; upsert?: boolean }
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options)
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    return urlData.publicUrl
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  }
}

// Real-time subscriptions
export const realtimeService = {
  subscribeToLeaderboard(
    competitionId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`leaderboard:${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participations',
          filter: `competition_id=eq.${competitionId}`
        },
        callback
      )
      .subscribe()
  },

  subscribeToVotes(
    competitionId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`votes:${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `competition_id=eq.${competitionId}`
        },
        callback
      )
      .subscribe()
  },

  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription)
  }
}