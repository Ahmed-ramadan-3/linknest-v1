import { LuChevronRight } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';
import type { Category } from '../../types';

/** Home / Programming / Frontend. The last item is the current page. */
export function Breadcrumbs({ path, label }: { path: Category[]; label?: string }) {
  const { navigate } = useAppUi();
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <button type="button" className="link-button" onClick={() => navigate({ name: 'home' })}>
            Home
          </button>
        </li>
        {label ? (
          <li aria-current="page">
            <LuChevronRight className="icon breadcrumbs__sep" size={14} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ) : null}
        {path.map((category, index) => {
          const last = index === path.length - 1;
          return (
            <li key={category.id} aria-current={last ? 'page' : undefined}>
              <LuChevronRight className="icon breadcrumbs__sep" size={14} aria-hidden="true" />
              {last ? (
                <span>{category.name}</span>
              ) : (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate({ name: 'category', id: category.id })}
                >
                  {category.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
