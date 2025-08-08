-- Create storage buckets for user media
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('profile-pictures', 'profile-pictures', true),
    ('banner-images', 'banner-images', true),
    ('intro-videos', 'intro-videos', true),
    ('submission-media', 'submission-media', true);

-- Storage policies for profile pictures
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own profile pictures" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-pictures' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-pictures');

-- Storage policies for banner images
CREATE POLICY "Users can upload their own banner images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'banner-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own banner images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'banner-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own banner images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'banner-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Banner images are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'banner-images');

-- Storage policies for intro videos
CREATE POLICY "Users can upload their own intro videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'intro-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own intro videos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'intro-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own intro videos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'intro-videos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Intro videos are publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'intro-videos');

-- Storage policies for submission media
CREATE POLICY "Users can upload submission media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'submission-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their submission media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'submission-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their submission media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'submission-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Submission media is publicly viewable" ON storage.objects
    FOR SELECT USING (bucket_id = 'submission-media');