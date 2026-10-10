import { useEffect, useRef, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'son-durak:theme';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia(SYSTEM_QUERY).matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', theme === 'dark' ? '#111318' : '#f5f6f8',
  );
}

export function useTheme() {
  const preference = useRef<Theme | null>(savedTheme());
  const [theme, setTheme] = useState<Theme>(() => preference.current ?? systemTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_QUERY);
    const syncSystem = () => {
      if (!preference.current) setTheme(systemTheme());
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      preference.current = savedTheme();
      setTheme(preference.current ?? systemTheme());
    };
    media.addEventListener('change', syncSystem);
    window.addEventListener('storage', syncStorage);
    return () => {
      media.removeEventListener('change', syncSystem);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    preference.current = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Still works for this visit. */ }
    applyTheme(next);
    setTheme(next);
  };

  return { theme, toggleTheme };
}
