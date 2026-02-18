-- ============================================================
-- AIVISION: Full migration — safe to re-run (idempotent)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Helper: create policy only if it doesn't already exist
CREATE OR REPLACE FUNCTION _create_policy_if_not_exists(
  _table TEXT, _name TEXT, _cmd TEXT, _qual TEXT DEFAULT NULL, _check TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = _table AND policyname = _name
  ) THEN
    IF _qual IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR %s USING (%s)', _name, _table, _cmd, _qual);
    END IF;
    IF _check IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR %s WITH CHECK (%s)', _name, _table, _cmd, _check);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. Ratings ─────────────────────────────────────────
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

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('ratings', 'Anyone can view ratings',       'SELECT', 'true');
SELECT _create_policy_if_not_exists('ratings', 'Users can insert own ratings',  'INSERT', NULL, 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('ratings', 'Users can update own ratings',  'UPDATE', 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('ratings', 'Users can delete own ratings',  'DELETE', 'auth.uid() = user_id');

-- ─── 2. Country videos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS country_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  country_id TEXT NOT NULL UNIQUE,
  video_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE country_videos ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('country_videos', 'Anyone can view country videos',   'SELECT', 'true');
SELECT _create_policy_if_not_exists('country_videos', 'Anyone can insert country videos',  'INSERT', NULL, 'true');
SELECT _create_policy_if_not_exists('country_videos', 'Anyone can update country videos',  'UPDATE', 'true');
SELECT _create_policy_if_not_exists('country_videos', 'Anyone can delete country videos',  'DELETE', 'true');

-- ─── 3. Custom songs ───────────────────────────────────
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
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns that may be missing on older installs
ALTER TABLE custom_songs ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE custom_songs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE custom_songs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;

ALTER TABLE custom_songs ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('custom_songs', 'Anyone can view songs',   'SELECT', 'true');
SELECT _create_policy_if_not_exists('custom_songs', 'Anyone can insert songs',  'INSERT', NULL, 'true');
SELECT _create_policy_if_not_exists('custom_songs', 'Anyone can update songs',  'UPDATE', 'true');
SELECT _create_policy_if_not_exists('custom_songs', 'Anyone can delete songs',  'DELETE', 'true');

-- ─── 4. Song reactions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS song_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  song_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('song_reactions', 'Anyone can view reactions',        'SELECT', 'true');
SELECT _create_policy_if_not_exists('song_reactions', 'Users can insert own reactions',   'INSERT', NULL, 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('song_reactions', 'Users can delete own reactions',   'DELETE', 'auth.uid() = user_id');

-- ─── 5. Song comments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS song_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  song_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE song_comments ENABLE ROW LEVEL SECURITY;

SELECT _create_policy_if_not_exists('song_comments', 'Anyone can view comments',        'SELECT', 'true');
SELECT _create_policy_if_not_exists('song_comments', 'Users can insert own comments',   'INSERT', NULL, 'auth.uid() = user_id');
SELECT _create_policy_if_not_exists('song_comments', 'Users can delete own comments',   'DELETE', 'auth.uid() = user_id');

-- ─── 6. Storage bucket ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

SELECT _create_policy_if_not_exists('objects', 'Authenticated users can upload media',      'INSERT', NULL, 'bucket_id = ''media'' AND auth.role() = ''authenticated''');
SELECT _create_policy_if_not_exists('objects', 'Anyone can view media',                     'SELECT', 'bucket_id = ''media''');
SELECT _create_policy_if_not_exists('objects', 'Authenticated users can delete own media',  'DELETE', 'bucket_id = ''media'' AND auth.role() = ''authenticated''');

-- Clean up helper
DROP FUNCTION IF EXISTS _create_policy_if_not_exists;
