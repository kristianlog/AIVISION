import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { isAdmin } from './adminConfig';
import Auth from './Auth';
import AuthCallback from './AuthCallback';
import EurovisionVoting from './EurovisionVoting';
import AdminPanel from './AdminPanel';
import { User, LogOut, Shield } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const fetchingRef = useRef(false);

  const fetchUserProfile = async (userId) => {
    if (fetchingRef.current) return;
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

    // Listen for auth changes — skip profile fetch if handleAuthSuccess already set it
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);

      if (!session?.user) {
        setUserProfile(null);
        setLoading(false);
      }
      // Don't fetch profile here — it's already handled by:
      // 1. initAuth on mount (for refresh)
      // 2. handleAuthSuccess on login (from Auth.jsx)
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency — runs once

  const handleAuthSuccess = (user, profile) => {
    setSession({ user });
    setUserProfile(profile);
    setLoading(false);
  };

  const handleSignOut = async () => {
    // Always clear local state first so the UI updates immediately
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading AIVISION...</h2>
          <p className="text-purple-200">Preparing your Eurovision experience</p>
        </div>
      </div>
    );
  }

  const UserHeader = () => (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '14px 20px',
      marginBottom: '24px',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
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
          <p style={{ color: 'white', fontWeight: 600, margin: 0, fontSize: '0.95rem' }}>
            {userProfile?.name}
            {userIsAdmin && (
              <span style={{
                marginLeft: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#c084fc',
                background: 'rgba(139,92,246,0.15)',
                padding: '2px 8px',
                borderRadius: '6px',
                verticalAlign: 'middle',
              }}>ADMIN</span>
            )}
          </p>
          <p style={{ color: 'rgba(196,181,253,0.6)', fontSize: '0.8rem', margin: 0 }}>Eurovision Voter</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {userIsAdmin && (
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: showAdmin ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '10px',
              color: '#c084fc',
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
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            color: 'rgba(252,165,165,0.8)',
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
                    <EurovisionVoting userProfile={userProfile} />
                  )}
                </div>
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;