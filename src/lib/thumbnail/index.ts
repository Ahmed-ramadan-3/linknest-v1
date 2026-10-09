import type { Resource } from '../../types';
import { extractYouTubeId } from '../platform';
import { toSafeHref } from '../url';

/**
 * Thumbnail strategy (no network calls are made here):
 *  A. Known platforms: YouTube thumbnails are derived from the video id.
 *  B. A user-provided image URL always wins.
 *  C. (Future) metadata from an optional serverless endpoint, see lib/metadata.
 *  D. Otherwise null, and the UI renders a generated placeholder.
 */
export function getThumbnailUrl(
  resource: Pick<Resource, 'thumbnailUrl' | 'url'>,
  allowRemote: boolean,
): string | null {
  if (!allowRemote) return null;

  const provided = toSafeHref(resource.thumbnailUrl);
  if (provided) return provided;

  const youtubeId = resource.url ? extractYouTubeId(resource.url) : null;
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

  return null;
}
