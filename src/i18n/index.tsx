import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Language } from '../types';
import {
  DIRECTION,
  LOCALE,
  getBundleTagline,
  getLanguage,
  hasBundle,
  loadLanguage,
  setCurrentLanguage,
  translate,
  type MessageKey,
  type Params,
} from './core';

export * from './core';

interface I18nValue {
  lang: Language;
  dir: 'ltr' | 'rtl';
  locale: string;
  t(key: MessageKey, params?: Params): string;
  /** Shortcut for plural messages: `plural('count.resource', 3)`. */
  plural(key: MessageKey, n: number, params?: Params): string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Applies the language to the document and re-renders consumers once its text is available. */
export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const [loaded, setLoaded] = useState<Language | null>(hasBundle(language) ? language : null);

  // The module-level language is set during render so every child translates consistently.
  setCurrentLanguage(hasBundle(language) ? language : (loaded ?? 'en'));

  useEffect(() => {
    let active = true;
    loadLanguage(language)
      .then(() => {
        if (active) setLoaded(language);
      })
      .catch(() => {
        // Offline and uncached: stay in the language that is already loaded.
      });
    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = DIRECTION[language];
    const description = document.querySelector('meta[name="description"]');
    const tagline = getBundleTagline(language);
    if (description && tagline) description.setAttribute('content', tagline);
  }, [language, loaded]);

  const lang = getLanguage();
  const t = useCallback((key: MessageKey, params?: Params) => translate(key, params), [lang]);
  const plural = useCallback(
    (key: MessageKey, n: number, params?: Params) => translate(key, { ...params, n }),
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, dir: DIRECTION[language], locale: LOCALE[lang], t, plural }),
    [lang, language, t, plural],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
