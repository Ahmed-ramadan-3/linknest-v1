import brand from '../../config/brand.json';
import { PREFS_STORAGE_KEY, VISITED_STORAGE_KEY } from '../../config/app';
import { detectLanguage, isLanguage } from '../../i18n/core';
import type { AppSettings, MotionMode, PerformanceMode, ThemeMode } from '../../types';
import { MOTION_MODES, PERFORMANCE_MODES, THEME_MODES } from '../../types';
import { cleanIsoDate } from '../validation/sanitize';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  motion: 'system',
  language: 'en',
  performance: 'auto',
  sidebarHidden: false,
  remoteThumbnails: true,
  lastExportAt: null,
};

/** Defaults for a first visit: the language follows the browser. */
function freshDefaults(): AppSettings {
  return { ...DEFAULT_SETTINGS, language: detectLanguage() };
}

/** Tiny preferences live in localStorage so they can be applied before first paint. */
export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return freshDefaults();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return freshDefaults();
    const record = parsed as Record<string, unknown>;
    return {
      theme: THEME_MODES.includes(record.theme as ThemeMode) ? (record.theme as ThemeMode) : DEFAULT_SETTINGS.theme,
      motion: MOTION_MODES.includes(record.motion as MotionMode) ? (record.motion as MotionMode) : DEFAULT_SETTINGS.motion,
      language: isLanguage(record.language) ? record.language : detectLanguage(),
      performance: PERFORMANCE_MODES.includes(record.performance as PerformanceMode)
        ? (record.performance as PerformanceMode)
        : DEFAULT_SETTINGS.performance,
      sidebarHidden: record.sidebarHidden === true,
      remoteThumbnails: typeof record.remoteThumbnails === 'boolean' ? record.remoteThumbnails : DEFAULT_SETTINGS.remoteThumbnails,
      lastExportAt: cleanIsoDate(record.lastExportAt),
    };
  } catch {
    return freshDefaults();
  }
}

/** Returns false when storage is unavailable; the setting then lasts for this session only. */
export function saveSettings(settings: AppSettings): boolean {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function clearSettings(): void {
  try {
    window.localStorage.removeItem(PREFS_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function systemPrefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
}

export function resolveMotion(mode: MotionMode): 'reduce' | 'full' {
  if (mode === 'reduce') return 'reduce';
  if (mode === 'full') return 'full';
  return systemPrefersReducedMotion() ? 'reduce' : 'full';
}

interface NavigatorHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean };
}

/** True on devices that likely struggle with blur and large animated layers. */
export function looksLowEnd(): boolean {
  if (typeof navigator === 'undefined') return false;
  const hints = navigator as unknown as NavigatorHints;
  if (hints.connection?.saveData === true) return true;
  if (typeof hints.deviceMemory === 'number' && hints.deviceMemory <= 4) return true;
  if (typeof hints.hardwareConcurrency === 'number' && hints.hardwareConcurrency <= 4) return true;
  return false;
}

export function resolvePerformance(mode: PerformanceMode): 'lite' | 'full' {
  if (mode === 'lite') return 'lite';
  if (mode === 'full') return 'full';
  return looksLowEnd() ? 'lite' : 'full';
}

/** Writes the resolved theme/motion/performance to <html> so CSS can react to them. */
export function applyAppearance(settings: AppSettings): void {
  const root = document.documentElement;
  const theme = resolveTheme(settings.theme);
  root.dataset.theme = theme;
  root.dataset.themeMode = settings.theme;
  root.dataset.motion = resolveMotion(settings.motion);
  root.dataset.perf = resolvePerformance(settings.performance);
  root.dataset.sidebar = settings.sidebarHidden ? 'hidden' : 'shown';
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', theme === 'dark' ? brand.themeColorDark : brand.themeColorLight);
}

/** Briefly enables CSS transitions on colours so a theme change animates smoothly. */
export function animateThemeChange(): void {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  window.setTimeout(() => root.classList.remove('theme-transition'), 450);
}

/** True when this browser has opened the app before (used to shorten the intro). */
export function hasVisitedBefore(): boolean {
  try {
    return window.localStorage.getItem(VISITED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markVisited(): void {
  try {
    window.localStorage.setItem(VISITED_STORAGE_KEY, '1');
  } catch {
    // Without storage the full intro simply plays each time.
  }
}
