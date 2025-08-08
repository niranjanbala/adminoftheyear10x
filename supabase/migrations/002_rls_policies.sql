-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own profile and public profiles of others
CREATE POLICY "Users can view public profiles" ON users
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Super admins can do everything with users
CREATE POLICY "Super admins can manage users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'super_admin'
        )
    );

-- Competitions table policies
-- Anyone can view active competitions
CREATE POLICY "Anyone can view competitions" ON competitions
    FOR SELECT USING (
        status IN ('registration_open', 'registration_closed', 'voting_open', 'voting_closed', 'completed')
        OR auth.uid()::text = created_by::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role IN ('organizer', 'super_admin')
        )
    );

-- Organizers and super admins can create competitions
CREATE POLICY "Organizers can create competitions" ON competitions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role IN ('organizer', 'super_admin')
        )
    );

-- Competition creators and super admins can update competitions
CREATE POLICY "Competition creators can update competitions" ON competitions
    FOR UPDATE USING (
        auth.uid()::text = created_by::text
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'super_admin'
        )
    );

-- Participations table policies
-- Users can view participations for competitions they can see
CREATE POLICY "Users can view participations" ON participations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = competition_id
            AND (
                c.status IN ('voting_open', 'voting_closed', 'completed')
                OR auth.uid()::text = user_id::text
                OR auth.uid()::text = c.created_by::text
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id::text = auth.uid()::text 
                    AND u.role IN ('organizer', 'super_admin')
                )
            )
        )
    );

-- Users can apply to competitions (insert their own participation)
CREATE POLICY "Users can apply to competitions" ON participations
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text
        AND EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = competition_id
            AND c.status = 'registration_open'
        )
    );

-- Users can update their own participation
CREATE POLICY "Users can update own participation" ON participations
    FOR UPDATE USING (
        auth.uid()::text = user_id::text
        OR EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = competition_id
            AND (
                auth.uid()::text = c.created_by::text
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id::text = auth.uid()::text 
                    AND u.role IN ('organizer', 'super_admin')
                )
            )
        )
    );

-- Votes table policies
-- Users can view vote counts but not individual votes (except their own)
CREATE POLICY "Users can view own votes" ON votes
    FOR SELECT USING (
        auth.uid()::text = voter_id::text
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id::text = auth.uid()::text 
            AND u.role IN ('organizer', 'super_admin')
        )
    );

-- Verified users can cast votes
CREATE POLICY "Verified users can vote" ON votes
    FOR INSERT WITH CHECK (
        auth.uid()::text = voter_id::text
        AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id::text = auth.uid()::text 
            AND u.verification_status = 'verified'
        )
        AND EXISTS (
            SELECT 1 FROM competitions c
            WHERE c.id = competition_id
            AND c.status = 'voting_open'
        )
    );

-- Create functions for vote counting and ranking updates
CREATE OR REPLACE FUNCTION update_participation_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE participations 
        SET vote_count = vote_count + 1
        WHERE id = NEW.participant_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE participations 
        SET vote_count = vote_count - 1
        WHERE id = OLD.participant_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic vote counting
CREATE TRIGGER update_vote_count_trigger
    AFTER INSERT OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_participation_vote_count();

-- Function to calculate rankings for a competition
CREATE OR REPLACE FUNCTION calculate_competition_rankings(comp_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE participations 
    SET ranking = ranked.rank
    FROM (
        SELECT 
            id,
            RANK() OVER (ORDER BY vote_count DESC, applied_at ASC) as rank
        FROM participations 
        WHERE competition_id = comp_id
        AND status = 'approved'
    ) ranked
    WHERE participations.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard for a competition
CREATE OR REPLACE FUNCTION get_competition_leaderboard(comp_id UUID)
RETURNS TABLE (
    participant_id UUID,
    user_id UUID,
    display_name VARCHAR,
    vote_count INTEGER,
    ranking INTEGER,
    profile_picture_url VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as participant_id,
        p.user_id,
        u.display_name,
        p.vote_count,
        p.ranking,
        u.profile_picture_url
    FROM participations p
    JOIN users u ON p.user_id = u.id
    WHERE p.competition_id = comp_id
    AND p.status = 'approved'
    ORDER BY p.ranking ASC NULLS LAST, p.vote_count DESC, p.applied_at ASC;
END;
$$ LANGUAGE plpgsql;