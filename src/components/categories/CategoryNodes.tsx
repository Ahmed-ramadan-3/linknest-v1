import { LuFolderPlus } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useI18n } from '../../i18n';
import type { CategoryNode } from '../../lib/categories/tree';
import { Icon } from '../ui/icons';

function NodeButton({ node, size }: { node: CategoryNode; size: 'root' | 'child' }) {
  const { counts } = useLibrary();
  const { navigate } = useAppUi();
  const { plural } = useI18n();
  const { category } = node;
  const total = counts.total.get(category.id) ?? 0;
  return (
    <button
      type="button"
      className={`node node--${size}${category.accent ? ` accent-${category.accent}` : ''}`}
      onClick={() => navigate({ name: 'category', id: category.id })}
    >
      <span className="node__icon">
        <Icon name={category.icon} size={size === 'root' ? 20 : 17} />
      </span>
      <span className="node__text">
        <span className="node__name">{category.name}</span>
        <span className="node__meta">{plural('count.resource', total)}</span>
      </span>
    </button>
  );
}

/**
 * Mind-map style branch: a parent node connected to its child nodes by guide lines.
 * Grandchildren appear as small chips so the whole subtree stays understandable.
 */
export function BranchMap({
  root,
  onAddChild,
  emptyHint,
}: {
  root: CategoryNode;
  onAddChild?: () => void;
  emptyHint?: string;
}) {
  const { navigate } = useAppUi();
  const { t } = useI18n();
  return (
    <section className="branch glass" aria-label={t('map.structure', { name: root.category.name })}>
      <div className="branch__root">
        <NodeButton node={root} size="root" />
      </div>
      {root.children.length > 0 || onAddChild ? (
        <ul className="branch__children">
          {root.children.map((child) => (
            <li key={child.category.id} className="branch__child">
              <NodeButton node={child} size="child" />
              {child.children.length > 0 ? (
                <ul className="branch__grand" aria-label={t('map.subcategories', { name: child.category.name })}>
                  {child.children.map((grand) => (
                    <li key={grand.category.id}>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => navigate({ name: 'category', id: grand.category.id })}
                      >
                        {grand.category.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
          {onAddChild ? (
            <li className="branch__child">
              <button type="button" className="node node--child node--add" onClick={onAddChild}>
                <span className="node__icon">
                  <LuFolderPlus className="icon" size={17} aria-hidden="true" />
                </span>
                <span className="node__text">
                  <span className="node__name">{t('map.addSub')}</span>
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : emptyHint ? (
        <p className="branch__hint">{emptyHint}</p>
      ) : null}
    </section>
  );
}
