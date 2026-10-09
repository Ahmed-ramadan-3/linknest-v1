/**
 * Icon keys that can be stored on categories and resources.
 * The key list lives here (framework-free) so validation and import code can
 * check values without importing React. The key -> component map is in
 * components/ui/icons.tsx.
 */
export const ICON_KEYS = [
  'folder',
  'folder-open',
  'code',
  'terminal',
  'git-branch',
  'database',
  'cpu',
  'wrench',
  'shield-check',
  'palette',
  'image',
  'video',
  'film',
  'music',
  'youtube',
  'facebook',
  'instagram',
  'at-sign',
  'share-2',
  'globe',
  'link',
  'bookmark',
  'star',
  'book-open',
  'file-text',
  'newspaper',
  'lightbulb',
  'briefcase',
  'layers',
  'network',
  'hash',
  'message-square-text',
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export function isIconKey(value: unknown): value is IconKey {
  return typeof value === 'string' && (ICON_KEYS as readonly string[]).includes(value);
}
