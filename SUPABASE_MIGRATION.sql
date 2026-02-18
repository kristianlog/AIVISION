-- ============================================================
-- AIVISION: New tables for ratings, country videos, and songs
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ratings table (lyrics, melody, memorable per song per user)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  song_id TEXT NOT NULL,
  lyrics_rating INTEGER DEFAULT 0 CHECK (lyrics_rating >= 0 AND lyrics_rating <= 10),
  melody_rating INTEGER DEFAULT 0 CHECK (melody_rating >= 0 AND melody_rating <= 10),
  memorable_rating INTEGER DEFAULT 0 CHECK (memorable_rating >= 0 AND memorable_rating <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- RLS for ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT USING (true);

CREATE POLICY "Users can insert own ratings"
  ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON ratings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE USING (auth.uid() = user_id);

-- 2. Country videos table (short videos for country hover)
CREATE TABLE IF NOT EXISTS country_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  country_id TEXT NOT NULL UNIQUE,
  video_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for country_videos
ALTER TABLE country_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view country videos"
  ON country_videos FOR SELECT USING (true);

CREATE POLICY "Anyone can insert country videos"
  ON country_videos FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update country videos"
  ON country_videos FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete country videos"
  ON country_videos FOR DELETE USING (true);

-- 3. Custom songs table (admin-uploaded songs)
CREATE TABLE IF NOT EXISTS custom_songs (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  flag TEXT NOT NULL,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  lyrics TEXT,
  audio_url TEXT,
  cover_url TEXT,
  lyrics_timing JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table already exists, add missing columns
ALTER TABLE custom_songs ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE custom_songs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE custom_songs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;

-- RLS for custom_songs
ALTER TABLE custom_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view songs"
  ON custom_songs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert songs"
  ON custom_songs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update songs"
  ON custom_songs FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete songs"
  ON custom_songs FOR DELETE USING (true);

-- 4. Song reactions table
CREATE TABLE IF NOT EXISTS song_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  song_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON song_reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert own reactions"
  ON song_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON song_reactions FOR DELETE USING (auth.uid() = user_id);

-- 5. Song comments table
CREATE TABLE IF NOT EXISTS song_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  song_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE song_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON song_comments FOR SELECT USING (true);

CREATE POLICY "Users can insert own comments"
  ON song_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON song_comments FOR DELETE USING (auth.uid() = user_id);

-- 6. Create storage bucket for media uploads (audio + video)
-- Run these separately if they fail (bucket might already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy - allow authenticated users to upload
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can delete own media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');
