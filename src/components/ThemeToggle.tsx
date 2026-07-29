'use client';

import {useEffect, useState} from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cc-team-clash:theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
  return 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      suppressHydrationWarning
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
