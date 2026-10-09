import { LIMITS } from '../../config/app';
import { extractYouTubeId } from '../platform';

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HOST_WITH_PORT = /^[a-z0-9.-]+:\d{1,5}(?:[/?#]|$)/i;
// Whitespace or control characters anywhere in a URL are never legitimate.
const FORBIDDEN_CHARS = /[\s\u0000-\u001f\u007f]/;

function looksLikeHost(host: string): boolean {
  return host === 'localhost' || host.includes('.') || host.includes(':');
}

/**
 * Parses a user-entered URL. Only http(s) is accepted. A bare "example.com/x" is
 * upgraded to https. Schemes such as javascript:, data:, vbscript: and file: are
 * rejected, as are URLs with embedded credentials.
 */
export function parseHttpUrl(raw: string): URL | null {
  const result = checkUrl(raw);
  if (!result.ok) return null;
  try {
    return new URL(result.url);
  } catch {
    return null;
  }
}

export function checkUrl(raw: string): UrlCheck {
  const input = (raw ?? '').trim();
  if (!input) return { ok: false, reason: 'Enter a URL.' };
  if (input.length > LIMITS.url) return { ok: false, reason: 'This URL is too long.' };
  if (FORBIDDEN_CHARS.test(input)) return { ok: false, reason: 'This URL contains spaces or invalid characters.' };

  let candidate = input;
  if (ANY_SCHEME.test(input) && !HOST_WITH_PORT.test(input)) {
    if (!/^https?:\/\//i.test(input)) {
      return { ok: false, reason: 'Only http:// and https:// links can be saved.' };
    }
  } else if (!/^https?:\/\//i.test(input)) {
    candidate = `https://${input.replace(/^\/\//, '')}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: 'This does not look like a valid URL.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http:// and https:// links can be saved.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with a username or password are not supported.' };
  }
  if (!parsed.hostname || !looksLikeHost(parsed.hostname)) {
    return { ok: false, reason: 'This does not look like a valid URL.' };
  }
  return { ok: true, url: candidate };
}

/** Re-validates at render time. Returns a safe absolute href or null. */
export function toSafeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const parsed = parseHttpUrl(url);
  return parsed ? parsed.href : null;
}

export function hostLabel(url: string): string {
  const parsed = parseHttpUrl(url);
  if (!parsed) return '';
  return parsed.hostname.replace(/^www\./i, '');
}

/**
 * Builds a key used only for duplicate detection; the stored URL is never changed.
 * It is deliberately conservative: scheme (http vs https), case of host, default
 * ports, fragments, a trailing slash and query-parameter order are ignored, but
 * the path and every query parameter value are kept. YouTube links collapse to
 * the video id because several URL shapes point at the same video.
 */
export function normalizeUrlKey(url: string): string {
  const parsed = parseHttpUrl(url);
  if (!parsed) return url.trim().toLowerCase();

  const youtubeId = extractYouTubeId(parsed.href);
  if (youtubeId) return `youtube:${youtubeId}`;

  const host = parsed.hostname.toLowerCase();
  const port = parsed.port && !isDefaultPort(parsed) ? `:${parsed.port}` : '';
  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  const params = [...parsed.searchParams.entries()].sort(([a, av], [b, bv]) =>
    a === b ? av.localeCompare(bv) : a.localeCompare(b),
  );
  const query = params.length
    ? `?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
    : '';
  return `${host}${port}${path}${query}`;
}

function isDefaultPort(url: URL): boolean {
  return (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  );
}
