import { LIMITS, RESOURCE_TYPE_META, SCHEMA_VERSION } from '../config/app';
import type {
  AppSettings,
  Category,
  ImportExportSchema,
  Platform,
  Resource,
  ResourceType,
} from '../types';
import { EXPORT_APP_ID, MOTION_MODES, PLATFORMS, RESOURCE_TYPES, THEME_MODES } from '../types';
import { detectPlatform } from '../lib/platform';
import { checkUrl, hostLabel } from '../lib/url';
import {
  cleanAccent,
  cleanIcon,
  cleanIsoDate,
  cleanLine,
  cleanMultiline,
  cleanTags,
  isSafeId,
  newId,
} from '../lib/validation/sanitize';
import type { LibraryData } from './repositories/library';

export interface ParsedBackup {
  data: LibraryData;
  settings: Partial<AppSettings>;
  warnings: string[];
  exportedAt: string | null;
}

export type ParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string };

type Obj = Record<string, unknown>;

function asObject(value: unknown): Obj | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Obj) : null;
}

export function buildBackup(
  data: LibraryData,
  settings: Pick<AppSettings, 'theme' | 'motion' | 'remoteThumbnails'>,
  now = new Date(),
): ImportExportSchema {
  return {
    app: EXPORT_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    categories: data.categories,
    resources: data.resources,
    settings: {
      theme: settings.theme,
      motion: settings.motion,
      remoteThumbnails: settings.remoteThumbnails,
    },
  };
}

export function serializeBackup(backup: ImportExportSchema): string {
  return JSON.stringify(backup, null, 2);
}

/**
 * Parses and sanitises a backup file. Nothing in the file is trusted: every field
 * is type-checked, length-capped and rebuilt from known keys only, URLs must be
 * http(s), ids must be safe strings and category relationships are repaired.
 */
export function parseBackup(text: string): ParseResult {
  if (text.length > LIMITS.importFileBytes) {
    return { ok: false, error: 'This file is too large to be a LinkNest backup.' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Choose a backup exported from LinkNest.' };
  }

  const root = asObject(raw);
  if (!root || root.app !== EXPORT_APP_ID) {
    return { ok: false, error: 'This file is not a LinkNest backup.' };
  }
  const version = root.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'This backup has no valid version number.' };
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'This backup was created by a newer version of LinkNest. Update the app and try again.',
    };
  }
  if (!Array.isArray(root.categories) || !Array.isArray(root.resources)) {
    return { ok: false, error: 'This backup is missing its categories or resources.' };
  }
  if (root.categories.length > LIMITS.categories || root.resources.length > LIMITS.resources) {
    return { ok: false, error: 'This backup contains more items than LinkNest supports.' };
  }

  const warnings: string[] = [];
  const now = new Date().toISOString();
  const categories = sanitizeCategories(root.categories, now, warnings);
  const resources = sanitizeResources(root.resources, new Set(categories.map((c) => c.id)), now, warnings);

  return {
    ok: true,
    backup: {
      data: { categories, resources },
      settings: sanitizeSettings(root.settings),
      warnings,
      exportedAt: cleanIsoDate(root.exportedAt),
    },
  };
}

function sanitizeCategories(items: unknown[], now: string, warnings: string[]): Category[] {
  const seen = new Set<string>();
  const result: Category[] = [];
  let dropped = 0;

  for (const item of items) {
    const record = asObject(item);
    const name = record ? cleanLine(record.name, LIMITS.categoryName) : '';
    if (!record || !isSafeId(record.id) || !name || seen.has(record.id)) {
      dropped += 1;
      continue;
    }
    seen.add(record.id);
    const createdAt = cleanIsoDate(record.createdAt) ?? now;
    result.push({
      id: record.id,
      name,
      parentId: isSafeId(record.parentId) ? record.parentId : null,
      icon: cleanIcon(record.icon) ?? 'folder',
      accent: cleanAccent(record.accent),
      seedKey: cleanLine(record.seedKey, 80) || null,
      createdAt,
      updatedAt: cleanIsoDate(record.updatedAt) ?? createdAt,
    });
  }

  repairHierarchy(result);
  if (dropped > 0) warnings.push(`${dropped} invalid or duplicate categor${dropped === 1 ? 'y was' : 'ies were'} skipped.`);
  return result;
}

/** Drops parents that do not exist and breaks cycles so the tree is always valid. */
function repairHierarchy(categories: Category[]): void {
  const ids = new Set(categories.map((c) => c.id));
  for (const category of categories) {
    if (category.parentId && (!ids.has(category.parentId) || category.parentId === category.id)) {
      category.parentId = null;
    }
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  for (const category of categories) {
    const path = new Set<string>([category.id]);
    let current = category.parentId ? byId.get(category.parentId) : undefined;
    while (current) {
      if (path.has(current.id)) {
        category.parentId = null;
        break;
      }
      path.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
}

function sanitizeResources(
  items: unknown[],
  categoryIds: Set<string>,
  now: string,
  warnings: string[],
): Resource[] {
  const seen = new Set<string>();
  const result: Resource[] = [];
  let dropped = 0;
  let uncategorized = 0;

  for (const item of items) {
    const record = asObject(item);
    if (!record) {
      dropped += 1;
      continue;
    }

    const type: ResourceType = RESOURCE_TYPES.includes(record.type as ResourceType)
      ? (record.type as ResourceType)
      : 'other';

    const rawUrl = typeof record.url === 'string' ? record.url.trim() : '';
    let url = '';
    if (rawUrl) {
      const checked = checkUrl(rawUrl);
      if (!checked.ok) {
        dropped += 1;
        continue;
      }
      url = checked.url;
    }

    const promptContent = type === 'prompt' ? cleanMultiline(record.promptContent, LIMITS.promptContent) : '';
    if (!url && (RESOURCE_TYPE_META[type].requiresUrl || !promptContent.trim())) {
      dropped += 1;
      continue;
    }

    const title = cleanLine(record.title, LIMITS.title) || (url ? hostLabel(url) : '');
    if (!title) {
      dropped += 1;
      continue;
    }

    let id = isSafeId(record.id) ? record.id : newId();
    if (seen.has(id)) id = newId();
    seen.add(id);

    let categoryId: string | null = isSafeId(record.categoryId) ? record.categoryId : null;
    if (categoryId && !categoryIds.has(categoryId)) categoryId = null;
    if (!categoryId) uncategorized += 1;

    const thumbnailCheck = typeof record.thumbnailUrl === 'string' && record.thumbnailUrl.trim()
      ? checkUrl(record.thumbnailUrl)
      : null;
    const platform: Platform | null = PLATFORMS.includes(record.platform as Platform)
      ? (record.platform as Platform)
      : url
        ? detectPlatform(url)
        : null;
    const createdAt = cleanIsoDate(record.createdAt) ?? now;

    result.push({
      id,
      type,
      title,
      url,
      description: cleanMultiline(record.description, LIMITS.description).trim(),
      notes: cleanMultiline(record.notes, LIMITS.notes).trim(),
      promptContent,
      project: cleanLine(record.project, LIMITS.project),
      categoryId,
      platform,
      tags: cleanTags(record.tags),
      thumbnailUrl: thumbnailCheck && thumbnailCheck.ok ? thumbnailCheck.url : null,
      icon: cleanIcon(record.icon),
      favorite: record.favorite === true,
      createdAt,
      updatedAt: cleanIsoDate(record.updatedAt) ?? createdAt,
    });
  }

  if (dropped > 0) {
    warnings.push(
      `${dropped} resource${dropped === 1 ? ' was' : 's were'} skipped because of an invalid URL, missing title or malformed data.`,
    );
  }
  if (uncategorized > 0) {
    warnings.push(
      `${uncategorized} resource${uncategorized === 1 ? ' has' : 's have'} no valid category and will appear as Uncategorized.`,
    );
  }
  return result;
}

function sanitizeSettings(value: unknown): Partial<AppSettings> {
  const record = asObject(value);
  const settings: Partial<AppSettings> = {};
  if (!record) return settings;
  if (THEME_MODES.includes(record.theme as AppSettings['theme'])) {
    settings.theme = record.theme as AppSettings['theme'];
  }
  if (MOTION_MODES.includes(record.motion as AppSettings['motion'])) {
    settings.motion = record.motion as AppSettings['motion'];
  }
  if (typeof record.remoteThumbnails === 'boolean') settings.remoteThumbnails = record.remoteThumbnails;
  return settings;
}
