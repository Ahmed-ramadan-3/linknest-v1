import { LuArrowUpDown, LuStar, LuX } from 'react-icons/lu';
import { PLATFORM_META, RESOURCE_TYPE_META } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import {
  PLATFORMS,
  RESOURCE_TYPES,
  type DatePreset,
  type Platform,
  type ResourceType,
  type SortKey,
} from '../../types';
import { CategorySelect } from '../ui/forms';
import { Icon } from '../ui/icons';

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  'title-asc': 'Title A–Z',
  'title-desc': 'Title Z–A',
  updated: 'Recently updated',
  favorites: 'Favorites first',
};
const DATE_LABEL: Record<DatePreset, string> = {
  any: 'Any time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  year: 'This year',
};

interface Props {
  /** True when the route already fixes the category (category pages). */
  categoryLocked: boolean;
  /** True when the route already fixes favorites (favorites page). */
  favoritesLocked: boolean;
}

export function FilterBar({ categoryLocked, favoritesLocked }: Props) {
  const { filters, setFilters, clearFilters, sort, setSort } = useAppUi();
  const { tags, categories } = useLibrary();

  const toggleType = (type: ResourceType) =>
    setFilters({
      types: filters.types.includes(type) ? filters.types.filter((t) => t !== type) : [...filters.types, type],
    });

  const active =
    filters.types.length > 0 ||
    filters.platforms.length > 0 ||
    filters.tags.length > 0 ||
    filters.date !== 'any' ||
    (!favoritesLocked && filters.favoritesOnly) ||
    (!categoryLocked && filters.categoryId !== null) ||
    filters.query.trim() !== '';

  return (
    <div className="filters glass" role="group" aria-label="Filter and sort">
      <div className="filters__types" role="group" aria-label="Type">
        {RESOURCE_TYPES.map((type) => {
          const selected = filters.types.includes(type);
          return (
            <button
              key={type}
              type="button"
              className={`filter-chip${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => toggleType(type)}
            >
              <Icon name={RESOURCE_TYPE_META[type].icon} size={14} />
              {RESOURCE_TYPE_META[type].label}
            </button>
          );
        })}
      </div>

      <div className="filters__controls">
        {!categoryLocked ? (
          <label className="inline-field">
            <span className="inline-field__label">Category</span>
            <CategorySelect
              id="filter-category"
              compact
              categories={categories}
              value={filters.categoryId}
              emptyLabel="Any category"
              onChange={(value) => setFilters({ categoryId: value })}
            />
          </label>
        ) : null}

        <label className="inline-field">
          <span className="inline-field__label">Platform</span>
          <select
            className="input select input--sm"
            value={filters.platforms[0] ?? ''}
            onChange={(event) =>
              setFilters({ platforms: event.target.value ? [event.target.value as Platform] : [] })
            }
          >
            <option value="">Any platform</option>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_META[platform].label}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-field__label">Tag</span>
          <select
            className="input select input--sm"
            value=""
            disabled={tags.length === 0}
            onChange={(event) => {
              const tag = event.target.value;
              if (tag && !filters.tags.includes(tag)) setFilters({ tags: [...filters.tags, tag] });
            }}
          >
            <option value="">{tags.length === 0 ? 'No tags yet' : 'Add tag filter…'}</option>
            {tags
              .filter((entry) => !filters.tags.includes(entry.tag))
              .map((entry) => (
                <option key={entry.tag} value={entry.tag}>
                  #{entry.tag} ({entry.count})
                </option>
              ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-field__label">Date saved</span>
          <select
            className="input select input--sm"
            value={filters.date}
            onChange={(event) => setFilters({ date: event.target.value as DatePreset })}
          >
            {(Object.keys(DATE_LABEL) as DatePreset[]).map((key) => (
              <option key={key} value={key}>
                {DATE_LABEL[key]}
              </option>
            ))}
          </select>
        </label>

        {!favoritesLocked ? (
          <button
            type="button"
            className={`filter-chip filter-chip--toggle${filters.favoritesOnly ? ' is-selected' : ''}`}
            aria-pressed={filters.favoritesOnly}
            onClick={() => setFilters({ favoritesOnly: !filters.favoritesOnly })}
          >
            <LuStar className="icon" size={14} aria-hidden="true" />
            Favorites only
          </button>
        ) : null}

        <label className="inline-field inline-field--end">
          <span className="inline-field__label">
            <LuArrowUpDown className="icon" size={13} aria-hidden="true" /> Sort
          </span>
          <select className="input select input--sm" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filters.tags.length > 0 ? (
        <ul className="chips" aria-label="Active tag filters">
          {filters.tags.map((tag) => (
            <li key={tag} className="chip chip--removable">
              #{tag}
              <button
                type="button"
                className="chip__remove"
                aria-label={`Remove tag filter ${tag}`}
                onClick={() => setFilters({ tags: filters.tags.filter((t) => t !== tag) })}
              >
                <LuX className="icon" size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {active ? (
        <button type="button" className="link-button filters__clear" onClick={clearFilters}>
          <LuX className="icon" size={14} aria-hidden="true" /> Clear filters
        </button>
      ) : null}
    </div>
  );
}
