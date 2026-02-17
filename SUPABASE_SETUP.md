# Supabase Database Setup

The app requires a `profiles` table in Supabase. Follow these steps:

## Option 1: Create the table manually

1. Go to https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Go to **SQL Editor** in the left sidebar
4. Run this SQL:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  song_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies for votes
CREATE POLICY "Users can view all votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own votes"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);
```

## Option 2: Disable email confirmation (for testing)

1. Go to **Authentication** > **Providers** > **Email**
2. Turn OFF "Confirm email"
3. Save

## Option 3: Use localStorage fallback

If you don't want to set up Supabase at all:
- The app has a fallback to save votes in your browser's localStorage
- You won't be able to see other users' votes or the leaderboard
- Your votes only persist in your browser

## Getting your own Supabase credentials

1. Create a free account at https://supabase.com
2. Create a new project
3. Go to **Settings** > **API**
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
5. Create a `.env` file in the project root:
   ```
   VITE_SUPABASE_URL=your-url-here
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```
6. Restart the dev server
