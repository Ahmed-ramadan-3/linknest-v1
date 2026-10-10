import { useEffect, useMemo, useState } from 'react';
import { LuChevronRight } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';
import { useI18n } from '../../i18n';
import { useLibrary } from '../../hooks/useLibrary';
import { buildTree, pathTo, type CategoryNode } from '../../lib/categories/tree';
import { Icon } from '../ui/icons';

/** Collapsible hierarchy with guide lines and live resource counts. */
export function CategoryTree() {
  const { categories, categoryById, counts } = useLibrary();
  const { route, navigate } = useAppUi();
  const { t } = useI18n();
  const tree = useMemo(() => buildTree(categories), [categories]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const activeId = route.name === 'category' ? route.id : null;

  // Make sure the active category is visible by expanding its ancestors.
  useEffect(() => {
    if (!activeId) return;
    const ancestors = pathTo(categoryById, activeId).slice(0, -1).map((c) => c.id);
    if (ancestors.some((id) => collapsed.has(id))) {
      setCollapsed((current) => {
        const next = new Set(current);
        ancestors.forEach((id) => next.delete(id));
        return next;
      });
    }
    // Runs only when the active category changes.
  }, [activeId]);

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (node: CategoryNode) => {
    const { category, children } = node;
    const hasChildren = children.length > 0;
    const open = !collapsed.has(category.id);
    const active = activeId === category.id;
    const total = counts.total.get(category.id) ?? 0;
    return (
      <li key={category.id} className="tree__item">
        <div className={`tree__row${active ? ' is-active' : ''}`}>
          {hasChildren ? (
            <button
              type="button"
              className="tree__toggle"
              aria-label={t(open ? 'tree.collapse' : 'tree.expand', { name: category.name })}
              aria-expanded={open}
              onClick={() => toggle(category.id)}
            >
              <LuChevronRight className={`icon tree__chevron${open ? ' is-open' : ''}`} size={16} aria-hidden="true" />
            </button>
          ) : (
            <span className="tree__toggle tree__toggle--leaf" aria-hidden="true" />
          )}
          <button
            type="button"
            className="tree__link"
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate({ name: 'category', id: category.id })}
          >
            <span className={`tree__icon${category.accent ? ` accent-${category.accent}` : ''}`}>
              <Icon name={category.icon} size={16} />
            </span>
            <span className="tree__name">{category.name}</span>
            <span className="tree__count">{total}</span>
          </button>
        </div>
        {hasChildren ? (
          <div className={`tree__branch${open ? ' is-open' : ''}`}>
            <ul className="tree__children">
              {children.map(renderNode)}
            </ul>
          </div>
        ) : null}
      </li>
    );
  };

  if (tree.length === 0) {
    return <p className="sidebar__note">{t('tree.empty')}</p>;
  }

  return (
    <ul className="tree" aria-label={t('tree.label')}>
      {tree.map(renderNode)}
    </ul>
  );
}
