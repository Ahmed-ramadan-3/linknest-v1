import brand from '../../config/brand.json';
import { PREFS_STORAGE_KEY } from '../../config/app';
import type { AppSettings, MotionMode, ThemeMode } from '../../types';
import { MOTION_MODES, THEME_MODES } from '../../types';
import { cleanIsoDate } from '../validation/sanitize';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  motion: 'system',
  remoteThumbnails: true,
  lastExportAt: null,
};

/** Tiny preferences live in localStorage so they can be applied before first paint. */
export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
    const record = parsed as Record<string, unknown>;
    return {
      theme: THEME_MODES.includes(record.theme as ThemeMode) ? (record.theme as ThemeMode) : DEFAULT_SETTINGS.theme,
      motion: MOTION_MODES.includes(record.motion as MotionMode) ? (record.motion as MotionMode) : DEFAULT_SETTINGS.motion,
      remoteThumbnails: typeof record.remoteThumbnails === 'boolean' ? record.remoteThumbnails : DEFAULT_SETTINGS.remoteThumbnails,
      lastExportAt: cleanIsoDate(record.lastExportAt),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
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

/** Writes the resolved theme/motion to <html> so CSS can react to them. */
export function applyAppearance(settings: AppSettings): void {
  const root = document.documentElement;
  const theme = resolveTheme(settings.theme);
  root.dataset.theme = theme;
  root.dataset.themeMode = settings.theme;
  root.dataset.motion = resolveMotion(settings.motion);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', theme === 'dark' ? brand.themeColorDark : brand.themeColorLight);
}

/** Briefly enables CSS transitions on colours so a theme change animates smoothly. */
export function animateThemeChange(): void {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  window.setTimeout(() => root.classList.remove('theme-transition'), 450);
}
