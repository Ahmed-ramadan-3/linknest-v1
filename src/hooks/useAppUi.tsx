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

/** Functions that change UI state. Their identity never changes, so buttons that only call them do not re-render. */
interface AppUiActions {
  navigate(route: Route, preset?: Partial<LibraryFilters>): void;
  setFilters(patch: Partial<LibraryFilters>): void;
  clearFilters(): void;
  setSort(sort: SortKey): void;
  openModal(modal: ModalState): void;
  closeModal(): void;
  setDrawerOpen(open: boolean): void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

interface AppUiState {
  route: Route;
  filters: LibraryFilters;
  sort: SortKey;
  modal: ModalState;
  drawerOpen: boolean;
}

type AppUiValue = AppUiState & AppUiActions;

const AppUiStateContext = createContext<AppUiState | null>(null);
const AppUiActionsContext = createContext<AppUiActions | null>(null);

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

  const actions = useMemo<AppUiActions>(
    () => ({ navigate, setFilters, clearFilters, setSort, openModal, closeModal, setDrawerOpen, searchInputRef }),
    [navigate, setFilters, clearFilters, openModal, closeModal],
  );
  const state = useMemo<AppUiState>(
    () => ({ route, filters, sort, modal, drawerOpen }),
    [route, filters, sort, modal, drawerOpen],
  );

  return (
    <AppUiActionsContext.Provider value={actions}>
      <AppUiStateContext.Provider value={state}>{children}</AppUiStateContext.Provider>
    </AppUiActionsContext.Provider>
  );
}

/** State and actions together. Prefer useAppUiActions() when only actions are needed. */
export function useAppUi(): AppUiValue {
  const state = useContext(AppUiStateContext);
  const actions = useContext(AppUiActionsContext);
  if (!state || !actions) throw new Error('useAppUi must be used inside AppUiProvider');
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

export function useAppUiActions(): AppUiActions {
  const actions = useContext(AppUiActionsContext);
  if (!actions) throw new Error('useAppUiActions must be used inside AppUiProvider');
  return actions;
}
