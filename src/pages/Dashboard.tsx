import { useEffect, useMemo, useRef } from 'react';
import { LuChevronRight, LuInbox, LuPlus } from 'react-icons/lu';
import { APP_NAME, APP_TAGLINE, RECENT_COUNT, RESOURCE_TYPE_META } from '../config/app';
import { useAppUi } from '../hooks/useAppUi';
import { useLibrary } from '../hooks/useLibrary';
import { buildTree, pathLabel } from '../lib/categories/tree';
import { formatDate, pluralize } from '../lib/format';
import { RESOURCE_TYPES } from '../types';
import { BranchMap } from '../components/categories/CategoryNodes';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/icons';
import { Thumbnail } from '../components/ui/Thumbnail';

/** Navigation-first home: quick add, a few counts, recent items and the category map. */
export function Dashboard() {
  const { resources, categories, categoryById } = useLibrary();
  const { openModal, navigate } = useAppUi();
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
  const count = (type: (typeof RESOURCE_TYPES)[number]) => resources.filter((r) => r.type === type).length;
  const favorites = resources.filter((r) => r.favorite).length;

  const stats = [
    { label: 'All resources', value: resources.length, go: () => navigate({ name: 'all' }) },
    { label: 'Favorites', value: favorites, go: () => navigate({ name: 'favorites' }) },
    { label: 'Programming', value: count('programming'), go: () => navigate({ name: 'all' }, { types: ['programming'] }) },
    { label: 'Videos', value: count('video'), go: () => navigate({ name: 'all' }, { types: ['video'] }) },
    { label: 'Prompts', value: count('prompt'), go: () => navigate({ name: 'all' }, { types: ['prompt'] }) },
  ];

  return (
    <div className="page">
      <header className="hero">
        <h1 ref={headingRef} tabIndex={-1} className="hero__title">
          {APP_NAME}
        </h1>
        <p className="hero__tagline">{APP_TAGLINE}</p>
      </header>

      <section aria-labelledby="quick-add" className="section">
        <h2 id="quick-add" className="section__title">Quick add</h2>
        <div className="quick-add">
          {RESOURCE_TYPES.map((type) => (
            <button key={type} type="button" className="quick-add__item glass" onClick={() => openModal({ kind: 'add', type })}>
              <span className="quick-add__icon">
                <Icon name={RESOURCE_TYPE_META[type].icon} size={18} />
              </span>
              <span>{RESOURCE_TYPE_META[type].label}</span>
              <LuPlus className="icon quick-add__plus" size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Overview" className="stats">
        {stats.map((stat) => (
          <button key={stat.label} type="button" className="stat glass" onClick={stat.go}>
            <span className="stat__value">{stat.value}</span>
            <span className="stat__label">{stat.label}</span>
          </button>
        ))}
      </section>

      <section aria-labelledby="recent" className="section">
        <div className="section__head">
          <h2 id="recent" className="section__title">Recently added</h2>
          {resources.length > RECENT_COUNT ? (
            <button type="button" className="link-button" onClick={() => navigate({ name: 'all' })}>
              View all <LuChevronRight className="icon" size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={LuInbox} title="No resources yet" message="Start building your personal resource library.">
            <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add' })}>
              <LuPlus className="icon" size={16} aria-hidden="true" /> Add your first resource
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
          <h2 id="map" className="section__title">Your map</h2>
          <button type="button" className="link-button" onClick={() => openModal({ kind: 'category', mode: 'create', parentId: null })}>
            <LuPlus className="icon" size={14} aria-hidden="true" /> New category
          </button>
        </div>
        {tree.length === 0 ? (
          <p className="muted">No categories yet. Create one to start organizing your {pluralize(resources.length, 'resource')}.</p>
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
