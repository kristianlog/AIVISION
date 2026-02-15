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

  const handleAppleAuth = async () => {
    setLoading(true);
    setError(null);
    // Apple auth would go here
    setError('Apple login coming soon!');
    setLoading(false);
  };

  const handleFacebookAuth = async () => {
    setLoading(true);
    setError(null);
    // Facebook auth would go here  
    setError('Facebook login coming soon!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-800 to-indigo-900">
        {/* Animated Bokeh Effects */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-pink-400/30 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-48 h-48 bg-cyan-400/25 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 bg-yellow-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-20 w-56 h-56 bg-purple-400/20 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-green-400/25 rounded-full blur-lg animate-pulse delay-300"></div>
        
        {/* Floating Stars */}
        <div className="absolute top-16 left-16 text-white/40 text-2xl animate-twinkle">✦</div>
        <div className="absolute top-32 right-24 text-white/30 text-lg animate-twinkle delay-500">✦</div>
        <div className="absolute bottom-40 left-24 text-white/40 text-xl animate-twinkle delay-1000">✦</div>
        <div className="absolute bottom-24 right-40 text-white/35 text-2xl animate-twinkle delay-700">✦</div>
        <div className="absolute top-1/3 right-1/4 text-white/25 text-sm animate-twinkle delay-300">✦</div>
        <div className="absolute top-2/3 left-1/3 text-white/40 text-lg animate-twinkle delay-800">✦</div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Glass Card */}
          <div className="backdrop-blur-xl bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl">
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
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent backdrop-blur-sm"
                  />
                </div>
              )}

              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                <input
                  type="email"
                  name="email"
                  placeholder="Username or mail"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent backdrop-blur-sm"
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
                  className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-transparent backdrop-blur-sm"
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

              {/* Gradient Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-500 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                ) : (
                  <span>{isSignUp ? 'Register' : 'Login'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-white/60">or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="flex justify-center space-x-4 mb-6">
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all duration-200 transform hover:scale-110 disabled:opacity-50"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>

              <button
                onClick={handleFacebookAuth}
                disabled={loading}
                className="w-14 h-14 bg-[#1877F2] rounded-full flex items-center justify-center hover:bg-[#166FE5] transition-all duration-200 transform hover:scale-110 disabled:opacity-50"
              >
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              <button
                onClick={handleAppleAuth}
                disabled={loading}
                className="w-14 h-14 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-all duration-200 transform hover:scale-110 disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 2.006c.856.089 1.691.395 2.368.895.626.46 1.177 1.144 1.443 1.916.243.704.19 1.37-.116 2.022-.29.616-.757 1.085-1.328 1.392-.511.274-1.068.395-1.637.339-.89-.088-1.729-.468-2.368-1.041-.626-.562-1.07-1.346-1.176-2.158-.085-.653-.007-1.27.251-1.858.308-.7.853-1.262 1.563-1.507zm5.456 4.645c-.834-.948-1.961-1.491-3.176-1.525-.098-.003-.196-.003-.294 0-1.215.034-2.342.577-3.176 1.525-.678.772-1.035 1.789-1.035 2.853 0 3.348 2.031 6.417 4.893 7.703.508.228 1.041.228 1.549 0 2.862-1.286 4.893-4.355 4.893-7.703 0-1.064-.357-2.081-1.035-2.853z"/>
                </svg>
              </button>
            </div>

            {/* Guest Option */}
            <button 
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl text-white/80 font-medium transition-all duration-200 mb-6"
              onClick={() => setError('Guest mode coming soon!')}
            >
              Continue as guest
            </button>

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

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Auth;