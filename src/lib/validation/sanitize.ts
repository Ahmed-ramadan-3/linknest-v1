import { LIMITS } from '../../config/app';
import { isIconKey } from '../../config/icons';
import type { AccentKey, IconKey, Tag } from '../../types';
import { ACCENT_KEYS } from '../../types';

// Control characters except tab and newline.
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
// Bidi override/isolate controls can visually reorder text to spoof it.
const BIDI_CONTROLS = /[‪-‮⁦-⁩]/g;

/** Single-line text: collapses whitespace, strips control characters, caps the length. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CONTROLS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Multi-line text: keeps line breaks and indentation, normalises newlines, caps the length. */
export function cleanMultiline(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS, '')
    .replace(BIDI_CONTROLS, '')
    .slice(0, max);
}

export function cleanTags(value: unknown): Tag[] {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const tags: Tag[] = [];
  for (const item of source) {
    const tag = cleanLine(typeof item === 'string' ? item.trim().replace(/^#+/, '') : '', LIMITS.tag);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= LIMITS.tagsPerResource) break;
  }
  return tags;
}

/** Splits "react, hooks #state" style input into tags. */
export function parseTagInput(input: string): Tag[] {
  return cleanTags(input.split(/[,\n،]+/));
}

export function cleanIcon(value: unknown): IconKey | null {
  return isIconKey(value) ? value : null;
}

export function cleanAccent(value: unknown): AccentKey | null {
  return typeof value === 'string' && (ACCENT_KEYS as readonly string[]).includes(value)
    ? (value as AccentKey)
    : null;
}

const MIN_DATE = Date.UTC(1970, 0, 1);
const MAX_DATE = Date.UTC(2100, 0, 1);

/** Returns a normalised ISO string for a plausible date, otherwise null. */
export function cleanIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || time < MIN_DATE || time > MAX_DATE) return null;
  return new Date(time).toISOString();
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value);
}

export function newId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
