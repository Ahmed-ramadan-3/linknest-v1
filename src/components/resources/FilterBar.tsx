import { LuArrowUpDown, LuStar, LuX } from 'react-icons/lu';
import { RESOURCE_TYPE_META } from '../../config/app';
import { useI18n } from '../../i18n';
import { platformLabel, typeLabel } from '../../lib/labels';
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

const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'title-asc', 'title-desc', 'updated', 'favorites'];
const DATE_KEYS: DatePreset[] = ['any', '7d', '30d', 'year'];

interface Props {
  /** True when the route already fixes the category (category pages). */
  categoryLocked: boolean;
  /** True when the route already fixes favorites (favorites page). */
  favoritesLocked: boolean;
}

export function FilterBar({ categoryLocked, favoritesLocked }: Props) {
  const { filters, setFilters, clearFilters, sort, setSort } = useAppUi();
  const { tags, categories } = useLibrary();
  const { t } = useI18n();

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
    <div className="filters glass" role="group" aria-label={t('filters.group')}>
      <div className="filters__types" role="group" aria-label={t('filters.type')}>
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
              {typeLabel(type)}
            </button>
          );
        })}
      </div>

      <div className="filters__controls">
        {!categoryLocked ? (
          <label className="inline-field">
            <span className="inline-field__label">{t('filters.category')}</span>
            <CategorySelect
              id="filter-category"
              compact
              categories={categories}
              value={filters.categoryId}
              emptyLabel={t('filters.anyCategory')}
              onChange={(value) => setFilters({ categoryId: value })}
            />
          </label>
        ) : null}

        <label className="inline-field">
          <span className="inline-field__label">{t('filters.platform')}</span>
          <select
            className="input select input--sm"
            value={filters.platforms[0] ?? ''}
            onChange={(event) =>
              setFilters({ platforms: event.target.value ? [event.target.value as Platform] : [] })
            }
          >
            <option value="">{t('filters.anyPlatform')}</option>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platformLabel(platform)}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-field">
          <span className="inline-field__label">{t('filters.tag')}</span>
          <select
            className="input select input--sm"
            value=""
            disabled={tags.length === 0}
            onChange={(event) => {
              const tag = event.target.value;
              if (tag && !filters.tags.includes(tag)) setFilters({ tags: [...filters.tags, tag] });
            }}
          >
            <option value="">{tags.length === 0 ? t('filters.noTags') : t('filters.addTag')}</option>
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
          <span className="inline-field__label">{t('filters.date')}</span>
          <select
            className="input select input--sm"
            value={filters.date}
            onChange={(event) => setFilters({ date: event.target.value as DatePreset })}
          >
            {DATE_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`date.${key}`)}
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
            {t('filters.favoritesOnly')}
          </button>
        ) : null}

        <label className="inline-field inline-field--end">
          <span className="inline-field__label">
            <LuArrowUpDown className="icon" size={13} aria-hidden="true" /> {t('filters.sort')}
          </span>
          <select className="input select input--sm" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`sort.${key}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filters.tags.length > 0 ? (
        <ul className="chips" aria-label={t('filters.activeTags')}>
          {filters.tags.map((tag) => (
            <li key={tag} className="chip chip--removable">
              #{tag}
              <button
                type="button"
                className="chip__remove"
                aria-label={t('filters.removeTag', { tag })}
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
          <LuX className="icon" size={14} aria-hidden="true" /> {t('filters.clear')}
        </button>
      ) : null}
    </div>
  );
}
