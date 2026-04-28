'use client';

// Lightweight i18n for the K-Patrol PWA.
//
// Why not next-intl? The app uses the App Router with a single root layout
// and no localized routing. Mobile-only UI, 2 locales (vi, en) — a tiny
// context + JSON dictionary is cheaper than rewiring routing.
//
// Usage:
//   const { t, locale, setLocale } = useI18n();
//   <button>{t('controls.stop')}</button>
//
// Keys are dot-paths, resolved against the active dictionary.

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'vi' | 'en';

const DICTS = {
  vi: {
    common: {
      online:     'Đang hoạt động',
      offline:    'Ngoại tuyến',
      loading:    'Đang tải…',
      save:       'Lưu',
      cancel:     'Huỷ',
      delete:     'Xoá',
      undo:       'Hoàn tác',
      confirm:    'Xác nhận',
      close:      'Đóng',
    },
    controls: {
      forward:    'Tiến',
      backward:   'Lùi',
      left:       'Trái',
      right:      'Phải',
      strafeLeft: 'Rẽ ngang trái',
      strafeRight:'Rẽ ngang phải',
      stop:       'Dừng',
      emergency:  'Dừng khẩn cấp',
    },
    dashboard: {
      title:      'Bảng điều khiển K-Patrol',
      robots:     'Robot',
      mode:       'Chế độ',
      speed:      'Tốc độ',
      battery:    'Pin',
      uptime:     'Thời gian hoạt động',
    },
    path: {
      drawHere:   'Vẽ đường đi robot',
      steps:      'bước',
      addToBuilder: 'Thêm vào builder',
      clear:      'Xoá',
      undoStroke: 'Hoàn tác nét vẽ',
    },
    auth: {
      signIn:     'Đăng nhập',
      signOut:    'Đăng xuất',
      email:      'Email',
      password:   'Mật khẩu',
    },
  },
  en: {
    common: {
      online:     'Online',
      offline:    'Offline',
      loading:    'Loading…',
      save:       'Save',
      cancel:     'Cancel',
      delete:     'Delete',
      undo:       'Undo',
      confirm:    'Confirm',
      close:      'Close',
    },
    controls: {
      forward:    'Forward',
      backward:   'Back',
      left:       'Left',
      right:      'Right',
      strafeLeft: 'Strafe left',
      strafeRight:'Strafe right',
      stop:       'Stop',
      emergency:  'E-Stop',
    },
    dashboard: {
      title:      'K-Patrol Control',
      robots:     'Robots',
      mode:       'Mode',
      speed:      'Speed',
      battery:    'Battery',
      uptime:     'Uptime',
    },
    path: {
      drawHere:   'Draw the robot path',
      steps:      'steps',
      addToBuilder: 'Add to builder',
      clear:      'Clear',
      undoStroke: 'Undo last stroke',
    },
    auth: {
      signIn:     'Sign in',
      signOut:    'Sign out',
      email:      'Email',
      password:   'Password',
    },
  },
} as const;

type Dict = typeof DICTS['vi'];

function lookup(dict: Dict, key: string): string | undefined {
  // Dot-path access without lodash — resolves "path.drawHere" → dict.path.drawHere.
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = 'kpatrol.locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('vi');

  // Restore saved preference on mount (client-only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === 'vi' || saved === 'en') setLocaleState(saved);
    } catch { /* noop — private mode, etc. */ }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l;
    }
  }, []);

  const t = useCallback((key: string, fallback?: string) => {
    const hit = lookup(DICTS[locale] as unknown as Dict, key);
    if (hit) return hit;
    const en = lookup(DICTS.en as unknown as Dict, key);
    return en ?? fallback ?? key;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return createElement(Ctx.Provider, { value }, children);
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fail open with a default so non-wrapped tests don't crash.
    return {
      locale: 'vi',
      setLocale: () => { /* noop */ },
      t: (key, fallback) => lookup(DICTS.vi as Dict, key) ?? fallback ?? key,
    };
  }
  return ctx;
}
