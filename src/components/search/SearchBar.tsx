import { useEffect, useState } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import { SEARCH_DEBOUNCE_MS } from '../../config/app';
import { useAppUi } from '../../hooks/useAppUi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { REVEAL_SEARCH_EVENT } from '../../hooks/useHideOnScroll';
import { useI18n } from '../../i18n';

/** Global search. Typing anywhere moves to "All Resources" so results are never hidden. */
export function SearchBar() {
  const { filters, setFilters, route, navigate, searchInputRef } = useAppUi();
  const { t } = useI18n();
  const [text, setText] = useState(filters.query);
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);

  // Keep the box in sync when something else clears the query (e.g. sidebar navigation).
  useEffect(() => {
    setText(filters.query);
  }, [filters.query]);

  useEffect(() => {
    if (debounced === filters.query) return;
    setFilters({ query: debounced });
    if (debounced.trim() && route.name === 'home') navigate({ name: 'all' }, { query: debounced });
    // Only the debounced text should trigger this; filters.query and route are read as current values.
  }, [debounced]);

  // "/" or Ctrl/Cmd+K focuses search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable === true;
      const shortcut = (event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing);
      if (shortcut && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        // A hidden search bar cannot take focus, so bring it back first.
        window.dispatchEvent(new Event(REVEAL_SEARCH_EVENT));
        // The bar becomes focusable once React has shown it again, so retry for a few frames.
        let attempts = 0;
        const focusWhenReady = () => {
          const input = searchInputRef.current;
          input?.focus();
          if (input && document.activeElement === input) {
            input.select();
            return;
          }
          attempts += 1;
          if (attempts < 20) window.requestAnimationFrame(focusWhenReady);
        };
        window.requestAnimationFrame(focusWhenReady);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchInputRef]);

  return (
    <div className="searchbar" role="search">
      <LuSearch className="icon searchbar__icon" size={18} aria-hidden="true" />
      <input
        ref={searchInputRef}
        type="search"
        className="searchbar__input"
        placeholder={t('search.placeholder')}
        aria-label={t('search.label')}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && text) {
            event.preventDefault();
            setText('');
            setFilters({ query: '' });
          }
        }}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      {text ? (
        <button
          type="button"
          className="icon-button searchbar__clear"
          aria-label={t('search.clear')}
          onClick={() => {
            setText('');
            setFilters({ query: '' });
            searchInputRef.current?.focus();
          }}
        >
          <LuX className="icon" size={16} aria-hidden="true" />
        </button>
      ) : (
        <kbd className="searchbar__hint" aria-hidden="true">/</kbd>
      )}
    </div>
  );
}
