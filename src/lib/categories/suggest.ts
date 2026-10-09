import { RESOURCE_TYPE_META } from '../../config/app';
import type { Category, Platform, ResourceType } from '../../types';

/**
 * Suggests a starter category for a new resource. Works through stable seed keys
 * so it keeps working after the user renames categories; returns null when the
 * matching starter category has been deleted.
 */
export function suggestCategoryId(
  categories: Category[],
  type: ResourceType,
  platform: Platform | null,
): string | null {
  const root = RESOURCE_TYPE_META[type].defaultCategorySeedKey;
  if (!root) return null;
  const bySeed = new Map(
    categories.filter((c) => c.seedKey !== null).map((c) => [c.seedKey as string, c.id]),
  );
  if (platform && platform !== 'other') {
    const specific = bySeed.get(`${root}.${platform}`);
    if (specific) return specific;
  }
  return bySeed.get(root) ?? null;
}
