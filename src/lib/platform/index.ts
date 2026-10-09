import { PLATFORM_META } from '../../config/app';
import type { Platform } from '../../types';
import { PLATFORMS } from '../../types';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_PATH_PREFIXES = ['shorts', 'embed', 'live', 'v'];

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function safeParse(url: string): URL | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns the platform a URL belongs to, or null when it is not a known one. */
export function detectPlatform(url: string): Platform | null {
  const parsed = safeParse(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  for (const platform of PLATFORMS) {
    if (PLATFORM_META[platform].hosts.some((domain) => hostMatches(host, domain))) return platform;
  }
  return null;
}

/**
 * Extracts a YouTube video id from watch, youtu.be, shorts, embed, live and /v/ URLs.
 * The id is validated against the 11-character alphabet, so it is safe to embed in a URL.
 */
export function extractYouTubeId(url: string): string | null {
  const parsed = safeParse(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return YOUTUBE_ID.test(id) ? id : null;
  }

  const isYouTube = hostMatches(host, 'youtube.com') || hostMatches(host, 'youtube-nocookie.com');
  if (!isYouTube) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments[0] === 'watch') {
    const id = parsed.searchParams.get('v') ?? '';
    return YOUTUBE_ID.test(id) ? id : null;
  }
  if (segments[0] && YOUTUBE_PATH_PREFIXES.includes(segments[0])) {
    const id = segments[1] ?? '';
    return YOUTUBE_ID.test(id) ? id : null;
  }
  return null;
}
