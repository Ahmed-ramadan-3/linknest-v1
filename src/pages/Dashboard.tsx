import { useEffect, useMemo, useRef } from 'react';
import { LuChevronRight, LuInbox, LuPlus } from 'react-icons/lu';
import { APP_NAME, RECENT_COUNT, RESOURCE_TYPE_META } from '../config/app';
import { useI18n } from '../i18n';
import { typeLabel } from '../lib/labels';
import { useAppUi } from '../hooks/useAppUi';
import { useLibrary } from '../hooks/useLibrary';
import { buildTree, pathLabel } from '../lib/categories/tree';
import { formatDate } from '../lib/format';
import { RESOURCE_TYPES } from '../types';
import { BranchMap } from '../components/categories/CategoryNodes';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/icons';
import { Thumbnail } from '../components/ui/Thumbnail';

/** Navigation-first home: quick add, a few counts, recent items and the category map. */
export function Dashboard() {
  const { resources, categories, categoryById } = useLibrary();
  const { openModal, navigate } = useAppUi();
  const { t, plural } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const recent = useMemo(
    () => [...resources].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, RECENT_COUNT),
    [resources],
  );
  // One pass over the library for every count shown on the dashboard.
  const totals = useMemo(() => {
    const byType: Record<string, number> = {};
    let favorites = 0;
    for (const resource of resources) {
      byType[resource.type] = (byType[resource.type] ?? 0) + 1;
      if (resource.favorite) favorites += 1;
    }
    return { byType, favorites };
  }, [resources]);

  const stats = [
    { key: 'all', label: t('dash.statAll'), value: resources.length, go: () => navigate({ name: 'all' }) },
    { key: 'fav', label: t('dash.statFavorites'), value: totals.favorites, go: () => navigate({ name: 'favorites' }) },
    { key: 'prog', label: t('dash.statProgramming'), value: totals.byType.programming ?? 0, go: () => navigate({ name: 'all' }, { types: ['programming'] }) },
    { key: 'video', label: t('dash.statVideos'), value: totals.byType.video ?? 0, go: () => navigate({ name: 'all' }, { types: ['video'] }) },
    { key: 'prompt', label: t('dash.statPrompts'), value: totals.byType.prompt ?? 0, go: () => navigate({ name: 'all' }, { types: ['prompt'] }) },
  ];

  return (
    <div className="page">
      <header className="hero">
        <h1 ref={headingRef} tabIndex={-1} className="hero__title">
          {APP_NAME}
        </h1>
        <p className="hero__tagline">{t('app.tagline')}</p>
      </header>

      <section aria-labelledby="quick-add" className="section">
        <h2 id="quick-add" className="section__title">{t('dash.quickAdd')}</h2>
        <div className="quick-add">
          {RESOURCE_TYPES.map((type) => (
            <button key={type} type="button" className="quick-add__item glass" onClick={() => openModal({ kind: 'add', type })}>
              <span className="quick-add__icon">
                <Icon name={RESOURCE_TYPE_META[type].icon} size={18} />
              </span>
              <span>{typeLabel(type)}</span>
              <LuPlus className="icon quick-add__plus" size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section aria-label={t('dash.overview')} className="stats">
        {stats.map((stat) => (
          <button key={stat.key} type="button" className="stat glass" onClick={stat.go}>
            <span className="stat__value">{stat.value}</span>
            <span className="stat__label">{stat.label}</span>
          </button>
        ))}
      </section>

      <section aria-labelledby="recent" className="section">
        <div className="section__head">
          <h2 id="recent" className="section__title">{t('dash.recent')}</h2>
          {resources.length > RECENT_COUNT ? (
            <button type="button" className="link-button" onClick={() => navigate({ name: 'all' })}>
              {t('dash.viewAll')} <LuChevronRight className="icon icon--dir" size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={LuInbox} title={t('empty.noneTitle')} message={t('empty.noneBody')}>
            <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add' })}>
              <LuPlus className="icon" size={16} aria-hidden="true" /> {t('empty.addFirst')}
            </button>
          </EmptyState>
        ) : (
          <ul className="recent glass">
            {recent.map((resource) => (
              <li key={resource.id}>
                <button type="button" className="recent__row" onClick={() => openModal({ kind: 'detail', id: resource.id })}>
                  <span className="recent__thumb">
                    <Thumbnail resource={resource} compact />
                  </span>
                  <span className="recent__text">
                    <span className="recent__title">{resource.title}</span>
                    <span className="recent__meta">{pathLabel(categoryById, resource.categoryId)}</span>
                  </span>
                  <time className="recent__date" dateTime={resource.createdAt}>
                    {formatDate(resource.createdAt)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="map" className="section">
        <div className="section__head">
          <h2 id="map" className="section__title">{t('dash.map')}</h2>
          <button type="button" className="link-button" onClick={() => openModal({ kind: 'category', mode: 'create', parentId: null })}>
            <LuPlus className="icon" size={14} aria-hidden="true" /> {t('dash.newCategory')}
          </button>
        </div>
        {tree.length === 0 ? (
          <p className="muted">{t('dash.noCategories', { resources: plural('count.resource', resources.length) })}</p>
        ) : (
          <div className="map-grid">
            {tree.map((root) => (
              <BranchMap key={root.category.id} root={root} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
