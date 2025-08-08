import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type-safe database client
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          hubspot_id: string
          email: string
          display_name: string
          bio: string | null
          skills: string[]
          hubspot_experience: string | null
          portfolio_links: string[]
          profile_picture_url: string | null
          banner_image_url: string | null
          intro_video_url: string | null
          role: 'participant' | 'voter' | 'organizer' | 'super_admin'
          verification_status: 'pending' | 'verified' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hubspot_id: string
          email: string
          display_name: string
          bio?: string | null
          skills?: string[]
          hubspot_experience?: string | null
          portfolio_links?: string[]
          profile_picture_url?: string | null
          banner_image_url?: string | null
          intro_video_url?: string | null
          role?: 'participant' | 'voter' | 'organizer' | 'super_admin'
          verification_status?: 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hubspot_id?: string
          email?: string
          display_name?: string
          bio?: string | null
          skills?: string[]
          hubspot_experience?: string | null
          portfolio_links?: string[]
          profile_picture_url?: string | null
          banner_image_url?: string | null
          intro_video_url?: string | null
          role?: 'participant' | 'voter' | 'organizer' | 'super_admin'
          verification_status?: 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      competitions: {
        Row: {
          id: string
          title: string
          description: string | null
          tier: 'local' | 'national' | 'global'
          country: string | null
          status: 'draft' | 'registration_open' | 'registration_closed' | 'voting_open' | 'voting_closed' | 'completed'
          registration_start: string | null
          registration_end: string | null
          voting_start: string | null
          voting_end: string | null
          max_participants: number | null
          qualification_rules: any
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          tier: 'local' | 'national' | 'global'
          country?: string | null
          status?: 'draft' | 'registration_open' | 'registration_closed' | 'voting_open' | 'voting_closed' | 'completed'
          registration_start?: string | null
          registration_end?: string | null
          voting_start?: string | null
          voting_end?: string | null
          max_participants?: number | null
          qualification_rules?: any
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          tier?: 'local' | 'national' | 'global'
          country?: string | null
          status?: 'draft' | 'registration_open' | 'registration_closed' | 'voting_open' | 'voting_closed' | 'completed'
          registration_start?: string | null
          registration_end?: string | null
          voting_start?: string | null
          voting_end?: string | null
          max_participants?: number | null
          qualification_rules?: any
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      participations: {
        Row: {
          id: string
          competition_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
          submission_title: string | null
          submission_description: string | null
          submission_media: any
          vote_count: number
          ranking: number | null
          applied_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          competition_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'rejected' | 'withdrawn'
          submission_title?: string | null
          submission_description?: string | null
          submission_media?: any
          vote_count?: number
          ranking?: number | null
          applied_at?: string
          approved_at?: string | null
        }
        Update: {
          id?: string
          competition_id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected' | 'withdrawn'
          submission_title?: string | null
          submission_description?: string | null
          submission_media?: any
          vote_count?: number
          ranking?: number | null
          applied_at?: string
          approved_at?: string | null
        }
      }
      votes: {
        Row: {
          id: string
          competition_id: string
          participant_id: string
          voter_id: string
          voter_ip: string
          timestamp: string
          verified: boolean
        }
        Insert: {
          id?: string
          competition_id: string
          participant_id: string
          voter_id: string
          voter_ip: string
          timestamp?: string
          verified?: boolean
        }
        Update: {
          id?: string
          competition_id?: string
          participant_id?: string
          voter_id?: string
          voter_ip?: string
          timestamp?: string
          verified?: boolean
        }
      }
    }
    Functions: {
      can_user_vote: {
        Args: {
          user_id: string
          comp_id: string
          participant_id: string
        }
        Returns: boolean
      }
      get_user_voting_status: {
        Args: {
          user_id: string
          comp_id: string
        }
        Returns: {
          participant_id: string
          has_voted: boolean
        }[]
      }
      get_competition_leaderboard: {
        Args: {
          comp_id: string
        }
        Returns: {
          participant_id: string
          user_id: string
          display_name: string
          vote_count: number
          ranking: number
          profile_picture_url: string | null
        }[]
      }
      calculate_competition_rankings: {
        Args: {
          comp_id: string
        }
        Returns: void
      }
      advance_competition_winners: {
        Args: {
          comp_id: string
          top_n: number
        }
        Returns: {
          user_id: string
          display_name: string
          ranking: number
          vote_count: number
        }[]
      }
      get_competition_stats: {
        Args: {
          comp_id: string
        }
        Returns: {
          total_participants: number
          total_votes: number
          avg_votes_per_participant: number
          top_vote_count: number
        }[]
      }
      check_duplicate_vote_attempt: {
        Args: {
          comp_id: string
          participant_id: string
          voter_id: string
          voter_ip: string
        }
        Returns: {
          has_account_duplicate: boolean
          has_ip_duplicate: boolean
          recent_votes_from_ip: number
        }[]
      }
      get_trending_participants: {
        Args: {
          comp_id: string
          hours_back?: number
        }
        Returns: {
          participant_id: string
          user_id: string
          display_name: string
          recent_votes: number
          total_votes: number
          vote_velocity: number
        }[]
      }
      validate_competition_dates: {
        Args: {
          reg_start: string
          reg_end: string
          vote_start: string
          vote_end: string
        }
        Returns: boolean
      }
    }
  }
}