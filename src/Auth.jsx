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

  // Email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

    // Validation
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (isSignUp && formData.name.length < 2) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

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
            setError('Account created! Please check your email to verify your account');
          }
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        // Try to fetch existing profile, but don't fail if it aborts
        let profile = null;
        try {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (!profileError) {
            profile = data;
          } else if (profileError.code === 'PGRST116') {
            // Profile not found — create one
            await supabase.from('profiles').insert({
              id: authData.user.id,
              name: authData.user.email?.split('@')[0] || 'User',
              email: authData.user.email,
              created_at: new Date().toISOString()
            });
          }
        } catch (fetchErr) {
          console.warn('Profile fetch failed, using fallback:', fetchErr.message);
        }

        // Always succeed login — use profile data or fallback
        onAuthSuccess(authData.user, profile || {
          id: authData.user.id,
          name: authData.user.email?.split('@')[0] || 'User',
          email: authData.user.email
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (error.message?.includes('Invalid login')) {
        setError('Invalid email or password.');
      } else {
        setError(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #ec4899 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Animated background bubbles */}
      <div style={{
        position: 'absolute',
        top: '10%', left: '10%',
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
        borderRadius: '50%', 
        filter: 'blur(40px)',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '60%', right: '15%',
        width: '150px', height: '150px',
        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)',
        borderRadius: '50%', 
        filter: 'blur(30px)',
        animation: 'float 8s ease-in-out infinite reverse'
      }}></div>

      {/* Stars */}
      <div style={{position: 'absolute', top: '15%', left: '15%', color: 'rgba(255,255,255,0.4)', fontSize: '20px'}}>✦</div>
      <div style={{position: 'absolute', top: '25%', right: '20%', color: 'rgba(255,255,255,0.3)', fontSize: '16px'}}>✦</div>
      <div style={{position: 'absolute', bottom: '30%', left: '20%', color: 'rgba(255,255,255,0.4)', fontSize: '18px'}}>✦</div>
      <div style={{position: 'absolute', bottom: '20%', right: '25%', color: 'rgba(255,255,255,0.35)', fontSize: '22px'}}>✦</div>

      {/* Main Card */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '24px',
        padding: '2.5rem',
        maxWidth: '380px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Close Button */}
        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem'}}>
          <X size={24} style={{color: 'rgba(255,255,255,0.6)', cursor: 'pointer'}} />
        </div>

        {/* Logo */}
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <div style={{marginBottom: '1rem'}}>
            <span style={{color: 'rgba(255,255,255,0.8)', fontSize: '18px'}}>✦ ✧ </span>
            <span style={{color: 'white', fontSize: '24px', fontWeight: 'bold', margin: '0 8px'}}>AIVISION</span>
            <span style={{color: 'rgba(255,255,255,0.8)', fontSize: '18px'}}> ✧ ✦</span>
          </div>
          <h2 style={{color: 'white', fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0'}}>
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h2>
          <p style={{color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0}}>Vote for your favourites</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '1.5rem'
          }}>
            <p style={{color: '#fecaca', fontSize: '14px', textAlign: 'center', margin: 0}}>{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailAuth}>
          {isSignUp && (
            <div style={{position: 'relative', marginBottom: '16px'}}>
              <User size={20} style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.6)'
              }} />
              <input
                type="text"
                name="name"
                placeholder="Your name"
                value={formData.name}
                onChange={handleInputChange}
                required={isSignUp}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{position: 'relative', marginBottom: '16px'}}>
            <User size={20} style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.6)'
            }} />
            <input
              type="email"
              name="email"
              placeholder="Username or email"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{position: 'relative', marginBottom: '16px'}}>
            <Lock size={20} style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.6)'
            }} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '16px 48px 16px 48px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isSignUp && (
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <button type="button" style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                Forgot password?
              </button>
            </div>
          )}

          {/* Gradient Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #06b6d4)',
              border: 'none',
              borderRadius: '16px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '24px',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Register' : 'Login')}
          </button>
        </form>

        {/* Sign up link */}
        <div style={{textAlign: 'center'}}>
          <span style={{color: 'rgba(255,255,255,0.6)', fontSize: '14px'}}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a855f7',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Sign in' : 'Register'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        
        input:focus {
          outline: none;
          border-color: rgba(168, 85, 247, 0.6) !important;
          background: rgba(255, 255, 255, 0.15) !important;
        }
        
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Auth;