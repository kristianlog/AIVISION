import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { User, Mail, Lock, Eye, EyeOff, X } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState(null);

  // Check if user is already authenticated
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          onAuthSuccess(session.user, profile);
        } else {
          setError('Please complete your profile setup');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              name: formData.name,
              email: formData.email,
              created_at: new Date().toISOString()
            });

          if (profileError) throw profileError;

          if (authData.session) {
            onAuthSuccess(authData.user, { name: formData.name, email: formData.email });
          } else {
            setError('Please check your email to confirm your account');
          }
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              name: formData.name || authData.user.email?.split('@')[0] || 'User',
              email: authData.user.email,
              created_at: new Date().toISOString()
            });
          
          if (createError) throw createError;
          onAuthSuccess(authData.user, { 
            name: formData.name || authData.user.email?.split('@')[0] || 'User', 
            email: authData.user.email 
          });
        } else {
          onAuthSuccess(authData.user, profile);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Google auth error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Glass Card */}
          <div className="backdrop-blur-xl">
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <button className="text-white/60 hover:text-white/80 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="mb-4">
                <span className="text-white/80 text-lg">✦ ✧</span>
                <h1 className="text-white text-2xl font-bold tracking-wider inline mx-2">AIVISION</h1>
                <span className="text-white/80 text-lg">✧ ✦</span>
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">
                {isSignUp ? 'Create Account' : 'Welcome back'}
              </h2>
              <p className="text-white/70 text-sm">Vote for your favourites</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-6">
                <p className="text-red-200 text-sm text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {isSignUp && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={isSignUp}
                    style={{paddingLeft: '3rem'}}
                  />
                </div>
              )}

              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                <input
                  type="email"
                  name="email"
                  placeholder="Username or email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{paddingLeft: '3rem'}}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  style={{paddingLeft: '3rem', paddingRight: '3rem'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {!isSignUp && (
                <div className="text-center">
                  <button type="button" className="text-white/60 text-sm hover:text-white/80 transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-500 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Login'}</span>
                )}
              </button>
            </form>

            {/* Simple Google Login */}
            <div className="text-center mb-6">
              <p className="text-white/60 text-sm mb-3">or</p>
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <span className="text-white/60 text-sm">Don't have an account? </span>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;