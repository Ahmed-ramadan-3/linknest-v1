import type { IconKey } from '../config/icons';

export type { IconKey };

export const RESOURCE_TYPES = [
  'link',
  'video',
  'programming',
  'prompt',
  'website',
  'social',
  'other',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const PLATFORMS = ['youtube', 'facebook', 'instagram', 'tiktok', 'x', 'other'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** A tag is a short free-form label. */
export type Tag = string;

/** Muted tints a category can use for its node. Resolved to CSS variables. */
export const ACCENT_KEYS = ['clay', 'sage', 'sand', 'slate', 'rose', 'olive'] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  /** Empty string only for prompts saved without a source link. */
  url: string;
  description: string;
  notes: string;
  /** Full prompt text; line breaks are preserved. Empty for non-prompts. */
  promptContent: string;
  /** Free-form project label, optional. */
  project: string;
  /** null means "Uncategorized" (for example after its category was deleted). */
  categoryId: string | null;
  platform: Platform | null;
  tags: Tag[];
  /** Remote image URL (http/https) or null. Images are never stored locally. */
  thumbnailUrl: string | null;
  icon: IconKey | null;
  favorite: boolean;
  /** ISO 8601. This is the "date saved" and is user-editable. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  icon: IconKey;
  accent: AccentKey | null;
  /** Stable key for starter categories so type defaults survive renames. */
  seedKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const MOTION_MODES = ['system', 'reduce', 'full'] as const;
export type MotionMode = (typeof MOTION_MODES)[number];

export const LANGUAGES = ['en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

export const PERFORMANCE_MODES = ['auto', 'lite', 'full'] as const;
export type PerformanceMode = (typeof PERFORMANCE_MODES)[number];

export interface AppSettings {
  theme: ThemeMode;
  motion: MotionMode;
  /** Interface language. Saved content is never translated. */
  language: Language;
  /** "lite" removes blur and background animation; "auto" decides from the device. */
  performance: PerformanceMode;
  /** True when the desktop library sidebar is hidden. */
  sidebarHidden: boolean;
  /** When false, no third-party image is ever requested. */
  remoteThumbnails: boolean;
  /** ISO timestamp of the last JSON export, if any. */
  lastExportAt: string | null;
}

export const EXPORT_APP_ID = 'LinkNest';

export interface ImportExportSchema {
  app: typeof EXPORT_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  categories: Category[];
  resources: Resource[];
  settings: Partial<AppSettings>;
}

/** Shape of the IndexedDB database (object store name -> record type). */
export interface DatabaseSchema {
  resources: Resource;
  categories: Category;
  meta: MetaRecord;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export type StoreName = keyof DatabaseSchema;

export type SortKey = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'updated' | 'favorites';
export type DatePreset = 'any' | '7d' | '30d' | 'year';

export interface LibraryFilters {
  query: string;
  types: ResourceType[];
  platforms: Platform[];
  tags: Tag[];
  favoritesOnly: boolean;
  date: DatePreset;
  /** Restricts to a category and all of its descendants. */
  categoryId: string | null;
}
