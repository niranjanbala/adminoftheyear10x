// Core type definitions for the HubSpot Admin Competition Platform

export enum UserRole {
  PARTICIPANT = 'participant',
  VOTER = 'voter',
  ORGANIZER = 'organizer',
  SUPER_ADMIN = 'super_admin'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export enum CompetitionTier {
  LOCAL = 'local',
  NATIONAL = 'national',
  GLOBAL = 'global'
}

export enum CompetitionStatus {
  DRAFT = 'draft',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  VOTING_OPEN = 'voting_open',
  VOTING_CLOSED = 'voting_closed',
  COMPLETED = 'completed'
}

export enum ParticipationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export interface User {
  id: string
  hubspotId: string
  email: string
  profile: UserProfile
  role: UserRole
  verificationStatus: VerificationStatus
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  displayName: string
  bio: string
  skills: string[]
  hubspotExperience: string
  portfolioLinks: string[]
  profilePicture?: string
  bannerImage?: string
  introVideo?: string
}

export interface Competition {
  id: string
  title: string
  description: string
  tier: CompetitionTier
  country?: string
  status: CompetitionStatus
  registrationStart: Date
  registrationEnd: Date
  votingStart: Date
  votingEnd: Date
  maxParticipants?: number
  qualificationRules: QualificationRules
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface QualificationRules {
  minVotes?: number
  topN?: number
  requiresApproval: boolean
}

export interface Participation {
  id: string
  competitionId: string
  userId: string
  status: ParticipationStatus
  submissionData: SubmissionData
  voteCount: number
  ranking?: number
  appliedAt: Date
  approvedAt?: Date
}

export interface SubmissionData {
  title: string
  description: string
  mediaFiles: MediaFile[]
  portfolioLinks: string[]
}

export interface MediaFile {
  id: string
  type: 'image' | 'video'
  url: string
  filename: string
  size: number
}

export interface Vote {
  id: string
  competitionId: string
  participantId: string
  voterId: string
  voterIP: string
  timestamp: Date
  verified: boolean
}

export interface LeaderboardEntry {
  participantId: string
  participant: UserProfile
  voteCount: number
  ranking: number
  trend: RankingTrend
}

export enum RankingTrend {
  UP = 'up',
  DOWN = 'down',
  SAME = 'same',
  NEW = 'new'
}