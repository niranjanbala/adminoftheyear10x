-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('participant', 'voter', 'organizer', 'super_admin');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE competition_tier AS ENUM ('local', 'national', 'global');
CREATE TYPE competition_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'voting_open', 'voting_closed', 'completed');
CREATE TYPE participation_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hubspot_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    display_name VARCHAR NOT NULL,
    bio TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    hubspot_experience TEXT,
    portfolio_links JSONB DEFAULT '[]'::jsonb,
    profile_picture_url VARCHAR,
    banner_image_url VARCHAR,
    intro_video_url VARCHAR,
    role user_role DEFAULT 'participant',
    verification_status verification_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitions table
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT,
    tier competition_tier NOT NULL,
    country VARCHAR,
    status competition_status DEFAULT 'draft',
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    voting_start TIMESTAMP WITH TIME ZONE,
    voting_end TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    qualification_rules JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participations table
CREATE TABLE participations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status participation_status DEFAULT 'pending',
    submission_title VARCHAR,
    submission_description TEXT,
    submission_media JSONB DEFAULT '[]'::jsonb,
    vote_count INTEGER DEFAULT 0,
    ranking INTEGER,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(competition_id, user_id)
);

-- Votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participations(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    voter_ip INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified BOOLEAN DEFAULT false,
    UNIQUE(competition_id, participant_id, voter_id)
);

-- Create indexes for performance
CREATE INDEX idx_users_hubspot_id ON users(hubspot_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_status ON users(verification_status);

CREATE INDEX idx_competitions_tier ON competitions(tier);
CREATE INDEX idx_competitions_country ON competitions(country);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_created_by ON competitions(created_by);
CREATE INDEX idx_competitions_dates ON competitions(registration_start, registration_end, voting_start, voting_end);

CREATE INDEX idx_participations_competition_id ON participations(competition_id);
CREATE INDEX idx_participations_user_id ON participations(user_id);
CREATE INDEX idx_participations_status ON participations(status);
CREATE INDEX idx_participations_vote_count ON participations(vote_count DESC);
CREATE INDEX idx_participations_ranking ON participations(ranking);

CREATE INDEX idx_votes_competition_id ON votes(competition_id);
CREATE INDEX idx_votes_participant_id ON votes(participant_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_voter_ip ON votes(voter_ip);
CREATE INDEX idx_votes_timestamp ON votes(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();