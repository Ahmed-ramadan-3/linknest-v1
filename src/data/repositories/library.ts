import { DEFAULT_CATEGORIES, type SeedCategory } from '../../config/app';
import type { Category, Resource } from '../../types';
import { newId } from '../../lib/validation/sanitize';
import type { StorageAdapter, WriteOp } from '../db/types';
import { META_KEYS } from './meta';

export interface LibraryData {
  categories: Category[];
  resources: Resource[];
}

export interface MergeSummary {
  categoriesAdded: number;
  categoriesUpdated: number;
  resourcesAdded: number;
  resourcesUpdated: number;
  skipped: number;
}

export interface CategoryDeletePlan {
  id: string;
  /** Subcategories move here (the deleted category's parent by default). */
  childrenGoTo: string | null;
  /** Resources move here; null leaves them uncategorized. */
  resourcesGoTo: string | null;
}

/** Starter categories as records. createdAt increases so the display order is preserved. */
export function buildSeedCategories(now = Date.now()): Category[] {
  const result: Category[] = [];
  let tick = 0;
  const visit = (seeds: SeedCategory[], parentId: string | null) => {
    for (const seed of seeds) {
      const stamp = new Date(now + tick).toISOString();
      tick += 1;
      const id = newId();
      result.push({
        id,
        name: seed.name,
        parentId,
        icon: seed.icon,
        accent: null,
        seedKey: seed.seedKey,
        createdAt: stamp,
        updatedAt: stamp,
      });
      if (seed.children) visit(seed.children, id);
    }
  };
  visit(DEFAULT_CATEGORIES, null);
  return result;
}

function putAll(data: LibraryData): WriteOp[] {
  return [
    ...data.categories.map((value): WriteOp => ({ op: 'put', store: 'categories', value })),
    ...data.resources.map((value): WriteOp => ({ op: 'put', store: 'resources', value })),
  ];
}

const seededFlag: WriteOp = {
  op: 'put',
  store: 'meta',
  value: { key: META_KEYS.seeded, value: true },
};

/** Multi-record operations that must be atomic live here, not in components. */
export function createLibraryRepository(adapter: StorageAdapter) {
  return {
    async loadAll(): Promise<LibraryData> {
      const [categories, resources] = await Promise.all([
        adapter.getAll('categories'),
        adapter.getAll('resources'),
      ]);
      return { categories, resources };
    },

    /** Creates starter categories once, only when the library has never held data. */
    async seedIfNeeded(current: LibraryData): Promise<Category[] | null> {
      const flag = await adapter.get('meta', META_KEYS.seeded);
      if (flag?.value === true) return null;
      if (current.categories.length > 0 || current.resources.length > 0) {
        await adapter.write([seededFlag]);
        return null;
      }
      const seeds = buildSeedCategories();
      await adapter.write([...seeds.map((value): WriteOp => ({ op: 'put', store: 'categories', value })), seededFlag]);
      return seeds;
    },

    async replaceAll(data: LibraryData): Promise<void> {
      await adapter.write([
        { op: 'clear', store: 'resources' },
        { op: 'clear', store: 'categories' },
        ...putAll(data),
        seededFlag,
      ]);
    },

    /** Newer record wins on id collisions; unknown ids are added. Returns the resulting data. */
    async mergeAll(
      current: LibraryData,
      incoming: LibraryData,
    ): Promise<{ data: LibraryData; summary: MergeSummary }> {
      const summary: MergeSummary = {
        categoriesAdded: 0,
        categoriesUpdated: 0,
        resourcesAdded: 0,
        resourcesUpdated: 0,
        skipped: 0,
      };

      const mergeList = <T extends { id: string; updatedAt: string }>(
        existing: T[],
        extra: T[],
        added: 'categoriesAdded' | 'resourcesAdded',
        updated: 'categoriesUpdated' | 'resourcesUpdated',
      ): T[] => {
        const map = new Map(existing.map((item) => [item.id, item]));
        for (const item of extra) {
          const found = map.get(item.id);
          if (!found) {
            map.set(item.id, item);
            summary[added] += 1;
          } else if (item.updatedAt > found.updatedAt) {
            map.set(item.id, item);
            summary[updated] += 1;
          } else {
            summary.skipped += 1;
          }
        }
        return [...map.values()];
      };

      const data: LibraryData = {
        categories: mergeList(current.categories, incoming.categories, 'categoriesAdded', 'categoriesUpdated'),
        resources: mergeList(current.resources, incoming.resources, 'resourcesAdded', 'resourcesUpdated'),
      };
      await adapter.write([...putAll(data), seededFlag]);
      return { data, summary };
    },

    async deleteCategory(plan: CategoryDeletePlan, current: LibraryData): Promise<LibraryData> {
      const now = new Date().toISOString();
      const categories = current.categories
        .filter((category) => category.id !== plan.id)
        .map((category) =>
          category.parentId === plan.id
            ? { ...category, parentId: plan.childrenGoTo, updatedAt: now }
            : category,
        );
      const resources = current.resources.map((resource) =>
        resource.categoryId === plan.id
          ? { ...resource, categoryId: plan.resourcesGoTo, updatedAt: now }
          : resource,
      );

      const ops: WriteOp[] = [{ op: 'delete', store: 'categories', key: plan.id }];
      for (const category of categories) {
        if (category.updatedAt === now) ops.push({ op: 'put', store: 'categories', value: category });
      }
      for (const resource of resources) {
        if (resource.updatedAt === now) ops.push({ op: 'put', store: 'resources', value: resource });
      }
      await adapter.write(ops);
      return { categories, resources };
    },

    /** Removes everything and re-creates the starter categories. */
    async resetAll(): Promise<Category[]> {
      const seeds = buildSeedCategories();
      await adapter.write([
        { op: 'clear', store: 'resources' },
        { op: 'clear', store: 'categories' },
        { op: 'clear', store: 'meta' },
        ...seeds.map((value): WriteOp => ({ op: 'put', store: 'categories', value })),
        seededFlag,
      ]);
      return seeds;
    },
  };
}

export type LibraryRepository = ReturnType<typeof createLibraryRepository>;
