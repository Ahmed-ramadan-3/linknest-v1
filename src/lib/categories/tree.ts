import { MAX_CATEGORY_DEPTH } from '../../config/app';
import { translate } from '../../i18n/core';
import type { Category, Resource } from '../../types';

export interface CategoryNode {
  category: Category;
  children: CategoryNode[];
  depth: number;
}

export function compareCategories(a: Category, b: Category): number {
  const byDate = a.createdAt.localeCompare(b.createdAt);
  return byDate !== 0 ? byDate : a.name.localeCompare(b.name);
}

/** Children grouped by parent id. Categories with an unknown parent are treated as roots. */
export function groupByParent(categories: Category[]): Map<string | null, Category[]> {
  const ids = new Set(categories.map((c) => c.id));
  const groups = new Map<string | null, Category[]>();
  for (const category of categories) {
    const parent = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    const list = groups.get(parent);
    if (list) list.push(category);
    else groups.set(parent, [category]);
  }
  for (const list of groups.values()) list.sort(compareCategories);
  return groups;
}

export function buildTree(categories: Category[]): CategoryNode[] {
  const groups = groupByParent(categories);
  const visited = new Set<string>();
  const build = (parent: string | null, depth: number): CategoryNode[] =>
    (groups.get(parent) ?? [])
      .filter((category) => {
        if (visited.has(category.id)) return false;
        visited.add(category.id);
        return true;
      })
      .map((category) => ({ category, depth, children: build(category.id, depth + 1) }));
  return build(null, 0);
}

export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function indexById(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

/** The category and every descendant id. */
export function descendantIds(categories: Category[], rootId: string): Set<string> {
  const groups = groupByParent(categories);
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (result.has(id)) continue;
    result.add(id);
    for (const child of groups.get(id) ?? []) stack.push(child.id);
  }
  return result;
}

/** Root -> ... -> category. Stops safely if the data contains a cycle. */
export function pathTo(byId: Map<string, Category>, id: string | null): Category[] {
  const path: Category[] = [];
  const seen = new Set<string>();
  let current = id ? byId.get(id) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function pathLabel(byId: Map<string, Category>, id: string | null, separator = ' › '): string {
  const path = pathTo(byId, id);
  return path.length > 0 ? path.map((c) => c.name).join(separator) : translate('detail.uncategorized');
}

export function depthOf(byId: Map<string, Category>, id: string | null): number {
  return Math.max(0, pathTo(byId, id).length - 1);
}

/** Height of the subtree rooted at id (0 for a leaf). */
export function subtreeHeight(categories: Category[], id: string): number {
  const groups = groupByParent(categories);
  const walk = (current: string, seen: Set<string>): number => {
    if (seen.has(current)) return 0;
    seen.add(current);
    const kids = groups.get(current) ?? [];
    return kids.length === 0 ? 0 : 1 + Math.max(...kids.map((k) => walk(k.id, seen)));
  };
  return walk(id, new Set());
}

export type ReparentCheck = { ok: true } | { ok: false; reason: string };

/** Rejects moving a category under itself/its descendants or past the depth limit. */
export function canReparent(
  categories: Category[],
  id: string,
  newParentId: string | null,
): ReparentCheck {
  if (newParentId === null) return { ok: true };
  if (newParentId === id) return { ok: false, reason: translate('err.reparent.self') };
  if (descendantIds(categories, id).has(newParentId)) {
    return { ok: false, reason: translate('err.reparent.inside') };
  }
  const byId = indexById(categories);
  if (!byId.has(newParentId)) return { ok: false, reason: translate('err.reparent.missing') };
  const newDepth = depthOf(byId, newParentId) + 1;
  if (newDepth + subtreeHeight(categories, id) >= MAX_CATEGORY_DEPTH) {
    return { ok: false, reason: translate('err.reparent.depth', { max: MAX_CATEGORY_DEPTH }) };
  }
  return { ok: true };
}

export interface CategoryCounts {
  /** Resources directly inside the category. */
  direct: Map<string, number>;
  /** Resources inside the category or any descendant. */
  total: Map<string, number>;
  uncategorized: number;
}

export function countResources(categories: Category[], resources: Resource[]): CategoryCounts {
  const byId = indexById(categories);
  const direct = new Map<string, number>();
  const total = new Map<string, number>();
  let uncategorized = 0;

  for (const resource of resources) {
    if (!resource.categoryId || !byId.has(resource.categoryId)) {
      uncategorized += 1;
      continue;
    }
    direct.set(resource.categoryId, (direct.get(resource.categoryId) ?? 0) + 1);
    for (const ancestor of pathTo(byId, resource.categoryId)) {
      total.set(ancestor.id, (total.get(ancestor.id) ?? 0) + 1);
    }
  }
  return { direct, total, uncategorized };
}
