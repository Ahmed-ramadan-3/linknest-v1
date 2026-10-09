import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PREFS_STORAGE_KEY } from '../config/app';
import type { AppSettings } from '../types';
import {
  DEFAULT_SETTINGS,
  animateThemeChange,
  applyAppearance,
  clearSettings,
  loadSettings,
  saveSettings,
} from '../lib/prefs';

interface SettingsContextValue {
  settings: AppSettings;
  update(patch: Partial<AppSettings>): void;
  /** Removes saved preferences and returns to defaults. */
  reset(): void;
  /** False when localStorage refused the write (preferences last for this session only). */
  persisted: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [persisted, setPersisted] = useState(true);

  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  // Follow the operating system while "System" is selected.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const queries = [
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];
    const onChange = () => applyAppearance(settings);
    queries.forEach((query) => query.addEventListener('change', onChange));
    return () => queries.forEach((query) => query.removeEventListener('change', onChange));
  }, [settings]);

  // Keep several open tabs in agreement.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PREFS_STORAGE_KEY) setSettings(loadSettings());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.theme && patch.theme !== current.theme) animateThemeChange();
      setPersisted(saveSettings(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearSettings();
    animateThemeChange();
    setSettings({ ...DEFAULT_SETTINGS });
    setPersisted(true);
  }, []);

  const value = useMemo(() => ({ settings, update, reset, persisted }), [settings, update, reset, persisted]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
