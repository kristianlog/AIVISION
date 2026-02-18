import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { isAdmin } from './adminConfig';
import { ThemeProvider, useTheme } from './ThemeContext';
import Auth from './Auth';
import AuthCallback from './AuthCallback';
import EurovisionVoting from './EurovisionVoting';
import AdminPanel from './AdminPanel';
import { User, LogOut, Shield, Sun, Moon } from 'lucide-react';
import AvatarCropModal from './AvatarCropModal';

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const fetchingRef = useRef(false);
  const profileLoadedRef = useRef(false);
  const votingRef = useRef(null);
  const { mode, toggleMode } = useTheme();

  const fetchUserProfile = async (userId) => {
    if (fetchingRef.current || profileLoadedRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      } else if (profile) {
        setUserProfile(profile);
        profileLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    // Listen for auth changes — fetch profile only if not already loaded
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);

      if (session?.user) {
        // Only fetches if profileLoadedRef is false (skips if already loaded or if handleAuthSuccess set it)
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        profileLoadedRef.current = false;
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency — runs once

  const handleAuthSuccess = (user, profile) => {
    profileLoadedRef.current = true;
    setSession({ user });
    setUserProfile(profile);
    setLoading(false);
  };

  const handleSignOut = async () => {
    // Always clear local state first so the UI updates immediately
    profileLoadedRef.current = false;
    setSession(null);
    setUserProfile(null);
    setShowAdmin(false);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userIsAdmin = isAdmin(userProfile?.email || session?.user?.email);
  const isLight = mode === 'light';

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64,
            border: '4px solid rgba(139,92,246,0.3)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: isLight ? '#1e293b' : 'white', marginBottom: 8 }}>Loading...</h2>
          <p style={{ color: isLight ? '#64748b' : 'rgba(196,181,253,0.7)' }}>Preparing your experience</p>
        </div>
      </div>
    );
  }

  const UserHeader = () => (
    <div className="user-header" style={{
      background: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '14px 20px',
      marginBottom: '24px',
      borderRadius: '14px',
      border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
      boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          onClick={() => setShowAvatarCrop(true)}
          title="Change profile picture"
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt={userProfile.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <User style={{ width: '20px', height: '20px', color: 'white' }} />
          )}
        </div>
        <div>
          <p
            onClick={() => { setShowAdmin(false); votingRef.current?.navigateToProfile(); }}
            style={{ color: isLight ? '#1e293b' : 'white', fontWeight: 600, margin: 0, fontSize: '0.95rem', cursor: 'pointer' }}
          >
            {userProfile?.name}
            {userIsAdmin && (
              <span style={{
                marginLeft: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: isLight ? 'var(--color-primary)' : '#c084fc',
                background: isLight ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.15)',
                padding: '2px 8px',
                borderRadius: '6px',
                verticalAlign: 'middle',
              }}>ADMIN</span>
            )}
          </p>
          <p style={{ color: isLight ? '#64748b' : 'rgba(196,181,253,0.6)', fontSize: '0.8rem', margin: 0 }}>Eurovision Voter</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleMode}
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '10px',
            color: isLight ? '#475569' : 'rgba(196,181,253,0.7)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            width: 'auto',
            margin: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {mode === 'dark' ? <Sun style={{ width: '14px', height: '14px' }} /> : <Moon style={{ width: '14px', height: '14px' }} />}
          <span>{mode === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        {userIsAdmin && (
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: showAdmin
                ? (isLight ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.3)')
                : (isLight ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.1)'),
              border: `1px solid ${isLight ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.3)'}`,
              borderRadius: '10px',
              color: isLight ? 'var(--color-primary)' : '#c084fc',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              width: 'auto',
              margin: 0,
              transition: 'all 0.2s ease',
            }}
          >
            <Shield style={{ width: '14px', height: '14px' }} />
            <span>{showAdmin ? 'Back to App' : 'Admin'}</span>
          </button>
        )}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: isLight ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${isLight ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '10px',
            color: isLight ? '#dc2626' : 'rgba(252,165,165,0.8)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            width: 'auto',
            margin: 0,
          }}
        >
          <LogOut style={{ width: '14px', height: '14px' }} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <Routes>
          <Route
            path="/auth/callback"
            element={<AuthCallback onAuthSuccess={handleAuthSuccess} />}
          />

          <Route
            path="/"
            element={
              !session || !userProfile ? (
                <Auth onAuthSuccess={handleAuthSuccess} />
              ) : (
                <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto' }}>
                  <UserHeader />
                  {showAdmin && userIsAdmin ? (
                    <AdminPanel onBack={() => setShowAdmin(false)} userProfile={userProfile} />
                  ) : (
                    <EurovisionVoting ref={votingRef} userProfile={userProfile} />
                  )}
                </div>
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {showAvatarCrop && userProfile && (
          <AvatarCropModal
            userProfile={userProfile}
            onSave={(url) => {
              setUserProfile(prev => ({ ...prev, avatar_url: url }));
              setShowAvatarCrop(false);
            }}
            onClose={() => setShowAvatarCrop(false)}
          />
        )}
      </div>
    </Router>
  );
}

const AppWithTheme = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

export default AppWithTheme;