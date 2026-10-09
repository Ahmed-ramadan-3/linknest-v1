import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SYNC_CHANNEL } from '../config/app';
import { createStorage, describeStorageError } from '../data/db';
import {
  createRepositories,
  type CategoryDeletePlan,
  type LibraryData,
  type MergeSummary,
  type Repositories,
} from '../data/repositories';
import type { ParsedBackup } from '../data/backup';
import type { AccentKey, Category, IconKey, Resource } from '../types';
import { collectTags, buildSearchIndex, type SearchIndex } from '../lib/search';
import { countResources, indexById, type CategoryCounts } from '../lib/categories/tree';
import { logDev } from '../lib/log';
import { cleanLine, newId } from '../lib/validation/sanitize';
import { LIMITS } from '../config/app';

export type ResourceValues = Omit<Resource, 'id' | 'updatedAt'>;

export interface CategoryInput {
  id?: string;
  name: string;
  parentId: string | null;
  icon: IconKey;
  accent: AccentKey | null;
}

type Status = 'loading' | 'ready' | 'error';

interface LibraryContextValue {
  status: Status;
  /** Friendly message when status is "error" or the in-memory fallback is active. */
  notice: string | null;
  persistent: boolean;
  categories: Category[];
  resources: Resource[];
  categoryById: Map<string, Category>;
  counts: CategoryCounts;
  searchIndex: SearchIndex;
  tags: { tag: string; count: number }[];
  retry(): void;
  addResource(values: ResourceValues): Promise<Resource>;
  updateResource(id: string, values: ResourceValues): Promise<Resource>;
  toggleFavorite(id: string): Promise<void>;
  deleteResource(id: string): Promise<void>;
  saveCategory(input: CategoryInput): Promise<Category>;
  deleteCategory(plan: CategoryDeletePlan): Promise<void>;
  importBackup(backup: ParsedBackup, mode: 'merge' | 'replace'): Promise<MergeSummary | null>;
  snapshot(): LibraryData;
  resetAll(): Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const EMPTY: LibraryData = { categories: [], resources: [] };

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [data, setData] = useState<LibraryData>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  const reposRef = useRef<Repositories | null>(null);
  const dataRef = useRef<LibraryData>(EMPTY);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const commit = useCallback((next: LibraryData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const announceChange = useCallback(() => {
    try {
      channelRef.current?.postMessage('changed');
    } catch (error) {
      logDev('Could not notify other tabs', error);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      try {
        const storage = await createStorage();
        const repos = createRepositories(storage.adapter);
        let loaded = await repos.library.loadAll();
        const seeds = await repos.library.seedIfNeeded(loaded);
        if (seeds) loaded = { ...loaded, categories: seeds };
        if (cancelled) return;
        reposRef.current = repos;
        setPersistent(storage.persistent);
        setNotice(storage.warning);
        commit(loaded);
        setStatus('ready');
      } catch (error) {
        logDev('Failed to load library', error);
        if (cancelled) return;
        setNotice(describeStorageError(error));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, commit]);

  // Keep other open tabs in sync.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = () => {
      const repos = reposRef.current;
      if (!repos) return;
      repos.library
        .loadAll()
        .then(commit)
        .catch((error) => logDev('Sync reload failed', error));
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [commit]);

  const repos = useCallback((): Repositories => {
    if (!reposRef.current) throw new Error('Storage is not ready yet');
    return reposRef.current;
  }, []);

  const addResource = useCallback(
    async (values: ResourceValues) => {
      const now = new Date().toISOString();
      const resource: Resource = { ...values, id: newId(), updatedAt: now };
      await repos().resources.save(resource);
      commit({ ...dataRef.current, resources: [...dataRef.current.resources, resource] });
      announceChange();
      return resource;
    },
    [announceChange, commit, repos],
  );

  const updateResource = useCallback(
    async (id: string, values: ResourceValues) => {
      const resource: Resource = { ...values, id, updatedAt: new Date().toISOString() };
      await repos().resources.save(resource);
      commit({
        ...dataRef.current,
        resources: dataRef.current.resources.map((item) => (item.id === id ? resource : item)),
      });
      announceChange();
      return resource;
    },
    [announceChange, commit, repos],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const current = dataRef.current.resources.find((item) => item.id === id);
      if (!current) return;
      const next: Resource = { ...current, favorite: !current.favorite, updatedAt: new Date().toISOString() };
      await repos().resources.save(next);
      commit({
        ...dataRef.current,
        resources: dataRef.current.resources.map((item) => (item.id === id ? next : item)),
      });
      announceChange();
    },
    [announceChange, commit, repos],
  );

  const deleteResource = useCallback(
    async (id: string) => {
      await repos().resources.remove(id);
      commit({
        ...dataRef.current,
        resources: dataRef.current.resources.filter((item) => item.id !== id),
      });
      announceChange();
    },
    [announceChange, commit, repos],
  );

  const saveCategory = useCallback(
    async (input: CategoryInput) => {
      const now = new Date().toISOString();
      const name = cleanLine(input.name, LIMITS.categoryName);
      const existing = input.id ? dataRef.current.categories.find((c) => c.id === input.id) : undefined;
      const category: Category = existing
        ? { ...existing, name, parentId: input.parentId, icon: input.icon, accent: input.accent, updatedAt: now }
        : {
            id: newId(),
            name,
            parentId: input.parentId,
            icon: input.icon,
            accent: input.accent,
            seedKey: null,
            createdAt: now,
            updatedAt: now,
          };
      await repos().categories.save(category);
      commit({
        ...dataRef.current,
        categories: existing
          ? dataRef.current.categories.map((item) => (item.id === category.id ? category : item))
          : [...dataRef.current.categories, category],
      });
      announceChange();
      return category;
    },
    [announceChange, commit, repos],
  );

  const deleteCategory = useCallback(
    async (plan: CategoryDeletePlan) => {
      const next = await repos().library.deleteCategory(plan, dataRef.current);
      commit(next);
      announceChange();
    },
    [announceChange, commit, repos],
  );

  const importBackup = useCallback(
    async (backup: ParsedBackup, mode: 'merge' | 'replace') => {
      const library = repos().library;
      let summary: MergeSummary | null = null;
      if (mode === 'replace') {
        await library.replaceAll(backup.data);
        commit(backup.data);
      } else {
        const merged = await library.mergeAll(dataRef.current, backup.data);
        summary = merged.summary;
        commit(merged.data);
      }
      announceChange();
      return summary;
    },
    [announceChange, commit, repos],
  );

  const resetAll = useCallback(async () => {
    const seeds = await repos().library.resetAll();
    commit({ categories: seeds, resources: [] });
    announceChange();
  }, [announceChange, commit, repos]);

  const snapshot = useCallback(() => dataRef.current, []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const categoryById = useMemo(() => indexById(data.categories), [data.categories]);
  const counts = useMemo(() => countResources(data.categories, data.resources), [data.categories, data.resources]);
  const searchIndex = useMemo(
    () => buildSearchIndex(data.resources, data.categories),
    [data.resources, data.categories],
  );
  const tags = useMemo(() => collectTags(data.resources), [data.resources]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      status,
      notice,
      persistent,
      categories: data.categories,
      resources: data.resources,
      categoryById,
      counts,
      searchIndex,
      tags,
      retry,
      addResource,
      updateResource,
      toggleFavorite,
      deleteResource,
      saveCategory,
      deleteCategory,
      importBackup,
      snapshot,
      resetAll,
    }),
    [
      status, notice, persistent, data, categoryById, counts, searchIndex, tags, retry,
      addResource, updateResource, toggleFavorite, deleteResource, saveCategory,
      deleteCategory, importBackup, snapshot, resetAll,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside LibraryProvider');
  return context;
}
