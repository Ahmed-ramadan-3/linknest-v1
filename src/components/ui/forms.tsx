import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { LuX } from 'react-icons/lu';
import { ICON_KEYS, type IconKey } from '../../config/icons';
import { buildTree, flattenTree } from '../../lib/categories/tree';
import { parseTagInput } from '../../lib/validation/sanitize';
import { ACCENT_KEYS, type AccentKey, type Category } from '../../types';
import { Icon } from './icons';

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="field__hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Native select with the hierarchy shown through indentation. */
export function CategorySelect({
  id,
  categories,
  value,
  onChange,
  excludeIds,
  emptyLabel,
  invalid,
  describedBy,
  compact,
}: {
  id: string;
  categories: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Categories (and their subtrees are NOT implied) that cannot be chosen. */
  excludeIds?: Set<string>;
  /** Label for the "no category" option; omit to make a category mandatory. */
  emptyLabel?: string;
  invalid?: boolean;
  describedBy?: string;
  /** Smaller control for toolbars. */
  compact?: boolean;
}) {
  const nodes = useMemo(() => flattenTree(buildTree(categories)), [categories]);
  return (
    <select
      id={id}
      className={`input select${compact ? ' input--sm' : ''}`}
      value={value ?? ''}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value || null)}
    >
      <option value="">{emptyLabel ?? 'Choose a category…'}</option>
      {nodes
        .filter((node) => !excludeIds?.has(node.category.id))
        .map((node) => (
          <option key={node.category.id} value={node.category.id}>
            {`${'   '.repeat(node.depth)}${node.depth > 0 ? '└ ' : ''}${node.category.name}`}
          </option>
        ))}
    </select>
  );
}

export function TagInput({
  id,
  tags,
  onChange,
  suggestions,
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [text, setText] = useState('');
  const listId = useId();

  const commit = (raw: string) => {
    const added = parseTagInput(raw);
    if (added.length > 0) onChange(parseTagInput([...tags, ...added].join(',')));
    setText('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(text);
    } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="tag-input">
      {tags.length > 0 ? (
        <ul className="chips">
          {tags.map((tag) => (
            <li key={tag} className="chip chip--removable">
              #{tag}
              <button
                type="button"
                className="chip__remove"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              >
                <LuX className="icon" size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        id={id}
        className="input"
        value={text}
        list={listId}
        placeholder="Add a tag and press Enter"
        autoComplete="off"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(text)}
      />
      <datalist id={listId}>
        {suggestions
          .filter((tag) => !tags.some((t) => t.toLowerCase() === tag.toLowerCase()))
          .slice(0, 30)
          .map((tag) => (
            <option key={tag} value={tag} />
          ))}
      </datalist>
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  allowAuto,
  label,
}: {
  value: IconKey | null;
  onChange: (value: IconKey | null) => void;
  /** Shows an "Auto" choice that clears the custom icon. */
  allowAuto?: boolean;
  label: string;
}) {
  return (
    <div className="icon-picker" role="radiogroup" aria-label={label}>
      {allowAuto ? (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          className={`icon-picker__item icon-picker__item--auto${value === null ? ' is-selected' : ''}`}
          onClick={() => onChange(null)}
        >
          Auto
        </button>
      ) : null}
      {ICON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={key.replace(/-/g, ' ')}
          title={key.replace(/-/g, ' ')}
          className={`icon-picker__item${value === key ? ' is-selected' : ''}`}
          onClick={() => onChange(key)}
        >
          <Icon name={key} size={18} />
        </button>
      ))}
    </div>
  );
}

export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentKey | null;
  onChange: (value: AccentKey | null) => void;
}) {
  return (
    <div className="accent-picker" role="radiogroup" aria-label="Accent colour">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        className={`accent-picker__item accent-picker__item--none${value === null ? ' is-selected' : ''}`}
        onClick={() => onChange(null)}
      >
        None
      </button>
      {ACCENT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={key}
          title={key}
          className={`accent-picker__item swatch-${key}${value === key ? ' is-selected' : ''}`}
          onClick={() => onChange(key)}
        />
      ))}
    </div>
  );
}
