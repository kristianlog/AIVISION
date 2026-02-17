# AIVISION - Eurovision Voting App

A Eurovision Song Contest voting app built with React, Vite, and Supabase. Browse songs from different countries, cast your votes using the Eurovision scoring system, and see the leaderboard.

---

## Prerequisites

Before you start, make sure you have **Node.js** installed on your computer.

### Installing Node.js

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** (Long Term Support) version
3. Run the installer and follow the prompts
4. To verify it installed correctly, open a terminal and run:
   ```
   node --version
   npm --version
   ```
   You should see version numbers printed (e.g. `v22.x.x` and `10.x.x`).

### What is a terminal?

- **Windows**: Press `Win + R`, type `cmd`, and press Enter. Or search for "PowerShell" in the Start menu.
- **Mac**: Press `Cmd + Space`, type "Terminal", and press Enter.
- **Linux**: Press `Ctrl + Alt + T`.

---

## Getting Started (Step by Step)

### 0. Get the project files on your computer

If you don't have the files yet, you need to download them:

**Option A: Using Git (recommended)**
```bash
git clone https://github.com/kristianlog/AIVISION.git
cd AIVISION
```

**Option B: Download ZIP**
1. Go to https://github.com/kristianlog/AIVISION
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file
5. Open a terminal in the extracted folder

### 1. Open a terminal and navigate to the project folder

```bash
cd /path/to/AIVISION
```

Replace `/path/to/AIVISION` with the actual location of this folder on your computer. For example:
- Windows: `cd C:\Users\YourName\Documents\AIVISION`
- Mac/Linux: `cd ~/Documents/AIVISION`

### 2. Install dependencies

```bash
npm install
```

This downloads all the libraries the app needs. It may take a minute. You only need to do this once (or again if you pull new changes).

### 3. Run the app

```bash
npm run dev
```

You should see output like:

```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 4. Open the app in your browser

Open your web browser (Chrome, Firefox, Edge, Safari, etc.) and go to:

```
http://localhost:5173
```

The app is now running! You should see the login/signup screen.

### 5. Stop the app

Press `Ctrl + C` in the terminal to stop the development server.

---

## Using the App

1. **Sign up** - Create an account with your name, email, and password.
2. **Log in** - Use your email and password to log in.
3. **Browse songs** - See Eurovision songs from 12 different countries.
4. **Vote** - Click on a song to open it, then assign a score (1-12 points, Eurovision style).
5. **My Votes** - See all the votes you've cast.
6. **Leaderboard** - See how songs rank based on everyone's votes.

---

## Available Commands

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm install`       | Installs all dependencies                                 |
| `npm run dev`       | Starts the development server (with live reload)          |
| `npm run build`     | Creates an optimized production build in the `dist/` folder |
| `npm run preview`   | Serves the production build locally for testing           |
| `npm run lint`      | Checks your code for errors and style issues              |

---

## Project Structure

```
AIVISION/
├── src/
│   ├── main.jsx              # Entry point - boots the app
│   ├── App.jsx               # Main app: routing, session, layout
│   ├── Auth.jsx              # Login / signup form
│   ├── AuthCallback.jsx      # Handles OAuth redirects
│   ├── EurovisionVoting.jsx  # Main voting page (tabs: songs, votes, leaderboard)
│   ├── SongCard.jsx          # Individual song card component
│   ├── SongDetail.jsx        # Song detail modal with voting
│   ├── Leaderboard.jsx       # Leaderboard / rankings view
│   ├── songs.js              # Song data (12 countries with lyrics)
│   ├── supabaseClient.js     # Supabase connection setup
│   ├── index.css             # Global styles
│   └── App.css               # App-specific styles
├── public/                   # Static files served as-is
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite build configuration
├── tailwind.config.js        # Tailwind CSS theme customization
├── postcss.config.js         # PostCSS plugins
└── eslint.config.js          # Linting rules
```

---

## Tech Stack

- **React 19** - UI framework
- **Vite 8** - Fast build tool and dev server
- **Supabase** - Authentication and database (backend)
- **Tailwind CSS 4** - Styling
- **React Router** - Page navigation
- **Lucide React** - Icons

---

## Environment Variables (Optional)

The app comes pre-configured with a Supabase project so it works out of the box. If you want to use your own Supabase backend, create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You don't need to do this to get started - the defaults work immediately.

---

## Troubleshooting

### "command not found: npm" or "command not found: node"
Node.js is not installed. Follow the [Installing Node.js](#installing-nodejs) section above.

### Port 5173 is already in use
Another process is using that port. Either stop it, or run Vite on a different port:
```bash
npm run dev -- --port 3000
```
Then open `http://localhost:3000` instead.

### The page is blank or shows errors
Open your browser's developer tools (`F12` or `Ctrl+Shift+I`) and check the Console tab for error messages.

### "npm install" fails
Try deleting `node_modules` and the lock file, then reinstalling:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Can't create account or login - getting errors

**This happens because the Supabase database needs to be set up first.** You have 3 options:

**Option A: Set up the database (recommended)**
1. The app uses a pre-configured Supabase project that may not have the database tables
2. See `SUPABASE_SETUP.md` for detailed instructions to create the required tables
3. Or create your own free Supabase project at https://supabase.com

**Option B: Use without authentication (quick test)**
The app will still work for browsing songs, but you won't be able to save votes or see the leaderboard. To test the UI without auth, you'd need to modify the code.

**Option C: Get the repository with working backend**
If you cloned/downloaded this from GitHub, make sure you have the latest version with proper Supabase configuration.

**Common error messages:**
- "relation 'profiles' does not exist" → Database tables not created (see `SUPABASE_SETUP.md`)
- "Email not confirmed" → Either confirm the email sent to your inbox, or disable email confirmation in Supabase settings
- Network errors → Check your internet connection and that Supabase is accessible

---

## Deploying to Production

To deploy the app (e.g. to Netlify, Vercel, or any static host):

1. Build the app:
   ```bash
   npm run build
   ```
2. The output will be in the `dist/` folder.
3. Upload/deploy the contents of `dist/` to your hosting provider.

The project includes a `public/_redirects` file for Netlify SPA routing.
