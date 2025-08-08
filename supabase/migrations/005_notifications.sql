-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    action_url VARCHAR,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Create notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    competition_updates BOOLEAN DEFAULT true,
    participation_updates BOOLEAN DEFAULT true,
    voting_updates BOOLEAN DEFAULT true,
    tier_advancement BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for notification preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Add updated_at trigger for notification preferences
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to send notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_action_url VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to notify multiple users
CREATE OR REPLACE FUNCTION create_bulk_notifications(
    p_user_ids UUID[],
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_action_url VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    user_id UUID;
    notification_count INTEGER := 0;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO notifications (user_id, type, title, message, data, action_url)
        VALUES (user_id, p_type, p_title, p_message, p_data, p_action_url);
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = p_user_id AND read = false
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET read = true, read_at = NOW()
    WHERE user_id = p_user_id AND read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic notifications

-- Trigger for participation status changes
CREATE OR REPLACE FUNCTION notify_participation_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get competition title
        DECLARE
            comp_title VARCHAR;
        BEGIN
            SELECT title INTO comp_title
            FROM competitions
            WHERE id = NEW.competition_id;
            
            -- Create notification based on new status
            CASE NEW.status
                WHEN 'approved' THEN
                    PERFORM create_notification(
                        NEW.user_id,
                        'participation_approved',
                        'Application Approved! 🎉',
                        'Your application for "' || comp_title || '" has been approved. You can now receive votes!',
                        jsonb_build_object('competition_id', NEW.competition_id),
                        '/competitions/' || NEW.competition_id
                    );
                WHEN 'rejected' THEN
                    PERFORM create_notification(
                        NEW.user_id,
                        'participation_rejected',
                        'Application Update',
                        'Your application for "' || comp_title || '" was not approved this time.',
                        jsonb_build_object('competition_id', NEW.competition_id),
                        '/competitions/' || NEW.competition_id
                    );
            END CASE;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participation_status_notification
    AFTER UPDATE ON participations
    FOR EACH ROW
    EXECUTE FUNCTION notify_participation_status_change();

-- Trigger for new votes
CREATE OR REPLACE FUNCTION notify_new_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- Get participant and competition info
    DECLARE
        participant_user_id UUID;
        comp_title VARCHAR;
        current_vote_count INTEGER;
    BEGIN
        SELECT p.user_id, c.title, p.vote_count
        INTO participant_user_id, comp_title, current_vote_count
        FROM participations p
        JOIN competitions c ON c.id = p.competition_id
        WHERE p.id = NEW.participant_id;
        
        -- Don't notify if voter is the same as participant
        IF NEW.voter_id != participant_user_id THEN
            PERFORM create_notification(
                participant_user_id,
                'new_vote',
                'New Vote Received! ❤️',
                'You received a new vote in "' || comp_title || '". Total votes: ' || (current_vote_count + 1),
                jsonb_build_object(
                    'competition_id', NEW.competition_id,
                    'vote_count', current_vote_count + 1
                ),
                '/competitions/' || NEW.competition_id || '/leaderboard'
            );
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vote_notification
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_vote();

-- Trigger for competition status changes
CREATE OR REPLACE FUNCTION notify_competition_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        DECLARE
            participant_user_ids UUID[];
            notification_title VARCHAR;
            notification_message TEXT;
        BEGIN
            -- Get all participants for this competition
            SELECT ARRAY_AGG(DISTINCT user_id)
            INTO participant_user_ids
            FROM participations
            WHERE competition_id = NEW.id AND status = 'approved';
            
            -- Create notifications based on new status
            CASE NEW.status
                WHEN 'registration_open' THEN
                    notification_title := 'Registration Now Open! 🚀';
                    notification_message := 'Registration is now open for "' || NEW.title || '". Apply now to participate!';
                WHEN 'voting_open' THEN
                    notification_title := 'Voting Has Started! 🗳️';
                    notification_message := 'Voting is now open for "' || NEW.title || '". Cast your votes for the best submissions!';
                WHEN 'completed' THEN
                    notification_title := 'Competition Completed! 🏆';
                    notification_message := 'The competition "' || NEW.title || '" has ended. Check the final results!';
                ELSE
                    RETURN NEW; -- Don't notify for other status changes
            END CASE;
            
            -- Send notifications to all participants
            IF participant_user_ids IS NOT NULL AND array_length(participant_user_ids, 1) > 0 THEN
                PERFORM create_bulk_notifications(
                    participant_user_ids,
                    'competition_status',
                    notification_title,
                    notification_message,
                    jsonb_build_object('competition_id', NEW.id),
                    '/competitions/' || NEW.id
                );
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competition_status_notification
    AFTER UPDATE ON competitions
    FOR EACH ROW
    EXECUTE FUNCTION notify_competition_status_change();