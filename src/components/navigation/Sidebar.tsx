import type { ReactElement } from 'react';
import { LuFolderPlus, LuHouse, LuLayoutGrid, LuLock, LuStar } from 'react-icons/lu';
import { APP_NAME } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { LogoMark } from '../ui/LogoMark';
import { CategoryTree } from './CategoryTree';

/** Primary navigation: home, all, favorites and the category hierarchy. */
export function Sidebar() {
  const { route, navigate, openModal } = useAppUi();
  const { resources, counts } = useLibrary();
  const favorites = resources.filter((r) => r.favorite).length;

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
    <nav className="sidebar" aria-label="Main">
      <div className="sidebar__brand">
        <span className="brand-mark">
          <LogoMark size={22} />
        </span>
        <span className="brand-name">{APP_NAME}</span>
      </div>

      <div className="sidebar__group">
        {item('Home', route.name === 'home', () => navigate({ name: 'home' }), <LuHouse className="icon" size={18} aria-hidden="true" />)}
        {item('All Resources', route.name === 'all', () => navigate({ name: 'all' }), <LuLayoutGrid className="icon" size={18} aria-hidden="true" />, resources.length)}
        {item('Favorites', route.name === 'favorites', () => navigate({ name: 'favorites' }), <LuStar className="icon" size={18} aria-hidden="true" />, favorites)}
      </div>

      <div className="sidebar__heading">
        <span>Library</span>
        <button
          type="button"
          className="icon-button"
          aria-label="New category"
          title="New category"
          onClick={() => openModal({ kind: 'category', mode: 'create', parentId: null })}
        >
          <LuFolderPlus className="icon" size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar__scroll">
        <CategoryTree />
        {counts.uncategorized > 0 ? (
          <p className="sidebar__note">
            {counts.uncategorized} resource{counts.uncategorized === 1 ? ' is' : 's are'} uncategorized. Find
            {counts.uncategorized === 1 ? ' it' : ' them'} in All Resources.
          </p>
        ) : null}
      </div>

      <button type="button" className="sidebar__privacy" onClick={() => openModal({ kind: 'settings' })}>
        <LuLock className="icon" size={15} aria-hidden="true" />
        <span>Stored only in this browser</span>
      </button>
    </nav>
  );
}
