import { useMemo, useState, type FormEvent } from 'react';
import { LIMITS } from '../../config/app';
import type { IconKey } from '../../config/icons';
import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { canReparent, descendantIds } from '../../lib/categories/tree';
import { cleanLine } from '../../lib/validation/sanitize';
import type { AccentKey } from '../../types';
import { Dialog } from '../ui/Dialog';
import { AccentPicker, CategorySelect, Field, IconPicker } from '../ui/forms';

type Props = ({ mode: 'create'; parentId: string | null } | { mode: 'edit'; id: string }) & {
  /** When shown on top of another dialog: close/finish without touching the global modal state. */
  embedded?: { onClose: () => void; onSaved: (categoryId: string) => void };
};

/** Create, rename, re-icon or move a category. Moves that would create a cycle are rejected. */
export function CategoryDialog(props: Props) {
  const { categories, saveCategory } = useLibrary();
  const { closeModal: closeGlobal, navigate } = useAppUi();
  const closeModal = props.embedded ? props.embedded.onClose : closeGlobal;
  const toast = useToast();

  const existing = props.mode === 'edit' ? categories.find((c) => c.id === props.id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [parentId, setParentId] = useState<string | null>(
    existing ? existing.parentId : props.mode === 'create' ? props.parentId : null,
  );
  const [icon, setIcon] = useState<IconKey>(existing?.icon ?? 'folder');
  const [accent, setAccent] = useState<AccentKey | null>(existing?.accent ?? null);
  const [error, setError] = useState('');
  const [parentError, setParentError] = useState('');
  const [busy, setBusy] = useState(false);

  // A category cannot be placed under itself or any of its own descendants.
  const blocked = useMemo(() => (existing ? descendantIds(categories, existing.id) : new Set<string>()), [categories, existing]);

  if (props.mode === 'edit' && !existing) {
    return (
      <Dialog title="Category not found" size="sm" onClose={closeModal}>
        <p className="prose">This category no longer exists.</p>
      </Dialog>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = cleanLine(name, LIMITS.categoryName);
    if (!clean) {
      setError('Give the category a name.');
      return;
    }
    if (existing) {
      const check = canReparent(categories, existing.id, parentId);
      if (!check.ok) {
        setParentError(check.reason);
        return;
      }
    }
    setBusy(true);
    try {
      const saved = await saveCategory({ id: existing?.id, name: clean, parentId, icon, accent });
      toast.success(existing ? 'Category updated' : 'Category created');
      if (props.embedded) {
        props.embedded.onSaved(saved.id);
      } else {
        closeModal();
        if (!existing) navigate({ name: 'category', id: saved.id });
      }
    } catch (failure) {
      toast.error(describeStorageError(failure));
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={existing ? 'Edit category' : 'New category'}
      size="md"
      onClose={closeModal}
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={closeModal} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="category-form" className="button button--primary" disabled={busy}>
            {existing ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <form id="category-form" className="form" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="cat-name" required error={error}>
          <input
            id="cat-name"
            className="input"
            value={name}
            maxLength={LIMITS.categoryName}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'cat-name-error' : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
          />
        </Field>
        <Field label="Parent category" htmlFor="cat-parent" error={parentError} hint="Leave empty for a top-level category.">
          <CategorySelect
            id="cat-parent"
            categories={categories}
            value={parentId}
            excludeIds={blocked}
            emptyLabel="None (top level)"
            invalid={Boolean(parentError)}
            describedBy={parentError ? 'cat-parent-error' : 'cat-parent-hint'}
            onChange={(value) => {
              setParentId(value);
              setParentError('');
            }}
          />
        </Field>
        <div className="field">
          <span className="field__label">Icon</span>
          <IconPicker label="Category icon" value={icon} onChange={(value) => setIcon(value ?? 'folder')} />
        </div>
        <div className="field">
          <span className="field__label">Accent</span>
          <AccentPicker value={accent} onChange={setAccent} />
        </div>
      </form>
    </Dialog>
  );
}
