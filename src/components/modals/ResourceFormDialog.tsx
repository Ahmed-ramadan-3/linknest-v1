import { useMemo, useRef, useState, type FormEvent } from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import { PLATFORM_META, RESOURCE_TYPE_META } from '../../config/app';
import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { suggestCategoryId } from '../../lib/categories/suggest';
import { fromLocalInputValue, toLocalInputValue } from '../../lib/format';
import { detectPlatform } from '../../lib/platform';
import { checkUrl, normalizeUrlKey } from '../../lib/url';
import { validateDraft, type DraftErrors, type ResourceDraft } from '../../lib/validation/resource';
import { PLATFORMS, RESOURCE_TYPES, type Platform, type Resource, type ResourceType } from '../../types';
import { isIconKey } from '../../config/icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { CategorySelect, Field, IconPicker, TagInput } from '../ui/forms';
import { Icon } from '../ui/icons';
import { Thumbnail } from '../ui/Thumbnail';
import { CategoryDialog } from './CategoryDialog';
import { DuplicateDialog } from './DuplicateDialog';

interface Props {
  mode: 'create' | 'edit';
  /** Present in edit mode. */
  resource?: Resource;
  initialType?: ResourceType;
  initialCategoryId?: string | null;
}

function draftFromResource(resource: Resource): ResourceDraft {
  return {
    type: resource.type,
    title: resource.title,
    url: resource.url,
    description: resource.description,
    notes: resource.notes,
    promptContent: resource.promptContent,
    project: resource.project,
    categoryId: resource.categoryId,
    platform: resource.platform,
    tags: resource.tags,
    thumbnailUrl: resource.thumbnailUrl ?? '',
    icon: resource.icon,
    favorite: resource.favorite,
    createdAt: resource.createdAt,
  };
}

function emptyDraft(type: ResourceType, categoryId: string | null): ResourceDraft {
  return {
    type,
    title: '',
    url: '',
    description: '',
    notes: '',
    promptContent: '',
    project: '',
    categoryId,
    platform: null,
    tags: [],
    thumbnailUrl: '',
    icon: null,
    favorite: false,
    createdAt: new Date().toISOString(),
  };
}

const FIELD_ORDER: (keyof DraftErrors)[] = ['title', 'url', 'promptContent', 'categoryId', 'thumbnailUrl', 'createdAt'];
const FIELD_IDS: Record<keyof DraftErrors, string> = {
  title: 'rf-title',
  url: 'rf-url',
  promptContent: 'rf-prompt',
  categoryId: 'rf-category',
  thumbnailUrl: 'rf-thumb',
  createdAt: 'rf-date',
};

/** Two-step create flow (pick a type, then fill the form) and the edit form. */
export function ResourceFormDialog({ mode, resource, initialType, initialCategoryId }: Props) {
  const { categories, resources, tags, addResource, updateResource } = useLibrary();
  const { closeModal, openModal } = useAppUi();
  const toast = useToast();

  const [step, setStep] = useState<'type' | 'form'>(mode === 'edit' || initialType ? 'form' : 'type');
  const [draft, setDraft] = useState<ResourceDraft>(() => {
    if (resource) return draftFromResource(resource);
    const type = initialType ?? 'link';
    return emptyDraft(type, initialCategoryId ?? suggestCategoryId(categories, type, null));
  });
  const [errors, setErrors] = useState<DraftErrors>({});
  const [busy, setBusy] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<Resource | null>(null);
  const [dirty, setDirty] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const platformTouched = useRef(mode === 'edit');
  const categoryTouched = useRef(mode === 'edit' || initialCategoryId != null);
  const formRef = useRef<HTMLFormElement>(null);

  const meta = RESOURCE_TYPE_META[draft.type];
  const tagSuggestions = useMemo(() => tags.map((t) => t.tag), [tags]);
  const projects = useMemo(
    () => [...new Set(resources.map((r) => r.project).filter(Boolean))].sort(),
    [resources],
  );

  const patch = (changes: Partial<ResourceDraft>) => {
    setDirty(true);
    setDraft((current) => ({ ...current, ...changes }));
  };

  const chooseType = (type: ResourceType) => {
    setDraft((current) => ({
      ...current,
      type,
      categoryId: categoryTouched.current ? current.categoryId : suggestCategoryId(categories, type, current.platform),
    }));
    setStep('form');
  };

  const changeUrl = (url: string) => {
    const checked = checkUrl(url);
    const detected = checked.ok ? detectPlatform(checked.url) : null;
    setDirty(true);
    setDraft((current) => {
      const platform = platformTouched.current ? current.platform : detected;
      const categoryId = categoryTouched.current
        ? current.categoryId
        : (suggestCategoryId(categories, current.type, platform) ?? current.categoryId);
      return { ...current, url, platform, categoryId };
    });
  };

  const previewResource = useMemo(() => {
    const url = checkUrl(draft.url);
    const image = checkUrl(draft.thumbnailUrl);
    return {
      id: 'preview',
      title: draft.title || 'Untitled',
      type: draft.type,
      platform: draft.platform,
      icon: isIconKey(draft.icon) ? draft.icon : null,
      url: url.ok ? url.url : '',
      thumbnailUrl: image.ok ? image.url : null,
    };
  }, [draft.title, draft.type, draft.platform, draft.icon, draft.url, draft.thumbnailUrl]);

  const save = async (allowDuplicate: boolean) => {
    const result = validateDraft(draft);
    setErrors(result.errors);
    if (!result.value) {
      const first = FIELD_ORDER.find((key) => result.errors[key]);
      if (first) {
        const element = formRef.current?.querySelector<HTMLElement>(`#${FIELD_IDS[first]}`);
        element?.focus();
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }

    if (!allowDuplicate && result.value.url) {
      const key = normalizeUrlKey(result.value.url);
      const existing = resources.find((item) => item.id !== resource?.id && item.url && normalizeUrlKey(item.url) === key);
      if (existing) {
        setDuplicateOf(existing);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'edit' && resource) {
        await updateResource(resource.id, { ...result.value, favorite: draft.favorite });
        toast.success('Changes saved');
      } else {
        await addResource(result.value);
        toast.success('Resource saved');
      }
      closeModal();
    } catch (error) {
      toast.error(describeStorageError(error));
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save(false);
  };

  if (step === 'type') {
    return (
      <Dialog title="What do you want to save?" size="md" onClose={closeModal}>
        <div className="type-grid">
          {RESOURCE_TYPES.map((type) => {
            const typeMeta = RESOURCE_TYPE_META[type];
            return (
              <button key={type} type="button" className="type-tile glass" onClick={() => chooseType(type)}>
                <span className="type-tile__icon">
                  <Icon name={typeMeta.icon} size={22} />
                </span>
                <span className="type-tile__label">{typeMeta.label}</span>
                <span className="type-tile__desc">{typeMeta.description}</span>
              </button>
            );
          })}
        </div>
      </Dialog>
    );
  }

  const urlLabel = meta.requiresUrl ? 'URL' : 'Source link (optional)';

  return (
    <>
      <Dialog
        title={mode === 'edit' ? 'Edit resource' : `Save ${meta.label.toLowerCase()}`}
        size="lg"
        onClose={closeModal}
        dismissible={!busy}
        onBeforeDismiss={() => {
          if (!dirty) return true;
          setAskDiscard(true);
          return false;
        }}
        footer={
          <>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => (dirty ? setAskDiscard(true) : closeModal())}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" form="resource-form" className="button button--primary" disabled={busy}>
              {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save'}
            </button>
          </>
        }
      >
        <form id="resource-form" ref={formRef} className="form" onSubmit={onSubmit} noValidate>
          <div className="form__lead">
            <div className="form__preview">
              <Thumbnail resource={previewResource} />
            </div>
            <div className="form__lead-text">
              <span className="badge">
                <Icon name={meta.icon} size={13} />
                {meta.label}
              </span>
              {mode === 'create' ? (
                <button type="button" className="link-button" onClick={() => setStep('type')}>
                  <LuArrowLeft className="icon" size={14} aria-hidden="true" /> Change type
                </button>
              ) : (
                <label className="inline-field">
                  <span className="visually-hidden">Type</span>
                  <select
                    className="input select input--sm"
                    value={draft.type}
                    onChange={(event) => patch({ type: event.target.value as ResourceType })}
                  >
                    {RESOURCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {RESOURCE_TYPE_META[type].label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          <Field label="Title" htmlFor="rf-title" required error={errors.title} hint="A name you will recognise later, e.g. “React Authentication Tutorial”.">
            <input
              id="rf-title"
              className="input"
              value={draft.title}
              maxLength={200}
              autoFocus
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'rf-title-error' : 'rf-title-hint'}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>

          <Field label={urlLabel} htmlFor="rf-url" required={meta.requiresUrl} error={errors.url} hint="Only http:// and https:// links are saved.">
            <input
              id="rf-url"
              className="input"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://"
              value={draft.url}
              aria-invalid={errors.url ? true : undefined}
              aria-describedby={errors.url ? 'rf-url-error' : 'rf-url-hint'}
              onChange={(event) => changeUrl(event.target.value)}
            />
          </Field>

          {draft.type === 'prompt' ? (
            <Field label="Prompt" htmlFor="rf-prompt" required error={errors.promptContent} hint="Line breaks and spacing are kept exactly as you type them.">
              <textarea
                id="rf-prompt"
                className="input textarea textarea--mono"
                rows={9}
                value={draft.promptContent}
                maxLength={50000}
                spellCheck={false}
                aria-invalid={errors.promptContent ? true : undefined}
                aria-describedby={errors.promptContent ? 'rf-prompt-error' : 'rf-prompt-hint'}
                onChange={(event) => patch({ promptContent: event.target.value })}
              />
            </Field>
          ) : null}

          <div className="form__row">
            <Field label="Category" htmlFor="rf-category" required error={errors.categoryId}>
              <CategorySelect
                id="rf-category"
                categories={categories}
                value={draft.categoryId}
                invalid={Boolean(errors.categoryId)}
                describedBy={errors.categoryId ? 'rf-category-error' : undefined}
                onChange={(value) => {
                  categoryTouched.current = true;
                  patch({ categoryId: value });
                }}
              />
              <button
                type="button"
                className="link-button field__action"
                onClick={() => setCreatingCategory(true)}
              >
                + New category
              </button>
            </Field>

            {meta.showsPlatform || draft.platform ? (
              <Field label="Platform" htmlFor="rf-platform" hint="Detected from the link; change it if needed.">
                <select
                  id="rf-platform"
                  className="input select"
                  value={draft.platform ?? ''}
                  onChange={(event) => {
                    platformTouched.current = true;
                    patch({ platform: (event.target.value || null) as Platform | null });
                  }}
                >
                  <option value="">None</option>
                  {PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {PLATFORM_META[platform].label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>

          <Field label="Description" htmlFor="rf-description" hint="Optional. What is this about?">
            <textarea
              id="rf-description"
              className="input textarea"
              rows={2}
              maxLength={1000}
              value={draft.description}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>

          <Field label="Tags" htmlFor="rf-tags">
            <TagInput id="rf-tags" tags={draft.tags} suggestions={tagSuggestions} onChange={(next) => patch({ tags: next })} />
          </Field>

          <Field label="Notes" htmlFor="rf-notes" hint="Optional. Why did you save this?">
            <textarea
              id="rf-notes"
              className="input textarea"
              rows={3}
              maxLength={5000}
              value={draft.notes}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </Field>

          <details className="more" open={Boolean(errors.thumbnailUrl || errors.createdAt)}>
            <summary>More details</summary>
            <div className="more__body">
              <Field
                label="Thumbnail image URL"
                htmlFor="rf-thumb"
                error={errors.thumbnailUrl}
                hint="Optional. YouTube thumbnails are found automatically; other sites need an image link."
              >
                <input
                  id="rf-thumb"
                  className="input"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={draft.thumbnailUrl}
                  aria-invalid={errors.thumbnailUrl ? true : undefined}
                  onChange={(event) => patch({ thumbnailUrl: event.target.value })}
                />
              </Field>

              <div className="form__row">
                <Field label="Project" htmlFor="rf-project" hint="Optional label to group related items.">
                  <input
                    id="rf-project"
                    className="input"
                    list="rf-projects"
                    maxLength={80}
                    value={draft.project}
                    onChange={(event) => patch({ project: event.target.value })}
                  />
                  <datalist id="rf-projects">
                    {projects.map((project) => (
                      <option key={project} value={project} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Date saved" htmlFor="rf-date" error={errors.createdAt}>
                  <input
                    id="rf-date"
                    className="input"
                    type="datetime-local"
                    value={toLocalInputValue(draft.createdAt)}
                    aria-invalid={errors.createdAt ? true : undefined}
                    onChange={(event) => patch({ createdAt: fromLocalInputValue(event.target.value) })}
                  />
                </Field>
              </div>

              <div className="field">
                <span className="field__label" id="rf-icon-label">Custom icon</span>
                <IconPicker
                  label="Custom icon"
                  allowAuto
                  value={isIconKey(draft.icon) ? draft.icon : null}
                  onChange={(value) => patch({ icon: value })}
                />
              </div>
            </div>
          </details>

          <label className="check">
            <input type="checkbox" checked={draft.favorite} onChange={(event) => patch({ favorite: event.target.checked })} />
            <span>Mark as favorite</span>
          </label>
        </form>
      </Dialog>

      {askDiscard ? (
        <ConfirmDialog
          title="Discard this draft?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          danger
          onCancel={() => setAskDiscard(false)}
          onConfirm={closeModal}
        >
          <p>Your changes have not been saved.</p>
        </ConfirmDialog>
      ) : null}

      {creatingCategory ? (
        <CategoryDialog
          mode="create"
          parentId={draft.categoryId}
          embedded={{
            onClose: () => setCreatingCategory(false),
            onSaved: (categoryId) => {
              categoryTouched.current = true;
              patch({ categoryId });
              setCreatingCategory(false);
            },
          }}
        />
      ) : null}

      {duplicateOf ? (
        <DuplicateDialog
          existing={duplicateOf}
          confirmLabel={mode === 'edit' ? 'Save anyway' : 'Add anyway'}
          onOpenExisting={() => openModal({ kind: 'detail', id: duplicateOf.id })}
          onAddAnyway={() => {
            setDuplicateOf(null);
            void save(true);
          }}
          onCancel={() => setDuplicateOf(null)}
        />
      ) : null}
    </>
  );
}
