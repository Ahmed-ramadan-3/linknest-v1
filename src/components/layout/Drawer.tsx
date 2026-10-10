import { useEffect, useRef } from 'react';
import { useAppUi } from '../../hooks/useAppUi';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { Sidebar } from '../navigation/Sidebar';

/** Off-canvas sidebar for tablets and phones. Escape and the backdrop close it. */
export function Drawer() {
  const { drawerOpen, setDrawerOpen } = useAppUi();
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);

  // A drawer left open while the window grows into the desktop layout would trap focus invisibly.
  useEffect(() => {
    if (isDesktop && drawerOpen) setDrawerOpen(false);
  }, [isDesktop, drawerOpen, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [drawerOpen, setDrawerOpen]);

  if (isDesktop) return null;

  return (
    <div className={`drawer${drawerOpen ? ' is-open' : ''}`} aria-hidden={!drawerOpen} inert={!drawerOpen}>
      <div className="drawer__backdrop" onClick={() => setDrawerOpen(false)} />
      <div className="drawer__panel glass-strong" ref={panelRef}>
        <Sidebar />
      </div>
    </div>
  );
}
