import { memo } from 'react';
import { RESOURCE_TYPE_META } from '../../config/app';
import { useAppUiActions } from '../../hooks/useAppUi';
import { useI18n } from '../../i18n';
import { formatDate } from '../../lib/format';
import { platformLabel, typeLabel } from '../../lib/labels';
import { hostLabel } from '../../lib/url';
import type { Resource } from '../../types';
import { Icon } from '../ui/icons';
import { Thumbnail } from '../ui/Thumbnail';
import { CopyAction, DeleteButton, EditButton, FavoriteButton, OpenLink } from './ResourceActions';

const MAX_VISIBLE_TAGS = 3;

interface Props {
  resource: Resource;
  /** Breadcrumb text such as "Programming › Frontend". Passed in so the card does not depend on the whole library. */
  categoryPath: string;
}

function ResourceCardBase({ resource, categoryPath }: Props) {
  const { openModal, setFilters } = useAppUiActions();
  const { t } = useI18n();
  const meta = RESOURCE_TYPE_META[resource.type];
  const badgeLabel =
    resource.platform && resource.platform !== 'other' ? platformLabel(resource.platform) : typeLabel(resource.type);
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
          {badgeLabel}
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
          <span>{categoryPath}</span>
        </p>

        {resource.tags.length > 0 ? (
          <ul className="chips" aria-label={t('card.tags')}>
            {resource.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
              <li key={tag}>
                <button type="button" className="chip" onClick={() => setFilters({ tags: [tag] })} title={t('card.filterBy', { tag })}>
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
