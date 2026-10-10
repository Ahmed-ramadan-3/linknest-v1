import { useState } from 'react';
import {
  LuLanguages,
  LuMenu,
  LuMonitor,
  LuMoon,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPlus,
  LuSettings,
  LuSun,
} from 'react-icons/lu';
import { APP_NAME } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useSettings } from '../../hooks/useSettings';
import { NATIVE_NAME, SHORT_NAME, useI18n } from '../../i18n';
import { THEME_MODES } from '../../types';
import { SearchBar } from '../search/SearchBar';
import { LogoMark } from '../ui/LogoMark';

const THEME_ICON = { system: LuMonitor, light: LuSun, dark: LuMoon } as const;

export function Header() {
  const { openModal, setDrawerOpen, route, navigate } = useAppUi();
  const { settings, update } = useSettings();
  const { t, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const scrolledAway = useHideOnScroll();
  const [searchFocused, setSearchFocused] = useState(false);
  const searchHidden = scrolledAway && !searchFocused;

  const nextTheme = THEME_MODES[(THEME_MODES.indexOf(settings.theme) + 1) % THEME_MODES.length];
  const ThemeGlyph = THEME_ICON[settings.theme];
  const otherLanguage = lang === 'ar' ? 'en' : 'ar';

  // One button, two jobs: on wide screens it hides/shows the sidebar, on narrow ones it opens the drawer.
  const MenuGlyph = !isDesktop ? LuMenu : settings.sidebarHidden ? LuPanelLeftOpen : LuPanelLeftClose;
  const menuLabel = !isDesktop
    ? t('nav.openCategories')
    : settings.sidebarHidden
      ? t('nav.showLibrary')
      : t('nav.hideLibrary');
  const onMenu = () => {
    if (isDesktop) update({ sidebarHidden: !settings.sidebarHidden });
    else setDrawerOpen(true);
  };

  return (
    <header className="header glass" role="banner">
      <div className="header__row">
        <button
          type="button"
          className="icon-button header__menu"
          aria-label={menuLabel}
          title={menuLabel}
          aria-expanded={isDesktop ? !settings.sidebarHidden : undefined}
          aria-controls={isDesktop ? 'library-sidebar' : undefined}
          onClick={onMenu}
        >
          <MenuGlyph className="icon icon--dir" size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="header__brand"
          aria-label={t('header.home', { name: APP_NAME })}
          onClick={() => navigate({ name: 'home' })}
          aria-current={route.name === 'home' ? 'page' : undefined}
        >
          <LogoMark size={22} />
          <span>{APP_NAME}</span>
        </button>

        <div
          className={`header__search${searchHidden ? ' is-hidden' : ''}`}
          inert={searchHidden}
          onFocusCapture={() => setSearchFocused(true)}
          onBlurCapture={() => setSearchFocused(false)}
        >
          <SearchBar />
        </div>

        <div className="header__actions">
          <button
            type="button"
            className="button button--primary header__add"
            onClick={() => openModal({ kind: 'add' })}
          >
            <LuPlus className="icon" size={18} aria-hidden="true" />
            <span>{t('common.add')}</span>
          </button>
          <button
            type="button"
            className="button button--ghost header__lang"
            lang={otherLanguage}
            aria-label={t('lang.switchTo', { language: NATIVE_NAME[otherLanguage] })}
            title={t('lang.switchTo', { language: NATIVE_NAME[otherLanguage] })}
            onClick={() => update({ language: otherLanguage })}
          >
            <LuLanguages className="icon" size={18} aria-hidden="true" />
            <span className="header__lang-full" aria-hidden="true">{NATIVE_NAME[otherLanguage]}</span>
            <span className="header__lang-short" aria-hidden="true">{SHORT_NAME[otherLanguage]}</span>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('header.themeLabel', {
              current: t(`theme.${settings.theme}`),
              next: t(`theme.${nextTheme}`),
            })}
            title={t('header.themeTitle', {
              current: t(`theme.${settings.theme}`),
              next: t(`theme.${nextTheme}`),
            })}
            onClick={() => update({ theme: nextTheme })}
          >
            <ThemeGlyph className="icon" size={19} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('header.settings')}
            title={t('header.settings')}
            onClick={() => openModal({ kind: 'settings' })}
          >
            <LuSettings className="icon" size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
