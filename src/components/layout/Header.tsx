import { LuMenu, LuMonitor, LuMoon, LuPlus, LuSettings, LuSun } from 'react-icons/lu';
import { APP_NAME } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useSettings } from '../../hooks/useSettings';
import { THEME_MODES, type ThemeMode } from '../../types';
import { SearchBar } from '../search/SearchBar';
import { LogoMark } from '../ui/LogoMark';

const THEME_LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const THEME_ICON = { system: LuMonitor, light: LuSun, dark: LuMoon } as const;

export function Header() {
  const { openModal, setDrawerOpen, route, navigate } = useAppUi();
  const { settings, update } = useSettings();

  const nextTheme = THEME_MODES[(THEME_MODES.indexOf(settings.theme) + 1) % THEME_MODES.length];
  const ThemeGlyph = THEME_ICON[settings.theme];

  return (
    <header className="header glass" role="banner">
      <div className="header__row">
        <button
          type="button"
          className="icon-button header__menu"
          aria-label="Open categories"
          onClick={() => setDrawerOpen(true)}
        >
          <LuMenu className="icon" size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="header__brand"
          aria-label={`${APP_NAME} home`}
          onClick={() => navigate({ name: 'home' })}
          aria-current={route.name === 'home' ? 'page' : undefined}
        >
          <LogoMark size={22} />
          <span>{APP_NAME}</span>
        </button>

        <div className="header__search">
          <SearchBar />
        </div>

        <div className="header__actions">
          <button
            type="button"
            className="button button--primary header__add"
            onClick={() => openModal({ kind: 'add' })}
          >
            <LuPlus className="icon" size={18} aria-hidden="true" />
            <span>Add</span>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Theme: ${THEME_LABEL[settings.theme]}. Switch to ${THEME_LABEL[nextTheme]}`}
            title={`Theme: ${THEME_LABEL[settings.theme]} (click for ${THEME_LABEL[nextTheme]})`}
            onClick={() => update({ theme: nextTheme })}
          >
            <ThemeGlyph className="icon" size={19} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Settings"
            title="Settings"
            onClick={() => openModal({ kind: 'settings' })}
          >
            <LuSettings className="icon" size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
