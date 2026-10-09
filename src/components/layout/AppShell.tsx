import { LuTriangleAlert } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { Dashboard } from '../../pages/Dashboard';
import { LibraryPage } from '../../pages/LibraryPage';
import { ModalHost } from '../modals/ModalHost';
import { MobileNav } from '../navigation/MobileNav';
import { Sidebar } from '../navigation/Sidebar';
import { Drawer } from './Drawer';
import { Header } from './Header';

export function AppShell({ inert }: { inert: boolean }) {
  const { route } = useAppUi();
  const { status, notice, retry } = useLibrary();

  return (
    <div className="shell" inert={inert}>
      <a href="#main" className="skip-link" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        Skip to content
      </a>
      <aside className="shell__sidebar glass">
        <Sidebar />
      </aside>
      <div className="shell__content">
        <Header />
        <main id="main" className="main" tabIndex={-1}>
          {notice && status === 'ready' ? (
            <p className="notice notice--warn" role="status">
              <LuTriangleAlert className="icon" size={16} aria-hidden="true" /> {notice}
            </p>
          ) : null}

          {status === 'loading' ? (
            <p className="muted" role="status">Opening your library…</p>
          ) : status === 'error' ? (
            <div className="empty glass" role="alert">
              <h2 className="empty__title">Your library could not be opened</h2>
              <p className="empty__message">{notice}</p>
              <div className="empty__actions">
                <button type="button" className="button button--primary" onClick={retry}>
                  Try again
                </button>
              </div>
            </div>
          ) : route.name === 'home' ? (
            <Dashboard />
          ) : route.name === 'all' ? (
            <LibraryPage scope="all" />
          ) : route.name === 'favorites' ? (
            <LibraryPage scope="favorites" />
          ) : (
            <LibraryPage scope={{ categoryId: route.id }} />
          )}
        </main>
      </div>
      <MobileNav />
      <Drawer />
      {status === 'ready' ? <ModalHost /> : null}
    </div>
  );
}
