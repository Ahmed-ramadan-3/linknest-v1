import { memo } from 'react';
import { PLATFORM_META, RESOURCE_TYPE_META } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { formatDate } from '../../lib/format';
import { pathLabel } from '../../lib/categories/tree';
import { hostLabel } from '../../lib/url';
import type { Resource } from '../../types';
import { Icon } from '../ui/icons';
import { Thumbnail } from '../ui/Thumbnail';
import { CopyAction, DeleteButton, EditButton, FavoriteButton, OpenLink } from './ResourceActions';

const MAX_VISIBLE_TAGS = 3;

function ResourceCardBase({ resource }: { resource: Resource }) {
  const { categoryById } = useLibrary();
  const { openModal, setFilters } = useAppUi();
  const meta = RESOURCE_TYPE_META[resource.type];
  const platformLabel = resource.platform && resource.platform !== 'other' ? PLATFORM_META[resource.platform].label : null;
  const source = resource.url ? hostLabel(resource.url) : '';
  const extraTags = resource.tags.length - MAX_VISIBLE_TAGS;
  const isPrompt = resource.type === 'prompt';

  return (
    <article className="card glass" data-type={resource.type}>
      <div className="card__media">
        {isPrompt ? (
          <pre className="card__prompt" aria-hidden="true">{resource.promptContent.slice(0, 280)}</pre>
        ) : (
          <Thumbnail resource={resource} />
        )}
        <span className="badge badge--float">
          <Icon name={meta.icon} size={13} />
          {platformLabel ?? meta.label}
        </span>
        <div className="card__favorite">
          <FavoriteButton resource={resource} />
        </div>
      </div>

      <div className="card__body">
        <h3 className="card__title">
          <button
            type="button"
            className="card__open-detail"
            onClick={() => openModal({ kind: 'detail', id: resource.id })}
          >
            {resource.title}
          </button>
        </h3>
        {source ? <p className="card__source">{source}</p> : null}
        {resource.description ? <p className="card__description">{resource.description}</p> : null}

        <p className="card__crumb">
          <Icon name="folder" size={13} />
          <span>{pathLabel(categoryById, resource.categoryId)}</span>
        </p>

        {resource.tags.length > 0 ? (
          <ul className="chips" aria-label="Tags">
            {resource.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
              <li key={tag}>
                <button type="button" className="chip" onClick={() => setFilters({ tags: [tag] })} title={`Filter by ${tag}`}>
                  #{tag}
                </button>
              </li>
            ))}
            {extraTags > 0 ? <li className="chip chip--static">+{extraTags}</li> : null}
          </ul>
        ) : null}
      </div>

      <div className="card__footer">
        <time className="card__date" dateTime={resource.createdAt}>
          {formatDate(resource.createdAt)}
        </time>
        <div className="card__actions">
          <CopyAction resource={resource} />
          <EditButton resource={resource} />
          <DeleteButton resource={resource} />
          {isPrompt && !resource.url ? null : <OpenLink resource={resource} variant="compact" />}
        </div>
      </div>
    </article>
  );
}

export const ResourceCard = memo(ResourceCardBase);
