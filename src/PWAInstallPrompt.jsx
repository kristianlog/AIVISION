import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useTheme } from './ThemeContext';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { mode } = useTheme();
  const isLight = mode === 'light';

  useEffect(() => {
    // Already running as installed PWA — hide everything
    if (isStandalone()) return;

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const recentlyDismissed = dismissed && Date.now() - parseInt(dismissed) < 3 * 24 * 60 * 60 * 1000;

    // Listen for Chrome/Edge/Android install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!recentlyDismissed) {
        setShowBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // On iOS, show a manual guide after a short delay
    if (isIOS() && !recentlyDismissed) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler); };
    }

    // On Android/desktop Chrome, if beforeinstallprompt hasn't fired after 4s
    // and wasn't recently dismissed, show a gentle hint
    const fallbackTimer = setTimeout(() => {
      if (!recentlyDismissed) {
        setShowBanner(true);
      }
    }, 4000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // No deferred prompt available — show browser-specific guidance
      setShowIOSGuide(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  const iosInstructions = isIOS();

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: 420,
        background: isLight
          ? 'rgba(255,255,255,0.97)'
          : 'rgba(30,15,60,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: `1px solid ${isLight ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.3)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '16px',
        display: 'flex',
        flexDirection: showIOSGuide ? 'column' : 'row',
        alignItems: showIOSGuide ? 'stretch' : 'center',
        gap: 12,
        animation: 'slideUp 0.3s ease-out',
      }}>
        {showIOSGuide ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{
                margin: 0, fontWeight: 700, fontSize: '1rem',
                color: isLight ? '#1e293b' : 'white',
              }}>Install AIVISION</p>
              <button onClick={handleDismiss} style={{
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                color: isLight ? '#94a3b8' : 'rgba(196,181,253,0.5)',
                width: 'auto', margin: 0,
              }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              color: isLight ? '#475569' : 'rgba(196,181,253,0.8)',
              fontSize: '0.88rem', lineHeight: 1.5,
            }}>
              {iosInstructions ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>1.</span>
                    <span>Tap the <Share style={{ width: 16, height: 16, verticalAlign: 'middle', display: 'inline' }} /> <strong>Share</strong> button in Safari</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>2.</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>3.</span>
                    <span>Tap <strong>"Add"</strong> to confirm</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>1.</span>
                    <span>Tap the <strong>menu (⋮)</strong> in your browser</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>2.</span>
                    <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Download style={{ width: 22, height: 22, color: 'white' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontWeight: 700, fontSize: '0.95rem',
                color: isLight ? '#1e293b' : 'white',
              }}>Install AIVISION</p>
              <p style={{
                margin: '2px 0 0', fontSize: '0.8rem',
                color: isLight ? '#64748b' : 'rgba(196,181,253,0.7)',
              }}>Add to home screen for quick access</p>
            </div>
            <button onClick={handleInstall} style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none', borderRadius: 10, color: 'white',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              flexShrink: 0, width: 'auto', margin: 0,
            }}>
              Install
            </button>
            <button onClick={handleDismiss} style={{
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              color: isLight ? '#94a3b8' : 'rgba(196,181,253,0.5)',
              flexShrink: 0, width: 'auto', margin: 0,
            }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
