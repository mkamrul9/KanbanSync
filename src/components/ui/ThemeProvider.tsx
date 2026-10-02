'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('ks-theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    mq.removeEventListener('change', callback);
  };
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getThemeSnapshot, () => 'dark');

  const applyTheme = (next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('ks-theme', next);
    window.dispatchEvent(new Event('storage'));
  };

  const setTheme = (next: Theme) => {
    applyTheme(next);
    localStorage.setItem('ks-theme', next);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
