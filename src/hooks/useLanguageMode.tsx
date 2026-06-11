import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Language, type UIDictKey } from '../lib/i18n/uiDict';

export type LanguageMode = Language;

const STORAGE_KEY = 'resume-language';

/** 语言代码 → BCP 47 locale 映射 */
const LANG_TO_LOCALE: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  de: 'de',
  es: 'es',
  pt: 'pt',
  it: 'it',
  ru: 'ru',
  ar: 'ar',
  th: 'th',
  vi: 'vi',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
  sv: 'sv',
};

function toLocale(lang: string): string {
  return LANG_TO_LOCALE[lang] ?? lang;
}

function loadInitialLanguageMode(): LanguageMode {
  if (typeof window === 'undefined') {
    return 'zh';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  // 接受任意非空字符串作为语言代码，默认 zh
  return stored && stored.trim() ? stored.trim() : 'zh';
}

// ---- Context ----

type LanguageModeContextValue = {
  mode: LanguageMode;
  setMode: (mode: LanguageMode) => void;
  t: (key: UIDictKey) => string;
};

const LanguageModeContext = createContext<LanguageModeContextValue | null>(null);

export function LanguageModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LanguageMode>(loadInitialLanguageMode);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = toLocale(mode);
  }, [mode]);

  const t = useCallback(
    (key: UIDictKey): string => translate(key, mode),
    [mode],
  );

  const value = useMemo(
    () => ({ mode, setMode, t }),
    [mode, t],
  );

  return (
    <LanguageModeContext.Provider value={value}>
      {children}
    </LanguageModeContext.Provider>
  );
}

export function useLanguageMode() {
  const ctx = useContext(LanguageModeContext);
  if (!ctx) {
    throw new Error('useLanguageMode must be used within <LanguageModeProvider>');
  }
  return ctx;
}
