import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthCallback = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the session from the URL hash
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (session?.user) {
        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // Error other than "not found"
          throw profileError;
        }

        if (profile && profile.name) {
          // Profile exists with name
          onAuthSuccess(session.user, profile);
        } else {
          // Profile doesn't exist or missing name - need to collect name
          setUser(session.user);
          setName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || '');
          setNeedsName(true);
          setLoading(false);
        }
      } else {
        throw new Error('No session found');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Create or update user profile
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: name.trim(),
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // Success - call onAuthSuccess
      onAuthSuccess(user, {
        id: user.id,
        name: name.trim(),
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url || null
      });
    } catch (error) {
      console.error('Profile creation error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Setting up your account...</h2>
          <p className="text-purple-200">Please wait while we complete your login</p>
        </div>
      </div>
    );
  }

  if (needsName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">🎵 Welcome to AIVISION!</h1>
              <p className="text-purple-200">We just need your name to complete your profile</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Creating Profile...' : 'Complete Setup'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-200 mb-2">Authentication Error</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;