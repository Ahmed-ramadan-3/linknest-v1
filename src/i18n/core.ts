import { LANGUAGES, type Category, type Language } from '../types';
import { en, enSeeds, type Message, type MessageKey } from './en';

export type { Language, MessageKey };
export type Params = Record<string, string | number>;

/** Text direction for each language. */
export const DIRECTION: Record<Language, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl' };
/** BCP-47 locale used for dates. Latin digits keep numbers consistent with the rest of the UI. */
export const LOCALE: Record<Language, string> = { en: 'en', ar: 'ar-u-nu-latn' };

interface Bundle {
  messages: Record<string, Message>;
  seeds: Record<string, string>;
}

const BUNDLES: Partial<Record<Language, Bundle>> = {
  en: { messages: en, seeds: enSeeds },
};

let current: Language = 'en';
const pluralRules = new Map<Language, Intl.PluralRules>();

/** First-visit language: Arabic when the browser is set to Arabic, otherwise English. */
export function detectLanguage(): Language {
  try {
    const preferred = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
    return preferred.startsWith('ar') ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

export function getLanguage(): Language {
  return current;
}

/** Loads a language's text. English ships in the main bundle; Arabic is fetched on demand. */
export async function loadLanguage(language: Language): Promise<void> {
  if (BUNDLES[language]) return;
  if (language === 'ar') {
    const module = await import('./ar');
    BUNDLES.ar = { messages: module.ar, seeds: module.arSeeds };
  }
}

function select(message: Message, params?: Params): string {
  if (typeof message === 'string') return message;
  const n = typeof params?.n === 'number' ? params.n : Number(params?.n ?? 0);
  let rules = pluralRules.get(current);
  if (!rules) {
    rules = new Intl.PluralRules(current);
    pluralRules.set(current, rules);
  }
  return message[rules.select(n)] ?? message.other;
}

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * Translates a key into the current language. Safe to call from plain functions (validation,
 * storage errors); React components should use `useI18n()` so they re-render on a language change.
 */
export function translate(key: MessageKey, params?: Params): string {
  const bundle = BUNDLES[current] ?? BUNDLES.en;
  const message = bundle?.messages[key] ?? en[key];
  return fill(select(message, params), params);
}

/** Starter categories show in the current language until the user renames them. */
export function categoryDisplayName(category: Pick<Category, 'name' | 'seedKey'>): string {
  const key = category.seedKey;
  if (!key || enSeeds[key] !== category.name) return category.name;
  return BUNDLES[current]?.seeds[key] ?? category.name;
}

/** Sets the language used by translate(). Called by the provider while rendering. */
export function setCurrentLanguage(language: Language): void {
  current = language;
}

export function hasBundle(language: Language): boolean {
  return Boolean(BUNDLES[language]);
}

export function getBundleTagline(language: Language): string | null {
  const message = BUNDLES[language]?.messages['app.tagline'];
  return typeof message === 'string' ? message : null;
}

/** Each language's own name, shown on the language switch regardless of the current language. */
export const NATIVE_NAME: Record<Language, string> = { en: 'English', ar: 'العربية' };
export const SHORT_NAME: Record<Language, string> = { en: 'EN', ar: 'ع' };
