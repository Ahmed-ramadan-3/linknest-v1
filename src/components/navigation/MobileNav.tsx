import type { ReactElement } from 'react';
import { LuFolderTree, LuHouse, LuLayoutGrid, LuPlus, LuStar } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';

/** Bottom navigation for phones. The Add action sits in the bar so it never covers content. */
export function MobileNav() {
  const { route, navigate, openModal, setDrawerOpen } = useAppUi();

  const tab = (label: string, active: boolean, onClick: () => void, glyph: ReactElement) => (
    <button
      type="button"
      className={`mobile-nav__item${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {glyph}
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="mobile-nav glass-strong" aria-label="Quick navigation">
      {tab('Home', route.name === 'home', () => navigate({ name: 'home' }), <LuHouse className="icon" size={21} aria-hidden="true" />)}
      {tab('All', route.name === 'all', () => navigate({ name: 'all' }), <LuLayoutGrid className="icon" size={21} aria-hidden="true" />)}
      <button
        type="button"
        className="mobile-nav__add"
        aria-label="Add resource"
        onClick={() => openModal({ kind: 'add' })}
      >
        <LuPlus className="icon" size={24} aria-hidden="true" />
      </button>
      {tab('Favorites', route.name === 'favorites', () => navigate({ name: 'favorites' }), <LuStar className="icon" size={21} aria-hidden="true" />)}
      {tab('Browse', false, () => setDrawerOpen(true), <LuFolderTree className="icon" size={21} aria-hidden="true" />)}
    </nav>
  );
}
