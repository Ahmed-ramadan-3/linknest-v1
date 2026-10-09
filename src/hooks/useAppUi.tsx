import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { LibraryFilters, ResourceType, SortKey } from '../types';
import { EMPTY_FILTERS } from '../lib/search';
import { useRoute, type Route } from './useRoute';

export type ModalState =
  | { kind: 'none' }
  | { kind: 'add'; type?: ResourceType; categoryId?: string | null }
  | { kind: 'edit'; id: string }
  | { kind: 'detail'; id: string }
  | { kind: 'deleteResource'; id: string }
  | { kind: 'category'; mode: 'create'; parentId: string | null }
  | { kind: 'category'; mode: 'edit'; id: string }
  | { kind: 'deleteCategory'; id: string }
  | { kind: 'settings' };

interface AppUiValue {
  route: Route;
  navigate(route: Route, preset?: Partial<LibraryFilters>): void;
  filters: LibraryFilters;
  setFilters(patch: Partial<LibraryFilters>): void;
  clearFilters(): void;
  sort: SortKey;
  setSort(sort: SortKey): void;
  modal: ModalState;
  openModal(modal: ModalState): void;
  closeModal(): void;
  drawerOpen: boolean;
  setDrawerOpen(open: boolean): void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const AppUiContext = createContext<AppUiValue | null>(null);

/** UI state shared across the shell: route, filters, sort, the open modal and the mobile drawer. */
export function AppUiProvider({ children }: { children: ReactNode }) {
  const [route, go] = useRoute();
  const [filters, setFiltersState] = useState<LibraryFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('newest');
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const setFilters = useCallback((patch: Partial<LibraryFilters>) => {
    setFiltersState((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => setFiltersState(EMPTY_FILTERS), []);

  // Navigating from the sidebar starts from a clean slate (query and filters reset).
  const navigate = useCallback(
    (next: Route, preset?: Partial<LibraryFilters>) => {
      setFiltersState({ ...EMPTY_FILTERS, ...preset });
      setDrawerOpen(false);
      go(next);
    },
    [go],
  );

  const openModal = useCallback((next: ModalState) => {
    setDrawerOpen(false);
    setModal(next);
  }, []);
  const closeModal = useCallback(() => setModal({ kind: 'none' }), []);

  const value = useMemo<AppUiValue>(
    () => ({
      route,
      navigate,
      filters,
      setFilters,
      clearFilters,
      sort,
      setSort,
      modal,
      openModal,
      closeModal,
      drawerOpen,
      setDrawerOpen,
      searchInputRef,
    }),
    [route, navigate, filters, setFilters, clearFilters, sort, modal, openModal, closeModal, drawerOpen],
  );

  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>;
}

export function useAppUi(): AppUiValue {
  const context = useContext(AppUiContext);
  if (!context) throw new Error('useAppUi must be used inside AppUiProvider');
  return context;
}
