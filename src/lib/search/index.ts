import { PLATFORM_META } from '../../config/app';
import type { Category, DatePreset, LibraryFilters, Resource, SortKey } from '../../types';
import { descendantIds, indexById, pathLabel } from '../categories/tree';

export const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  types: [],
  platforms: [],
  tags: [],
  favoritesOnly: false,
  date: 'any',
  categoryId: null,
};

/** Lower-cases and strips accents/diacritics (including Arabic tashkeel) for matching. */
export function normalizeForSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
}

/** One normalised searchable string per resource, built once per data change. */
export type SearchIndex = Map<string, string>;

export function buildSearchIndex(resources: Resource[], categories: Category[]): SearchIndex {
  const byId = indexById(categories);
  const pathCache = new Map<string, string>();
  const index: SearchIndex = new Map();

  for (const resource of resources) {
    const key = resource.categoryId ?? '';
    let categoryText = pathCache.get(key);
    if (categoryText === undefined) {
      categoryText = resource.categoryId ? pathLabel(byId, resource.categoryId, ' ') : '';
      pathCache.set(key, categoryText);
    }
    const platformText = resource.platform ? PLATFORM_META[resource.platform].label : '';
    index.set(
      resource.id,
      normalizeForSearch(
        [
          resource.title,
          resource.url,
          resource.description,
          resource.notes,
          resource.promptContent,
          resource.project,
          resource.tags.join(' '),
          categoryText,
          platformText,
          resource.type,
        ].join('\n'),
      ),
    );
  }
  return index;
}

export function tokenizeQuery(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

function dateCutoff(preset: DatePreset, now: number): number | null {
  const day = 24 * 60 * 60 * 1000;
  switch (preset) {
    case '7d':
      return now - 7 * day;
    case '30d':
      return now - 30 * day;
    case 'year':
      return new Date(new Date(now).getFullYear(), 0, 1).getTime();
    default:
      return null;
  }
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return (
    filters.types.length > 0 ||
    filters.platforms.length > 0 ||
    filters.tags.length > 0 ||
    filters.favoritesOnly ||
    filters.date !== 'any' ||
    filters.categoryId !== null
  );
}

export interface FilterContext {
  resources: Resource[];
  categories: Category[];
  index: SearchIndex;
  now?: number;
}

/**
 * Applies the query and filters. When a query is present the category restriction
 * is ignored so search stays global; every other filter still applies.
 */
export function applyFilters(filters: LibraryFilters, context: FilterContext): Resource[] {
  const tokens = tokenizeQuery(filters.query);
  const now = context.now ?? Date.now();
  const cutoff = dateCutoff(filters.date, now);
  const categoryScope =
    filters.categoryId && tokens.length === 0
      ? descendantIds(context.categories, filters.categoryId)
      : null;
  const wantedTags = filters.tags.map((tag) => tag.toLowerCase());

  return context.resources.filter((resource) => {
    if (filters.favoritesOnly && !resource.favorite) return false;
    if (filters.types.length > 0 && !filters.types.includes(resource.type)) return false;
    if (filters.platforms.length > 0) {
      if (!resource.platform || !filters.platforms.includes(resource.platform)) return false;
    }
    if (categoryScope && (!resource.categoryId || !categoryScope.has(resource.categoryId))) {
      return false;
    }
    if (wantedTags.length > 0) {
      const own = resource.tags.map((tag) => tag.toLowerCase());
      if (!wantedTags.every((tag) => own.includes(tag))) return false;
    }
    if (cutoff !== null && new Date(resource.createdAt).getTime() < cutoff) return false;
    if (tokens.length > 0) {
      const haystack = context.index.get(resource.id) ?? '';
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    return true;
  });
}

export function sortResources(resources: Resource[], sort: SortKey): Resource[] {
  const list = [...resources];
  const byTitle = (a: Resource, b: Resource) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
  switch (sort) {
    case 'oldest':
      return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'title-asc':
      return list.sort(byTitle);
    case 'title-desc':
      return list.sort((a, b) => byTitle(b, a));
    case 'updated':
      return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'favorites':
      return list.sort(
        (a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt.localeCompare(a.createdAt),
      );
    default:
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Distinct tags across all resources with usage counts, most used first. */
export function collectTags(resources: Resource[]): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const resource of resources) {
    for (const tag of resource.tags) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
