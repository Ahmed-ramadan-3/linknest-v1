import { LuTriangleAlert } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useLibrary } from '../../hooks/useLibrary';
import { useI18n } from '../../i18n';
import { Dashboard } from '../../pages/Dashboard';
import { LibraryPage } from '../../pages/LibraryPage';
import { ModalHost } from '../modals/ModalHost';
import { MobileNav } from '../navigation/MobileNav';
import { Sidebar } from '../navigation/Sidebar';
import { Drawer } from './Drawer';
import { Header } from './Header';
import { useSettings } from '../../hooks/useSettings';

export function AppShell({ inert }: { inert: boolean }) {
  const { route } = useAppUi();
  const { status, notice, retry } = useLibrary();
  const { t } = useI18n();
  const { settings } = useSettings();
  const isDesktop = useIsDesktop();
  const sidebarHidden = settings.sidebarHidden;

  return (
    <div className="shell" inert={inert} data-sidebar={sidebarHidden ? 'hidden' : 'shown'}>
      <a href="#main" className="skip-link" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        {t('nav.skip')}
      </a>
      {/* The tree is only built where it is visible: here on desktop, in the drawer elsewhere. */}
      <aside id="library-sidebar" className="shell__sidebar glass" inert={sidebarHidden} aria-hidden={sidebarHidden}>
        {isDesktop ? <Sidebar /> : null}
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
            <p className="muted" role="status">{t('shell.opening')}</p>
          ) : status === 'error' ? (
            <div className="empty glass" role="alert">
              <h2 className="empty__title">{t('shell.errorTitle')}</h2>
              <p className="empty__message">{notice}</p>
              <div className="empty__actions">
                <button type="button" className="button button--primary" onClick={retry}>
                  {t('common.tryAgain')}
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
