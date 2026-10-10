import { LuCalendar, LuFolder, LuLink } from 'react-icons/lu';
import { PLATFORM_META, RESOURCE_TYPE_META } from '../../config/app';
import { useI18n } from '../../i18n';
import { platformLabel, typeLabel } from '../../lib/labels';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { formatDateTime } from '../../lib/format';
import { pathTo } from '../../lib/categories/tree';
import { toSafeHref } from '../../lib/url';
import {
  CopyAction,
  DeleteButton,
  EditButton,
  FavoriteButton,
  OpenLink,
} from '../resources/ResourceActions';
import { CopyButton } from '../ui/CopyButton';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/icons';
import { Thumbnail } from '../ui/Thumbnail';

export function ResourceDetailDialog({ id }: { id: string }) {
  const { resources, categoryById } = useLibrary();
  const { closeModal, navigate } = useAppUi();
  const { t } = useI18n();
  const resource = resources.find((item) => item.id === id);

  if (!resource) {
    return (
      <Dialog title={t('detail.notFound')} size="sm" onClose={closeModal}>
        <p className="prose">{t('detail.notFoundBody')}</p>
      </Dialog>
    );
  }

  const meta = RESOURCE_TYPE_META[resource.type];
  const href = toSafeHref(resource.url);
  const path = pathTo(categoryById, resource.categoryId);
  const platform = resource.platform && resource.platform !== 'other' ? resource.platform : null;

  return (
    <Dialog title={resource.title} size="lg" onClose={closeModal}>
      <div className="detail">
        {resource.type !== 'prompt' ? (
          <div className="detail__media">
            <Thumbnail resource={resource} />
          </div>
        ) : null}

        <div className="detail__badges">
          <span className="badge">
            <Icon name={meta.icon} size={13} />
            {typeLabel(resource.type)}
          </span>
          {platform ? (
            <span className="badge">
              <Icon name={PLATFORM_META[platform].icon} size={13} />
              {platformLabel(platform)}
            </span>
          ) : null}
          {resource.project ? <span className="badge badge--quiet">{t('detail.project', { name: resource.project })}</span> : null}
        </div>

        {href ? (
          <div className="detail__url">
            <LuLink className="icon" size={16} aria-hidden="true" />
            <a href={href} target="_blank" rel="noopener noreferrer">
              {resource.url}
            </a>
          </div>
        ) : null}

        {resource.description ? <p className="detail__text">{resource.description}</p> : null}

        {resource.type === 'prompt' && resource.promptContent ? (
          <section className="detail__section" aria-label={t('detail.prompt')}>
            <div className="detail__section-head">
              <h3>{t('detail.prompt')}</h3>
              <CopyButton
                text={resource.promptContent}
                label={t('action.copyPrompt')}
                successMessage={t('action.promptCopied')}
                variant="button"
              />
            </div>
            <pre className="prompt-box">{resource.promptContent}</pre>
          </section>
        ) : null}

        {resource.notes ? (
          <section className="detail__section" aria-label={t('detail.notes')}>
            <h3>{t('detail.notes')}</h3>
            <p className="detail__text detail__text--pre">{resource.notes}</p>
          </section>
        ) : null}

        {resource.tags.length > 0 ? (
          <ul className="chips" aria-label={t('card.tags')}>
            {resource.tags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    closeModal();
                    navigate({ name: 'all' }, { tags: [tag] });
                  }}
                >
                  #{tag}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="meta-list">
          <div>
            <dt>
              <LuFolder className="icon" size={14} aria-hidden="true" /> {t('detail.category')}
            </dt>
            <dd>
              {path.length === 0 ? (
                t('detail.uncategorized')
              ) : (
                <span className="crumbs-inline">
                  {path.map((category, index) => (
                    <span key={category.id}>
                      {index > 0 ? <span aria-hidden="true"> › </span> : null}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          closeModal();
                          navigate({ name: 'category', id: category.id });
                        }}
                      >
                        {category.name}
                      </button>
                    </span>
                  ))}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <LuCalendar className="icon" size={14} aria-hidden="true" /> {t('detail.saved')}
            </dt>
            <dd>{formatDateTime(resource.createdAt)}</dd>
          </div>
          <div>
            <dt>
              <LuCalendar className="icon" size={14} aria-hidden="true" /> {t('detail.updated')}
            </dt>
            <dd>{formatDateTime(resource.updatedAt)}</dd>
          </div>
        </dl>

        <div className="detail__actions">
          {resource.url ? <OpenLink resource={resource} /> : null}
          {resource.type !== 'prompt' ? <CopyAction resource={resource} variant="button" /> : null}
          {resource.type === 'prompt' && resource.url ? (
            <CopyButton text={resource.url} label={t('action.copyUrl')} successMessage={t('action.linkCopied')} variant="button" />
          ) : null}
          <div className="detail__actions-end">
            <FavoriteButton resource={resource} />
            <EditButton resource={resource} />
            <DeleteButton resource={resource} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
