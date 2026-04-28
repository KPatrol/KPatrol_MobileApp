'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type AppMode = 'production' | 'developer';

interface AppModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggle: () => void;
  isDev: boolean;
  isProd: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

const STORAGE_KEY = 'kpatrol-app-mode';

export function AppModeProvider({ children }: { children: ReactNode }) {
  // SSR-safe default; hydrate from localStorage on mount
  const [mode, setModeState] = useState<AppMode>('production');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'developer' || saved === 'production') {
      setModeState(saved);
    }
  }, []);

  const setMode = (next: AppMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const toggle = () => setMode(mode === 'production' ? 'developer' : 'production');

  return (
    <AppModeContext.Provider
      value={{
        mode,
        setMode,
        toggle,
        isDev: mode === 'developer',
        isProd: mode === 'production',
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used inside <AppModeProvider>');
  return ctx;
}
