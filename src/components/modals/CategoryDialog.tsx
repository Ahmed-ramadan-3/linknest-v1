import { useMemo, useState, type FormEvent } from 'react';
import { LIMITS } from '../../config/app';
import type { IconKey } from '../../config/icons';
import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { categoryDisplayName, useI18n } from '../../i18n';
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
  const { categories, rawCategories, saveCategory } = useLibrary();
  const { t } = useI18n();
  const { closeModal: closeGlobal, navigate } = useAppUi();
  const closeModal = props.embedded ? props.embedded.onClose : closeGlobal;
  const toast = useToast();

  // The stored record is edited; the field shows the name as it appears in the current language.
  const existing = props.mode === 'edit' ? rawCategories.find((c) => c.id === props.id) : undefined;
  const shownName = existing ? categoryDisplayName(existing) : '';
  const [name, setName] = useState(shownName);
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
      <Dialog title={t('del.catGone')} size="sm" onClose={closeModal}>
        <p className="prose">{t('cat.notFoundBody')}</p>
      </Dialog>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = cleanLine(name, LIMITS.categoryName);
    if (!clean) {
      setError(t('err.catName'));
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
      // Leaving a translated starter name untouched keeps it translating if the language changes.
      const storedName = existing && clean === shownName ? existing.name : clean;
      const saved = await saveCategory({ id: existing?.id, name: storedName, parentId, icon, accent });
      toast.success(existing ? t('cat.updated') : t('cat.created'));
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
      title={existing ? t('cat.edit') : t('cat.new')}
      size="md"
      onClose={closeModal}
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={closeModal} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="category-form" className="button button--primary" disabled={busy}>
            {existing ? t('common.saveChanges') : t('cat.create')}
          </button>
        </>
      }
    >
      <form id="category-form" className="form" onSubmit={submit} noValidate>
        <Field label={t('cat.name')} htmlFor="cat-name" required error={error}>
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
        <Field label={t('cat.parent')} htmlFor="cat-parent" error={parentError} hint={t('cat.parentHint')}>
          <CategorySelect
            id="cat-parent"
            categories={categories}
            value={parentId}
            excludeIds={blocked}
            emptyLabel={t('cat.topLevel')}
            invalid={Boolean(parentError)}
            describedBy={parentError ? 'cat-parent-error' : 'cat-parent-hint'}
            onChange={(value) => {
              setParentId(value);
              setParentError('');
            }}
          />
        </Field>
        <div className="field">
          <span className="field__label">{t('cat.icon')}</span>
          <IconPicker label={t('cat.iconLabel')} value={icon} onChange={(value) => setIcon(value ?? 'folder')} />
        </div>
        <div className="field">
          <span className="field__label">{t('cat.accent')}</span>
          <AccentPicker value={accent} onChange={setAccent} />
        </div>
      </form>
    </Dialog>
  );
}
