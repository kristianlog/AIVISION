import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const { mode } = useTheme();
  const isLight = mode === 'light';

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'calc(100% - 32px)',
      maxWidth: 420,
      background: isLight
        ? 'rgba(255,255,255,0.95)'
        : 'rgba(30,15,60,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 16,
      border: `1px solid ${isLight ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.3)'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Download style={{ width: 22, height: 22, color: 'white' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontWeight: 700,
          fontSize: '0.95rem',
          color: isLight ? '#1e293b' : 'white',
        }}>Install AIVISION</p>
        <p style={{
          margin: '2px 0 0',
          fontSize: '0.8rem',
          color: isLight ? '#64748b' : 'rgba(196,181,253,0.7)',
        }}>Add to your home screen for quick access</p>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          border: 'none',
          borderRadius: 10,
          color: 'white',
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
          flexShrink: 0,
          width: 'auto',
          margin: 0,
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: isLight ? '#94a3b8' : 'rgba(196,181,253,0.5)',
          flexShrink: 0,
          width: 'auto',
          margin: 0,
        }}
      >
        <X style={{ width: 18, height: 18 }} />
      </button>
    </div>
  );
}
