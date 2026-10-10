import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { LuPencil, LuPlus, LuSearchX, LuStar, LuTrash2, LuInbox, LuLayoutGrid } from 'react-icons/lu';
import { useAppUi } from '../hooks/useAppUi';
import { useLibrary } from '../hooks/useLibrary';
import { buildTree, pathLabel, pathTo, type CategoryNode } from '../lib/categories/tree';
import { useI18n } from '../i18n';
import { typeLabel } from '../lib/labels';
import { applyFilters, sortResources } from '../lib/search';
import type { LibraryFilters } from '../types';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { BranchMap } from '../components/categories/CategoryNodes';
import { FilterBar } from '../components/resources/FilterBar';
import { ResourceCard } from '../components/resources/ResourceCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/icons';

const PAGE_SIZE = 60;

function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.category.id === id) return node;
    const inner = findNode(node.children, id);
    if (inner) return inner;
  }
  return null;
}

/** All Resources, Favorites and category pages share one view. */
export function LibraryPage({ scope }: { scope: 'all' | 'favorites' | { categoryId: string } }) {
  const library = useLibrary();
  const { t, plural } = useI18n();
  const { filters, sort, openModal, navigate, clearFilters } = useAppUi();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categoryId = typeof scope === 'object' ? scope.categoryId : null;
  const category = categoryId ? library.categoryById.get(categoryId) : undefined;
  const tree = useMemo(() => buildTree(library.categories), [library.categories]);
  const node = categoryId ? findNode(tree, categoryId) : null;
  const searching = filters.query.trim() !== '';

  const effective = useMemo<LibraryFilters>(
    () => ({
      ...filters,
      favoritesOnly: scope === 'favorites' ? true : filters.favoritesOnly,
      categoryId: categoryId ?? filters.categoryId,
    }),
    [filters, scope, categoryId],
  );

  // Typing and filter changes stay responsive: the list catches up when the browser is idle.
  const deferredFilters = useDeferredValue(effective);
  const results = useMemo(
    () =>
      sortResources(
        applyFilters(deferredFilters, {
          resources: library.resources,
          categories: library.categories,
          index: library.searchIndex,
        }),
        sort,
      ),
    [deferredFilters, library.resources, library.categories, library.searchIndex, sort],
  );

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [effective, sort, scope]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [scope]);

  if (categoryId && !category) {
    return (
      <EmptyState icon={LuInbox} title={t('page.notFoundTitle')} message={t('page.notFoundBody')}>
        <button type="button" className="button button--primary" onClick={() => navigate({ name: 'home' })}>
          {t('common.backHome')}
        </button>
      </EmptyState>
    );
  }

  const path = category ? pathTo(library.categoryById, category.id) : [];
  const title = category ? category.name : scope === 'favorites' ? t('nav.favorites') : t('nav.all');
  const filtersApplied =
    searching ||
    filters.types.length > 0 ||
    filters.platforms.length > 0 ||
    filters.tags.length > 0 ||
    filters.date !== 'any' ||
    (scope !== 'favorites' && filters.favoritesOnly) ||
    (!categoryId && filters.categoryId !== null);

  const shown = results.slice(0, visible);

  const emptyState = () => {
    if (library.resources.length === 0) {
      return (
        <EmptyState icon={LuInbox} title={t('empty.noneTitle')} message={t('empty.noneBody')}>
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> {t('empty.addFirst')}
          </button>
        </EmptyState>
      );
    }
    if (filtersApplied) {
      return (
        <EmptyState icon={LuSearchX} title={t('empty.foundTitle')} message={t('empty.foundBody')}>
          <button type="button" className="button button--soft" onClick={clearFilters}>
            {t('empty.clearAll')}
          </button>
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> {t('empty.addNew')}
          </button>
        </EmptyState>
      );
    }
    if (scope === 'favorites') {
      return (
        <EmptyState icon={LuStar} title={t('empty.favTitle')} message={t('empty.favBody')}>
          <button type="button" className="button button--soft" onClick={() => navigate({ name: 'all' })}>
            {t('empty.browseAll')}
          </button>
        </EmptyState>
      );
    }
    if (category) {
      return (
        <EmptyState icon={LuInbox} title={t('empty.catTitle')} message={t('empty.catBody', { name: category.name })}>
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> {t('page.addTo', { name: category.name })}
          </button>
        </EmptyState>
      );
    }
    return (
      <EmptyState icon={LuInbox} title={t('empty.nothingTitle')} message={t('empty.nothingBody')}>
        <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add' })}>
          {t('empty.addResource')}
        </button>
      </EmptyState>
    );
  };

  // Type-specific empty states (no prompts / no videos yet).
  const singleType = filters.types.length === 1 ? filters.types[0] : null;
  const typeSpecificEmpty =
    results.length === 0 && singleType && !searching && library.resources.length > 0 ? (
      <EmptyState
        icon={LuInbox}
        title={
          singleType === 'prompt'
            ? t('empty.noPrompts')
            : singleType === 'video'
              ? t('empty.noVideos')
              : t('empty.noType', { type: typeLabel(singleType) })
        }
        message={
          singleType === 'prompt'
            ? t('empty.noPromptsBody')
            : singleType === 'video'
              ? t('empty.noVideosBody')
              : t('empty.noTypeBody')
        }
      >
        <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', type: singleType, categoryId })}>
          <LuPlus className="icon" size={16} aria-hidden="true" /> {t('empty.addType', { type: typeLabel(singleType) })}
        </button>
        <button type="button" className="button button--ghost" onClick={clearFilters}>
          {t('filters.clear')}
        </button>
      </EmptyState>
    ) : null;

  return (
    <div className="page">
      <Breadcrumbs path={path} label={!category ? title : undefined} />

      <header className="page__header">
        <div className="page__title">
          {category ? (
            <span className={`page__icon${category.accent ? ` accent-${category.accent}` : ''}`}>
              <Icon name={category.icon} size={22} />
            </span>
          ) : scope === 'favorites' ? (
            <span className="page__icon"><LuStar className="icon" size={22} aria-hidden="true" /></span>
          ) : (
            <span className="page__icon"><LuLayoutGrid className="icon" size={22} aria-hidden="true" /></span>
          )}
          <div>
            <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
            <p className="page__sub">
              {plural('count.resource', results.length)}
              {searching ? t('page.matching', { query: filters.query.trim() }) : ''}
            </p>
          </div>
        </div>
        <div className="page__actions">
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> {category ? t('page.addTo', { name: category.name }) : t('common.add')}
          </button>
          {category ? (
            <>
              <button
                type="button"
                className="icon-button"
                aria-label={t('page.editCategory', { name: category.name })}
                title={t('page.editCategoryShort')}
                onClick={() => openModal({ kind: 'category', mode: 'edit', id: category.id })}
              >
                <LuPencil className="icon" size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button icon-button--danger"
                aria-label={t('page.deleteCategory', { name: category.name })}
                title={t('page.deleteCategoryShort')}
                onClick={() => openModal({ kind: 'deleteCategory', id: category.id })}
              >
                <LuTrash2 className="icon" size={17} aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </header>

      {node && !searching ? (
        <BranchMap
          root={node}
          onAddChild={() => openModal({ kind: 'category', mode: 'create', parentId: node.category.id })}
        />
      ) : null}
      {node && searching ? (
        <p className="notice">
          {t('page.searchAll')}{' '}
          <button type="button" className="link-button" onClick={clearFilters}>
            {t('page.backTo', { name: node.category.name })}
          </button>
        </p>
      ) : null}

      <FilterBar categoryLocked={Boolean(categoryId)} favoritesLocked={scope === 'favorites'} />

      {results.length === 0 ? (
        typeSpecificEmpty ?? emptyState()
      ) : (
        <>
          <div className="grid" aria-live="polite">
            {shown.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                categoryPath={pathLabel(library.categoryById, resource.categoryId)}
              />
            ))}
          </div>
          {results.length > shown.length ? (
            <div className="load-more">
              <button type="button" className="button button--soft" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                {t('page.showMore', { n: results.length - shown.length })}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
