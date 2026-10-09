import { useEffect, useMemo, useRef, useState } from 'react';
import { LuPencil, LuPlus, LuSearchX, LuStar, LuTrash2, LuInbox, LuLayoutGrid } from 'react-icons/lu';
import { RESOURCE_TYPE_META } from '../config/app';
import { useAppUi } from '../hooks/useAppUi';
import { useLibrary } from '../hooks/useLibrary';
import { buildTree, pathTo, type CategoryNode } from '../lib/categories/tree';
import { pluralize } from '../lib/format';
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

  const results = useMemo(
    () =>
      sortResources(
        applyFilters(effective, {
          resources: library.resources,
          categories: library.categories,
          index: library.searchIndex,
        }),
        sort,
      ),
    [effective, library.resources, library.categories, library.searchIndex, sort],
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
      <EmptyState icon={LuInbox} title="Category not found" message="This category may have been deleted or renamed in another tab.">
        <button type="button" className="button button--primary" onClick={() => navigate({ name: 'home' })}>
          Back to Home
        </button>
      </EmptyState>
    );
  }

  const path = category ? pathTo(library.categoryById, category.id) : [];
  const title = category ? category.name : scope === 'favorites' ? 'Favorites' : 'All Resources';
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
        <EmptyState icon={LuInbox} title="No resources yet" message="Start building your personal resource library.">
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> Add your first resource
          </button>
        </EmptyState>
      );
    }
    if (filtersApplied) {
      return (
        <EmptyState icon={LuSearchX} title="No resources found" message="Nothing matches your search and filters. Try one of these:">
          <button type="button" className="button button--soft" onClick={clearFilters}>
            Clear search &amp; filters
          </button>
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> Add a new resource
          </button>
        </EmptyState>
      );
    }
    if (scope === 'favorites') {
      return (
        <EmptyState icon={LuStar} title="No favorites yet" message="Tap the star on any resource to keep it close at hand.">
          <button type="button" className="button button--soft" onClick={() => navigate({ name: 'all' })}>
            Browse all resources
          </button>
        </EmptyState>
      );
    }
    if (category) {
      return (
        <EmptyState icon={LuInbox} title="This category is empty" message={`Nothing saved in ${category.name} yet.`}>
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> Add to {category.name}
          </button>
        </EmptyState>
      );
    }
    return (
      <EmptyState icon={LuInbox} title="Nothing here yet" message="Add a resource to see it here.">
        <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add' })}>
          Add resource
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
        title={singleType === 'prompt' ? 'No prompts yet' : singleType === 'video' ? 'No videos yet' : `No ${RESOURCE_TYPE_META[singleType].label.toLowerCase()} items yet`}
        message={
          singleType === 'prompt'
            ? 'Save your best prompts here and copy them with one click.'
            : singleType === 'video'
              ? 'Save YouTube, Facebook, Instagram or TikTok videos by link.'
              : 'Nothing of this type has been saved yet.'
        }
      >
        <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', type: singleType, categoryId })}>
          <LuPlus className="icon" size={16} aria-hidden="true" /> Add {RESOURCE_TYPE_META[singleType].label.toLowerCase()}
        </button>
        <button type="button" className="button button--ghost" onClick={clearFilters}>
          Clear filters
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
              {pluralize(results.length, 'resource')}
              {searching ? ` matching “${filters.query.trim()}” across everything` : ''}
            </p>
          </div>
        </div>
        <div className="page__actions">
          <button type="button" className="button button--primary" onClick={() => openModal({ kind: 'add', categoryId })}>
            <LuPlus className="icon" size={16} aria-hidden="true" /> Add{category ? ` to ${category.name}` : ''}
          </button>
          {category ? (
            <>
              <button
                type="button"
                className="icon-button"
                aria-label={`Edit ${category.name}`}
                title="Edit category"
                onClick={() => openModal({ kind: 'category', mode: 'edit', id: category.id })}
              >
                <LuPencil className="icon" size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button icon-button--danger"
                aria-label={`Delete ${category.name}`}
                title="Delete category"
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
          Search looks through all of your resources.{' '}
          <button type="button" className="link-button" onClick={clearFilters}>
            Back to {node.category.name}
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
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
          {results.length > shown.length ? (
            <div className="load-more">
              <button type="button" className="button button--soft" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                Show more ({results.length - shown.length} remaining)
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
