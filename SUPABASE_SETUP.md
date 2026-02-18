# AIVISION - Supabase Setup Guide

Complete guide for setting up the Supabase backend for the AIVISION Eurovision voting app.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon public key** from **Settings > API**
3. Update `src/supabaseClient.js` with your credentials:

```js
const supabaseUrl = 'https://YOUR_PROJECT.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY'
```

---

## 2. Authentication

Enable the following auth providers in **Authentication > Providers**:

- **Email** (enabled by default) - used for email/password sign-up and login
- **Google** (optional) - for OAuth login via `/auth/callback`

Set the **Site URL** to your deployed app URL (e.g. `https://yourdomain.com`).

Add `https://yourdomain.com/auth/callback` to **Redirect URLs**.

For testing, you can disable email confirmation:
1. Go to **Authentication** > **Providers** > **Email**
2. Turn OFF "Confirm email"
3. Save

---

## 3. Database Tables

Run the following SQL in the **SQL Editor** to create all required tables.

### profiles

Stores user display names, emails, and avatar URLs. Linked to Supabase Auth users.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### votes

Stores Eurovision-style point votes (1-12) per user per song.

```sql
CREATE TABLE votes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes"
  ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE USING (auth.uid() = user_id);
```

### ratings

Stores per-category ratings (lyrics, melody, memorable) on a 1-10 scale.

```sql
CREATE TABLE ratings (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  lyrics_rating INTEGER CHECK (lyrics_rating >= 1 AND lyrics_rating <= 10),
  melody_rating INTEGER CHECK (melody_rating >= 1 AND melody_rating <= 10),
  memorable_rating INTEGER CHECK (memorable_rating >= 1 AND memorable_rating <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE USING (auth.uid() = user_id);
```

### custom_songs

Admin-managed songs that supplement or replace the built-in song list.

```sql
CREATE TABLE custom_songs (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  flag TEXT,
  artist TEXT,
  title TEXT,
  genre TEXT,
  lyrics TEXT,
  audio_url TEXT,
  cover_url TEXT,
  lyrics_timing JSONB,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs are viewable by everyone"
  ON custom_songs FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert songs"
  ON custom_songs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update songs"
  ON custom_songs FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete songs"
  ON custom_songs FOR DELETE USING (auth.role() = 'authenticated');
```

> **Note:** `lyrics_timing` is a JSONB array of objects: `[{"line": 0, "time": 12.5}, {"line": 1, "time": 15.3}]`

### country_videos

Hover-preview videos uploaded per country/song from the admin panel.

```sql
CREATE TABLE country_videos (
  country_id TEXT PRIMARY KEY,
  video_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE country_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON country_videos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage videos"
  ON country_videos FOR ALL USING (auth.role() = 'authenticated');
```

### app_settings

Key-value store for app-wide configuration (theme, branding).

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are viewable by everyone"
  ON app_settings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage settings"
  ON app_settings FOR ALL USING (auth.role() = 'authenticated');
```

The `theme` key stores a JSON string:

```json
{
  "appName": "AIVISION",
  "appSubtitle": "Vote for your favorite songs",
  "primaryColor": "#8b5cf6",
  "secondaryColor": "#ec4899",
  "bgColor1": "#1a0533",
  "bgColor2": "#0f172a",
  "bgColor3": "#1e1b4b",
  "logoUrl": ""
}
```

### song_reactions

Emoji reactions on songs. Max 5 reactions per user per song (enforced in app).

```sql
CREATE TABLE song_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, song_id, emoji)
);

ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
  ON song_reactions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reactions"
  ON song_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON song_reactions FOR DELETE USING (auth.uid() = user_id);
```

Available emojis: ❤️ 🔥 👏 😍 🎵 💃 🌟 😭

### song_comments

User comments on songs with profile join support.

```sql
CREATE TABLE song_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_song_comments_song_id ON song_comments(song_id);

ALTER TABLE song_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON song_comments FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments"
  ON song_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON song_comments FOR DELETE USING (auth.uid() = user_id);
```

---

## 4. Storage

Create a **public** storage bucket called `media`.

### Create the bucket

Go to **Storage** in the Supabase dashboard and click **New bucket**:

- **Name:** `media`
- **Public:** Yes (toggle on)

Or via SQL:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true);
```

### Storage policies

Allow authenticated users to upload, and public read access:

```sql
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');
```

### Folder structure

| Folder | Contents | Max size | Format |
|--------|----------|----------|--------|
| `songs/` | Audio files | 20 MB | MP3, WAV, etc. |
| `covers/` | Song cover art | 10 MB | PNG, JPG, WebP, MP4 |
| `country-videos/` | Hover preview videos | 50 MB | MP4 |
| `avatars/` | User profile pictures | 5 MB | PNG (cropped to 256x256) |
| `branding/` | App logo | 5 MB | PNG, JPG, SVG, WebP |

File naming patterns:
- `songs/{song_id}_{timestamp}.ext`
- `covers/{song_id}_{timestamp}.ext`
- `country-videos/{country_id}_{timestamp}.ext`
- `avatars/{user_id}_{timestamp}.png`
- `branding/logo_{timestamp}.ext`

---

## 5. Admin Access

Admin users are defined client-side in `src/adminConfig.js`. Add email addresses to the `ADMIN_EMAILS` array:

```js
const ADMIN_EMAILS = [
  'your-email@example.com',
  // Add more admin emails here
];
```

Admins can:
- Add/edit/delete songs and upload audio, covers, and videos
- View all users and their votes
- Customize the app theme, name, subtitle, and logo
- Export data as CSV/JSON
- Reset all votes or ratings
- Delete votes per user

> **Important:** Admin authorization is enforced on the client side only. For production, consider adding Supabase RLS policies or Edge Functions to restrict write operations on `custom_songs`, `country_videos`, `app_settings`, and delete operations on `votes`/`ratings` to admin users only.

---

## 6. Complete SQL (one-shot)

Copy and run this entire block in the SQL Editor to set up everything at once:

```sql
-- ============================================
-- AIVISION - Complete Supabase Setup
-- ============================================

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Votes
CREATE TABLE IF NOT EXISTS votes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- 3. Ratings
CREATE TABLE IF NOT EXISTS ratings (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  lyrics_rating INTEGER CHECK (lyrics_rating >= 1 AND lyrics_rating <= 10),
  melody_rating INTEGER CHECK (melody_rating >= 1 AND melody_rating <= 10),
  memorable_rating INTEGER CHECK (memorable_rating >= 1 AND memorable_rating <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

-- 4. Custom Songs
CREATE TABLE IF NOT EXISTS custom_songs (
  id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  flag TEXT,
  artist TEXT,
  title TEXT,
  genre TEXT,
  lyrics TEXT,
  audio_url TEXT,
  cover_url TEXT,
  lyrics_timing JSONB,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Country Videos
CREATE TABLE IF NOT EXISTS country_videos (
  country_id TEXT PRIMARY KEY,
  video_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Song Reactions
CREATE TABLE IF NOT EXISTS song_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, song_id, emoji)
);

-- 8. Song Comments
CREATE TABLE IF NOT EXISTS song_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_song_comments_song_id ON song_comments(song_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_comments ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Votes
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own votes"
  ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE USING (auth.uid() = user_id);

-- Ratings
CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own ratings"
  ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE USING (auth.uid() = user_id);

-- Custom Songs
CREATE POLICY "Songs are viewable by everyone"
  ON custom_songs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert songs"
  ON custom_songs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update songs"
  ON custom_songs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete songs"
  ON custom_songs FOR DELETE USING (auth.role() = 'authenticated');

-- Country Videos
CREATE POLICY "Videos are viewable by everyone"
  ON country_videos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage videos"
  ON country_videos FOR ALL USING (auth.role() = 'authenticated');

-- App Settings
CREATE POLICY "Settings are viewable by everyone"
  ON app_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage settings"
  ON app_settings FOR ALL USING (auth.role() = 'authenticated');

-- Song Reactions
CREATE POLICY "Reactions are viewable by everyone"
  ON song_reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reactions"
  ON song_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions"
  ON song_reactions FOR DELETE USING (auth.uid() = user_id);

-- Song Comments
CREATE POLICY "Comments are viewable by everyone"
  ON song_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments"
  ON song_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON song_comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Storage Bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.role() = 'authenticated');
```

---

## 7. Relationship Diagram

```
auth.users
    │
    ▼
profiles (id, name, email, avatar_url)
    │
    ├──→ votes (user_id, song_id, score)
    ├──→ ratings (user_id, song_id, lyrics/melody/memorable)
    ├──→ song_reactions (user_id, song_id, emoji)
    ├──→ song_comments (user_id, song_id, text)
    └──→ country_videos (uploaded_by)

custom_songs (id, country, artist, title, genre, lyrics, audio_url, ...)
    └── song_id in votes/ratings/reactions/comments references
        either custom_songs.id or built-in song IDs from songs.js

app_settings (key → value)
    └── "theme" key stores JSON with colors, app name, logo URL
```
