# AIVISION - Eurovision Voting App

## Quick Reference

- **Dev server**: `npm run dev` (http://localhost:5173)
- **Build**: `npm run build` → `dist/`
- **Lint**: `npm run lint`
- **Preview prod build**: `npm run preview`
- **No test suite** — verify changes by building successfully

## Tech Stack

- **React 19** (JSX, not TypeScript) + **Vite 8 beta** + **React Router 7**
- **Supabase** — PostgreSQL, Auth (email + Google OAuth), Storage (`media` bucket)
- **Tailwind CSS v4** (via `@tailwindcss/postcss`) — utility classes + CSS variables for theming
- **Lucide React** — icons
- **PWA** via `vite-plugin-pwa` — offline support, installable

## Supabase

- **URL**: `https://xvknylospajtmzlmhmzw.supabase.co`
- **Tables**: `profiles`, `votes`, `ratings`, `custom_songs`, `country_videos`, `song_reactions`, `song_comments`, `app_settings`
- **Storage bucket**: `media` (public — videos, audio, cover art)
- **Auth**: Email/password + Google OAuth → `/auth/callback`
- **RLS**: Enabled on all tables. Public read, users manage own data.
- **Schema**: See `SUPABASE_MIGRATION.sql` for full DDL

## Project Structure

```
src/
├── App.jsx              # Router, session management, theme wrapper
├── main.jsx             # Entry point with ErrorBoundary
├── index.css            # Global styles, CSS variables, animations
├── supabaseClient.js    # Supabase client init
├── ThemeContext.jsx      # Dark/light mode + 10 preset themes
├── adminConfig.js       # Admin email whitelist
│
├── Auth.jsx             # Login/signup form
├── AuthCallback.jsx     # Google OAuth redirect handler
│
├── EurovisionVoting.jsx # Main app (songs tab, my votes, leaderboard tabs)
├── SongCard.jsx         # Song card component (video hover preview)
├── SongDetail.jsx       # Song detail modal with voting UI
├── Leaderboard.jsx      # Rankings (ratings, votes, comparison views)
│
├── AdminPanel.jsx       # Admin dashboard (songs, videos, themes, users) — largest file (~86KB)
├── KaraokeMode.jsx      # Karaoke feature
├── LyricsPlayer.jsx     # Synced lyrics display
├── LyricsTimingEditor.jsx # Admin lyrics timing tool
│
├── AvatarCropModal.jsx  # Avatar upload/crop
├── PWAInstallPrompt.jsx # Install banner (iOS/Android/Chrome)
├── Confetti.jsx         # Celebration animation
│
├── songs.js             # Built-in song data (12 countries)
├── countryInfo.js       # Eurovision facts per country
└── useFlagColors.js     # Hook: extract colors from flag emojis
```

## Code Conventions

- **All files are `.jsx` / `.js`** — no TypeScript
- **camelCase** for variables/functions, **PascalCase** for components
- Hooks at top of component, JSX at bottom
- Section separators: `// ── Section Name ──`
- Error handling: try-catch with `console.error`
- State: `useState` + `useCallback`/`useMemo`, no external state library
- Local storage keys prefixed with `aivision_` (e.g. `aivision_votes`, `aivision_mode`)
- **Mobile-first** — responsive grid, touch-friendly modals

## Theming

- CSS variables: `--color-primary`, `--color-secondary`, `--bg-1`, `--bg-2`, `--bg-3`
- Glass morphism with `backdrop-filter: blur()`
- Custom animations: `twinkle`, `float`, `shimmer`, `pulse-glow`
- Theme stored in Supabase `app_settings` table

## Deployment

- **Vercel** (`vercel.json` — SPA rewrites, cache headers)
- Also supports **Netlify** (`public/_redirects`)
- PWA service worker auto-generated on build

## Key Behaviors

- Votes are Eurovision-style: 1-12 points per song, one vote per user per song
- Ratings are per-category: Lyrics, Melody, Memorability (1-10 scale)
- Friends system: add friends, see their votes
- Admin access controlled by email whitelist in `adminConfig.js`
- Songs can come from `songs.js` (built-in) or `custom_songs` table (admin-managed)
- Videos stored in Supabase `media` bucket, referenced in `country_videos` table

## Things to Watch Out For

- `AdminPanel.jsx` is very large (~86KB) — be careful with full reads, use targeted edits
- `EurovisionVoting.jsx` and `SongDetail.jsx` are also large (~32-36KB each)
- No test suite exists — always verify with `npm run build`
- Supabase anon key is committed (this is expected — it's a public client key, RLS handles security)
