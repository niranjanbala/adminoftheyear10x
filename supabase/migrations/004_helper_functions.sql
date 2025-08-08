-- Function to check if user can vote in a competition
CREATE OR REPLACE FUNCTION can_user_vote(user_id UUID, comp_id UUID, participant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_verified BOOLEAN;
    competition_open BOOLEAN;
    already_voted BOOLEAN;
BEGIN
    -- Check if user is verified
    SELECT verification_status = 'verified' INTO user_verified
    FROM users WHERE id = user_id;
    
    -- Check if competition is in voting phase
    SELECT status = 'voting_open' INTO competition_open
    FROM competitions WHERE id = comp_id;
    
    -- Check if user already voted for this participant
    SELECT EXISTS(
        SELECT 1 FROM votes 
        WHERE competition_id = comp_id 
        AND participant_id = participant_id 
        AND voter_id = user_id
    ) INTO already_voted;
    
    RETURN user_verified AND competition_open AND NOT already_voted;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's voting status for a competition
CREATE OR REPLACE FUNCTION get_user_voting_status(user_id UUID, comp_id UUID)
RETURNS TABLE (
    participant_id UUID,
    has_voted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as participant_id,
        EXISTS(
            SELECT 1 FROM votes v 
            WHERE v.competition_id = comp_id 
            AND v.participant_id = p.id 
            AND v.voter_id = user_id
        ) as has_voted
    FROM participations p
    WHERE p.competition_id = comp_id
    AND p.status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Function to advance winners to next tier
CREATE OR REPLACE FUNCTION advance_competition_winners(comp_id UUID, top_n INTEGER)
RETURNS TABLE (
    user_id UUID,
    display_name VARCHAR,
    ranking INTEGER,
    vote_count INTEGER
) AS $$
BEGIN
    -- First calculate rankings
    PERFORM calculate_competition_rankings(comp_id);
    
    -- Return top N winners
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.display_name,
        p.ranking,
        p.vote_count
    FROM participations p
    JOIN users u ON p.user_id = u.id
    WHERE p.competition_id = comp_id
    AND p.status = 'approved'
    AND p.ranking <= top_n
    ORDER BY p.ranking ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get competition statistics
CREATE OR REPLACE FUNCTION get_competition_stats(comp_id UUID)
RETURNS TABLE (
    total_participants INTEGER,
    total_votes INTEGER,
    avg_votes_per_participant NUMERIC,
    top_vote_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(p.id)::INTEGER as total_participants,
        COALESCE(SUM(p.vote_count), 0)::INTEGER as total_votes,
        COALESCE(AVG(p.vote_count), 0) as avg_votes_per_participant,
        COALESCE(MAX(p.vote_count), 0)::INTEGER as top_vote_count
    FROM participations p
    WHERE p.competition_id = comp_id
    AND p.status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Function to check for duplicate votes (fraud prevention)
CREATE OR REPLACE FUNCTION check_duplicate_vote_attempt(
    comp_id UUID, 
    participant_id UUID, 
    voter_id UUID, 
    voter_ip INET
)
RETURNS TABLE (
    has_account_duplicate BOOLEAN,
    has_ip_duplicate BOOLEAN,
    recent_votes_from_ip INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(
            SELECT 1 FROM votes 
            WHERE competition_id = comp_id 
            AND participant_id = participant_id 
            AND voter_id = voter_id
        ) as has_account_duplicate,
        EXISTS(
            SELECT 1 FROM votes 
            WHERE competition_id = comp_id 
            AND participant_id = participant_id 
            AND voter_ip = voter_ip
        ) as has_ip_duplicate,
        (
            SELECT COUNT(*)::INTEGER 
            FROM votes 
            WHERE voter_ip = voter_ip 
            AND timestamp > NOW() - INTERVAL '1 hour'
        ) as recent_votes_from_ip;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending participants (based on recent vote velocity)
CREATE OR REPLACE FUNCTION get_trending_participants(comp_id UUID, hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    participant_id UUID,
    user_id UUID,
    display_name VARCHAR,
    recent_votes INTEGER,
    total_votes INTEGER,
    vote_velocity NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as participant_id,
        p.user_id,
        u.display_name,
        (
            SELECT COUNT(*)::INTEGER 
            FROM votes v 
            WHERE v.participant_id = p.id 
            AND v.timestamp > NOW() - (hours_back || ' hours')::INTERVAL
        ) as recent_votes,
        p.vote_count as total_votes,
        (
            SELECT COUNT(*)::NUMERIC / GREATEST(hours_back, 1) 
            FROM votes v 
            WHERE v.participant_id = p.id 
            AND v.timestamp > NOW() - (hours_back || ' hours')::INTERVAL
        ) as vote_velocity
    FROM participations p
    JOIN users u ON p.user_id = u.id
    WHERE p.competition_id = comp_id
    AND p.status = 'approved'
    ORDER BY vote_velocity DESC, recent_votes DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to validate competition dates
CREATE OR REPLACE FUNCTION validate_competition_dates(
    reg_start TIMESTAMP WITH TIME ZONE,
    reg_end TIMESTAMP WITH TIME ZONE,
    vote_start TIMESTAMP WITH TIME ZONE,
    vote_end TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        reg_start < reg_end AND
        reg_end <= vote_start AND
        vote_start < vote_end AND
        reg_start > NOW()
    );
END;
$$ LANGUAGE plpgsql;