import type { ReactElement } from 'react';
import { LuFolderPlus, LuHouse, LuLayoutGrid, LuLock, LuStar } from 'react-icons/lu';
import { APP_NAME } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useI18n } from '../../i18n';
import { LogoMark } from '../ui/LogoMark';
import { CategoryTree } from './CategoryTree';

/** Primary navigation: home, all, favorites and the category hierarchy. */
export function Sidebar() {
  const { route, navigate, openModal } = useAppUi();
  const { resources, counts, favoritesCount } = useLibrary();
  const { t, plural } = useI18n();

  const item = (
    label: string,
    active: boolean,
    onClick: () => void,
    glyph: ReactElement,
    count?: number,
  ) => (
    <button
      type="button"
      className={`nav-item${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {glyph}
      <span className="nav-item__label">{label}</span>
      {count !== undefined ? <span className="nav-item__count">{count}</span> : null}
    </button>
  );

  return (
    <nav className="sidebar" aria-label={t('nav.main')}>
      <div className="sidebar__brand">
        <span className="brand-mark">
          <LogoMark size={22} />
        </span>
        <span className="brand-name">{APP_NAME}</span>
      </div>

      <div className="sidebar__group">
        {item(t('nav.home'), route.name === 'home', () => navigate({ name: 'home' }), <LuHouse className="icon" size={18} aria-hidden="true" />)}
        {item(t('nav.all'), route.name === 'all', () => navigate({ name: 'all' }), <LuLayoutGrid className="icon" size={18} aria-hidden="true" />, resources.length)}
        {item(t('nav.favorites'), route.name === 'favorites', () => navigate({ name: 'favorites' }), <LuStar className="icon" size={18} aria-hidden="true" />, favoritesCount)}
      </div>

      <div className="sidebar__heading">
        <span>{t('nav.library')}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={t('nav.newCategory')}
          title={t('nav.newCategory')}
          onClick={() => openModal({ kind: 'category', mode: 'create', parentId: null })}
        >
          <LuFolderPlus className="icon" size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar__scroll">
        <CategoryTree />
        {counts.uncategorized > 0 ? (
          <p className="sidebar__note">{plural('nav.uncategorized', counts.uncategorized)}</p>
        ) : null}
      </div>

      <button type="button" className="sidebar__privacy" onClick={() => openModal({ kind: 'settings' })}>
        <LuLock className="icon" size={15} aria-hidden="true" />
        <span>{t('nav.privacy')}</span>
      </button>
    </nav>
  );
}
