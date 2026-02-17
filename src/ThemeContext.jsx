import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DEFAULT_THEME = {
  appName: 'AIVISION',
  appSubtitle: 'Vote for your favorite songs',
  primaryColor: '#8b5cf6',
  secondaryColor: '#ec4899',
  bgColor1: '#1a0533',
  bgColor2: '#0f172a',
  bgColor3: '#1e1b4b',
  logoUrl: '',
};

export const THEME_PRESETS = [
  { name: 'Default Purple',   primaryColor: '#8b5cf6', secondaryColor: '#ec4899', bgColor1: '#1a0533', bgColor2: '#0f172a', bgColor3: '#1e1b4b' },
  { name: 'Neon Disco',       primaryColor: '#f43f5e', secondaryColor: '#06b6d4', bgColor1: '#0c0a1a', bgColor2: '#1a0a2e', bgColor3: '#0a1628' },
  { name: 'Classic Gold',     primaryColor: '#eab308', secondaryColor: '#f59e0b', bgColor1: '#1c1917', bgColor2: '#0c0a09', bgColor3: '#1c1917' },
  { name: 'Nordic Minimal',   primaryColor: '#60a5fa', secondaryColor: '#93c5fd', bgColor1: '#0f172a', bgColor2: '#1e293b', bgColor3: '#0f172a' },
  { name: 'Retro Synthwave',  primaryColor: '#f97316', secondaryColor: '#a855f7', bgColor1: '#1e0028', bgColor2: '#0a001a', bgColor3: '#1a0010' },
  { name: 'Pastel Pop',       primaryColor: '#f9a8d4', secondaryColor: '#a5b4fc', bgColor1: '#2e1a35', bgColor2: '#1a1a2e', bgColor3: '#2e1a35' },
  { name: 'Dark Elegance',    primaryColor: '#a1a1aa', secondaryColor: '#71717a', bgColor1: '#09090b', bgColor2: '#18181b', bgColor3: '#09090b' },
  { name: 'Midnight Ocean',   primaryColor: '#0ea5e9', secondaryColor: '#2dd4bf', bgColor1: '#0c1222', bgColor2: '#0a0f1a', bgColor3: '#061018' },
  { name: 'Fire & Ice',       primaryColor: '#ef4444', secondaryColor: '#3b82f6', bgColor1: '#1a0a0a', bgColor2: '#0a0a1a', bgColor3: '#1a0a1a' },
  { name: 'Tropical Sunset',  primaryColor: '#fb923c', secondaryColor: '#e879f9', bgColor1: '#2a1a0a', bgColor2: '#1a0a1a', bgColor3: '#0a1a2a' },
];

const ThemeContext = createContext({ theme: DEFAULT_THEME, updateTheme: () => {}, mode: 'dark', toggleMode: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [mode, setMode] = useState(() => localStorage.getItem('aivision_mode') || 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--color-primary', theme.primaryColor);
    r.style.setProperty('--color-secondary', theme.secondaryColor);
    r.style.setProperty('--bg-1', theme.bgColor1);
    r.style.setProperty('--bg-2', theme.bgColor2);
    r.style.setProperty('--bg-3', theme.bgColor3);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('light-mode', mode === 'light');
    localStorage.setItem('aivision_mode', mode);
  }, [mode]);

  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  const loadTheme = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'theme')
        .single();
      if (data?.value) {
        setTheme(prev => ({ ...prev, ...JSON.parse(data.value) }));
      }
    } catch {
      // table may not exist yet — use defaults
    }
  };

  const updateTheme = async (partial) => {
    const merged = { ...theme, ...partial };
    setTheme(merged);
    try {
      await supabase.from('app_settings').upsert(
        { key: 'theme', value: JSON.stringify(merged) },
        { onConflict: 'key' }
      );
    } catch {
      // gracefully handle missing table
    }
    return merged;
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, reloadTheme: loadTheme, mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
