import brand from './brand.json';
import type { IconKey } from './icons';
import type { Platform, ResourceType } from '../types';

/** Central configuration: branding, limits, resource types, platforms, starter categories. */

export const APP_NAME: string = brand.name;
export const APP_TAGLINE: string = brand.tagline;
export const APP_DESCRIPTION: string = brand.description;
export const APP_VERSION = '1.0.0';

export const DB_NAME = 'linknest';
export const DB_VERSION = 1;
/** Export/backup schema version. Bump together with a migration. */
export const SCHEMA_VERSION = 1;
export const PREFS_STORAGE_KEY = 'linknest.prefs.v1';
export const SYNC_CHANNEL = 'linknest-sync';

export const SPLASH_DURATION_MS = 5000;
export const SPLASH_SKIP_AFTER_MS = 1500;
export const SEARCH_DEBOUNCE_MS = 120;
export const TOAST_DURATION_MS = 2400;
export const RECENT_COUNT = 8;
export const MAX_CATEGORY_DEPTH = 6;

export const LIMITS = {
  title: 200,
  url: 2048,
  description: 1000,
  notes: 5000,
  promptContent: 50_000,
  project: 80,
  tag: 40,
  tagsPerResource: 20,
  categoryName: 60,
  categories: 500,
  resources: 20_000,
  importFileBytes: 25 * 1024 * 1024,
} as const;

export interface ResourceTypeMeta {
  label: string;
  description: string;
  icon: IconKey;
  /** Prompts may be saved without a URL; everything else needs one. */
  requiresUrl: boolean;
  /** seedKey of the starter category suggested for this type. */
  defaultCategorySeedKey: string | null;
  /** Whether the platform selector is shown by default. */
  showsPlatform: boolean;
}

export const RESOURCE_TYPE_META: Record<ResourceType, ResourceTypeMeta> = {
  link: {
    label: 'Link',
    description: 'Any useful URL you want to find again',
    icon: 'link',
    requiresUrl: true,
    defaultCategorySeedKey: null,
    showsPlatform: false,
  },
  video: {
    label: 'Video',
    description: 'YouTube, Facebook, Instagram, TikTok…',
    icon: 'video',
    requiresUrl: true,
    defaultCategorySeedKey: 'videos',
    showsPlatform: true,
  },
  programming: {
    label: 'Programming Resource',
    description: 'Docs, tutorials, repos, tools',
    icon: 'code',
    requiresUrl: true,
    defaultCategorySeedKey: 'programming',
    showsPlatform: false,
  },
  prompt: {
    label: 'Prompt',
    description: 'Reusable prompt text, with an optional source link',
    icon: 'message-square-text',
    requiresUrl: false,
    defaultCategorySeedKey: 'prompts',
    showsPlatform: false,
  },
  website: {
    label: 'Website',
    description: 'A site worth bookmarking',
    icon: 'globe',
    requiresUrl: true,
    defaultCategorySeedKey: 'websites',
    showsPlatform: false,
  },
  social: {
    label: 'Social Media Post',
    description: 'A post, thread or reel you want to keep',
    icon: 'share-2',
    requiresUrl: true,
    defaultCategorySeedKey: 'social',
    showsPlatform: true,
  },
  other: {
    label: 'Other',
    description: 'Anything that does not fit elsewhere',
    icon: 'bookmark',
    requiresUrl: true,
    defaultCategorySeedKey: 'other',
    showsPlatform: false,
  },
};

export interface PlatformMeta {
  label: string;
  /** Generic glyph only; this app has no official brand integration. */
  icon: IconKey;
  /** Hostnames (and their subdomains) that identify the platform. */
  hosts: string[];
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  youtube: {
    label: 'YouTube',
    icon: 'youtube',
    hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
  },
  facebook: { label: 'Facebook', icon: 'facebook', hosts: ['facebook.com', 'fb.com', 'fb.watch'] },
  instagram: { label: 'Instagram', icon: 'instagram', hosts: ['instagram.com', 'instagr.am'] },
  tiktok: { label: 'TikTok', icon: 'music', hosts: ['tiktok.com'] },
  x: { label: 'X', icon: 'at-sign', hosts: ['x.com', 'twitter.com'] },
  other: { label: 'Other', icon: 'globe', hosts: [] },
};

export interface SeedCategory {
  seedKey: string;
  name: string;
  icon: IconKey;
  children?: SeedCategory[];
}

/** Created only when the app has no data yet. All of it can be renamed or deleted. */
export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    seedKey: 'programming',
    name: 'Programming',
    icon: 'code',
    children: [
      {
        seedKey: 'programming.frontend',
        name: 'Frontend',
        icon: 'palette',
        children: [
          { seedKey: 'programming.frontend.html', name: 'HTML', icon: 'code' },
          { seedKey: 'programming.frontend.css', name: 'CSS', icon: 'palette' },
          { seedKey: 'programming.frontend.javascript', name: 'JavaScript', icon: 'code' },
          { seedKey: 'programming.frontend.react', name: 'React', icon: 'layers' },
        ],
      },
      {
        seedKey: 'programming.backend',
        name: 'Backend',
        icon: 'database',
        children: [{ seedKey: 'programming.backend.node', name: 'Node.js', icon: 'terminal' }],
      },
      { seedKey: 'programming.tools', name: 'Tools', icon: 'wrench' },
      { seedKey: 'programming.apis', name: 'APIs', icon: 'network' },
      { seedKey: 'programming.git', name: 'Git & GitHub', icon: 'git-branch' },
      { seedKey: 'programming.security', name: 'Security', icon: 'shield-check' },
    ],
  },
  {
    seedKey: 'videos',
    name: 'Videos',
    icon: 'video',
    children: [
      { seedKey: 'videos.youtube', name: 'YouTube', icon: 'youtube' },
      { seedKey: 'videos.facebook', name: 'Facebook', icon: 'facebook' },
      { seedKey: 'videos.instagram', name: 'Instagram', icon: 'instagram' },
      { seedKey: 'videos.tiktok', name: 'TikTok', icon: 'music' },
      { seedKey: 'videos.other', name: 'Other', icon: 'film' },
    ],
  },
  {
    seedKey: 'prompts',
    name: 'Prompts',
    icon: 'message-square-text',
    children: [
      { seedKey: 'prompts.coding', name: 'Coding', icon: 'terminal' },
      { seedKey: 'prompts.image', name: 'Image Generation', icon: 'image' },
      { seedKey: 'prompts.research', name: 'Research', icon: 'book-open' },
      { seedKey: 'prompts.writing', name: 'Writing', icon: 'file-text' },
    ],
  },
  {
    seedKey: 'social',
    name: 'Social Media',
    icon: 'share-2',
    children: [
      { seedKey: 'social.facebook', name: 'Facebook', icon: 'facebook' },
      { seedKey: 'social.instagram', name: 'Instagram', icon: 'instagram' },
      { seedKey: 'social.x', name: 'X', icon: 'at-sign' },
      { seedKey: 'social.tiktok', name: 'TikTok', icon: 'music' },
    ],
  },
  {
    seedKey: 'websites',
    name: 'Websites',
    icon: 'globe',
    children: [
      { seedKey: 'websites.inspiration', name: 'Inspiration', icon: 'lightbulb' },
      { seedKey: 'websites.documentation', name: 'Documentation', icon: 'book-open' },
      { seedKey: 'websites.tools', name: 'Tools', icon: 'wrench' },
    ],
  },
  { seedKey: 'other', name: 'Other', icon: 'bookmark' },
];

/** Reserved for a future optional serverless endpoint. Not called in version 1. */
export const FEATURES = {
  metadataApi: false,
  metadataEndpoint: '/api/metadata',
} as const;
