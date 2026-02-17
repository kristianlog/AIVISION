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
};

const ThemeContext = createContext({ theme: DEFAULT_THEME, updateTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);

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
    <ThemeContext.Provider value={{ theme, updateTheme, reloadTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
