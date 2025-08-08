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
  // Client-side methods (for frontend components)
  async getAll(filters?: {
    tier?: string
    country?: string
    status?: string
  }): Promise<Competition[]> {
    const params = new URLSearchParams()
    if (filters?.tier) params.append('tier', filters.tier)
    if (filters?.country) params.append('country', filters.country)
    if (filters?.status) params.append('status', filters.status)

    const response = await fetch(`/api/competitions?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch competitions')
    }
    return response.json()
  },

  async getById(id: string): Promise<Competition | null> {
    const response = await fetch(`/api/competitions/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch competition')
    }
    return response.json()
  },

  async create(competitionData: any): Promise<Competition> {
    const response = await fetch('/api/competitions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(competitionData),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create competition')
    }
    
    return response.json()
  },

  async update(id: string, updates: any): Promise<Competition> {
    const response = await fetch(`/api/competitions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update competition')
    }
    
    return response.json()
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/competitions/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete competition')
    }
  },

  // Server-side methods (for API routes)
  async getAllDirect(filters?: {
    tier?: string
    country?: string
    status?: string
  }): Promise<Competition[]> {
    let query = supabase
      .from('competitions')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.tier) {
      query = query.eq('tier', filters.tier)
    }
    if (filters?.country) {
      query = query.eq('country', filters.country)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getByIdDirect(id: string): Promise<Competition | null> {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async createDirect(competitionData: Tables['competitions']['Insert']): Promise<Competition> {
    const { data, error } = await supabase
      .from('competitions')
      .insert(competitionData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateDirect(id: string, updates: Tables['competitions']['Update']): Promise<Competition> {
    const { data, error } = await supabase
      .from('competitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteDirect(id: string): Promise<void> {
    const { error } = await supabase
      .from('competitions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async updateStatus(id: string, status: string): Promise<Competition> {
    return this.updateDirect(id, { 
      status: status as any,
      updated_at: new Date().toISOString()
    })
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
  // Client-side methods (for frontend components)
  async apply(competitionId: string, applicationData: any): Promise<Participation> {
    const response = await fetch(`/api/competitions/${competitionId}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to submit application')
    }
    
    return response.json()
  },

  async updateStatus(competitionId: string, participantId: string, status: string): Promise<Participation> {
    const response = await fetch(`/api/competitions/${competitionId}/participants/${participantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update participant status')
    }
    
    return response.json()
  },

  async withdraw(competitionId: string, participantId: string): Promise<Participation> {
    const response = await fetch(`/api/competitions/${competitionId}/participants/${participantId}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to withdraw from competition')
    }
    
    return response.json()
  },

  // Server-side methods (for API routes)
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

// Admin operations
export const adminService = {
  async getDashboardStats() {
    const [
      totalUsers,
      totalCompetitions,
      totalParticipations,
      totalVotes,
      recentActivity
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('competitions').select('*', { count: 'exact', head: true }),
      supabase.from('participations').select('*', { count: 'exact', head: true }),
      supabase.from('votes').select('*', { count: 'exact', head: true }),
      supabase
        .from('competitions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Get user stats by role
    const { data: usersByRole } = await supabase
      .from('users')
      .select('role')

    const roleStats = usersByRole?.reduce((acc: any, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {}) || {}

    // Get competition stats by tier
    const { data: competitionsByTier } = await supabase
      .from('competitions')
      .select('tier')

    const tierStats = competitionsByTier?.reduce((acc: any, comp) => {
      acc[comp.tier] = (acc[comp.tier] || 0) + 1
      return acc
    }, {}) || {}

    return {
      overview: {
        total_users: totalUsers.count || 0,
        total_competitions: totalCompetitions.count || 0,
        total_participations: totalParticipations.count || 0,
        total_votes: totalVotes.count || 0
      },
      user_stats: roleStats,
      competition_stats: tierStats,
      recent_activity: recentActivity.data || []
    }
  },

  async getUsers(filters: {
    limit?: number
    offset?: number
    search?: string
    role?: string
    verificationStatus?: string
    suspended?: boolean
  } = {}) {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.search) {
      query = query.or(`display_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters.role) {
      query = query.eq('role', filters.role)
    }

    if (filters.verificationStatus) {
      query = query.eq('verification_status', filters.verificationStatus)
    }

    if (filters.suspended !== undefined) {
      query = query.eq('is_suspended', filters.suspended)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getUserCount(filters: {
    search?: string
    role?: string
    verificationStatus?: string
    suspended?: boolean
  } = {}) {
    let query = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (filters.search) {
      query = query.or(`display_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters.role) {
      query = query.eq('role', filters.role)
    }

    if (filters.verificationStatus) {
      query = query.eq('verification_status', filters.verificationStatus)
    }

    if (filters.suspended !== undefined) {
      query = query.eq('is_suspended', filters.suspended)
    }

    const { count, error } = await query
    if (error) throw error
    return count || 0
  },

  async updateUser(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getSystemLogs(filters: {
    limit?: number
    offset?: number
    level?: string
    category?: string
  } = {}) {
    // This would typically query a logs table
    // For now, return mock data
    return []
  },

  async getAuditLogs(filters: {
    limit?: number
    offset?: number
    user_id?: string
    action?: string
  } = {}) {
    // This would typically query an audit_logs table
    // For now, return mock data
    return []
  }
}

// Notification operations
export const notificationService = {
  async getUserNotifications(userId: string, options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
  } = {}) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options.unreadOnly) {
      query = query.eq('read', false)
    }

    if (options.type) {
      query = query.eq('type', options.type)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return count || 0
  },

  async markAsRead(notificationId: string, userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)
      .select()

    if (error) throw error
    return data
  },

  async createNotification(notificationData: {
    user_id: string
    type: string
    title: string
    message: string
    data?: any
    action_url?: string
  }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notificationData,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async sendEmail(to: string, subject: string, html: string) {
    // This would integrate with Resend or another email service
    // For now, we'll just log it
    console.log('Email notification:', { to, subject, html })
    
    // In production, you would use Resend:
    // const { Resend } = require('resend')
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // return await resend.emails.send({
    //   from: 'noreply@hubspotcompetition.com',
    //   to,
    //   subject,
    //   html
    // })
    
    return { success: true }
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

  subscribeToNotifications(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription)
  }
}