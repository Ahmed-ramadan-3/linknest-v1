import { useEffect, useState } from 'react';
import { RESOURCE_TYPE_META, PLATFORM_META } from '../../config/app';
import { useSettings } from '../../hooks/useSettings';
import { hashString, initials } from '../../lib/format';
import { getThumbnailUrl } from '../../lib/thumbnail';
import type { Resource } from '../../types';
import { Icon } from './icons';

const TINT_COUNT = 6;

type ThumbnailResource = Pick<Resource, 'id' | 'title' | 'type' | 'platform' | 'icon' | 'url' | 'thumbnailUrl'>;

/**
 * Remote preview image with a generated fallback. A broken, blocked or missing
 * image never shows the browser's broken-image icon.
 */
export function Thumbnail({
  resource,
  compact = false,
}: {
  resource: ThumbnailResource;
  compact?: boolean;
}) {
  const { settings } = useSettings();
  const source = getThumbnailUrl(resource, settings.remoteThumbnails);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  useEffect(() => {
    setFailedSource(null);
  }, [source]);

  const showImage = source !== null && failedSource !== source;
  const iconName =
    resource.icon ??
    (resource.platform && resource.platform !== 'other'
      ? PLATFORM_META[resource.platform].icon
      : RESOURCE_TYPE_META[resource.type].icon);
  const tint = (hashString(resource.title || resource.id) % TINT_COUNT) + 1;

  return (
    <div className={`thumb${compact ? ' thumb--compact' : ''}`}>
      {showImage ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <div className={`thumb__placeholder tint-${tint}`}>
          <Icon name={iconName} size={compact ? 18 : 28} />
          {compact ? null : <span className="thumb__initials">{initials(resource.title)}</span>}
        </div>
      )}
    </div>
  );
}
