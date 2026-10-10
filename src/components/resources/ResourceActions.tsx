import { LuExternalLink, LuPencil, LuStar, LuTrash2 } from 'react-icons/lu';
import { useAppUiActions } from '../../hooks/useAppUi';
import { useLibraryActions } from '../../hooks/useLibrary';
import { useI18n } from '../../i18n';
import { useToast } from '../../hooks/useToast';
import { describeStorageError } from '../../data/db';
import { toSafeHref } from '../../lib/url';
import type { Resource } from '../../types';
import { CopyButton } from '../ui/CopyButton';

/** Opens a saved URL in a new tab. The href is re-validated at render time. */
export function OpenLink({ resource, variant = 'button' }: { resource: Resource; variant?: 'button' | 'compact' }) {
  const { t } = useI18n();
  const href = toSafeHref(resource.url);
  if (!href) {
    return (
      <button type="button" className={`button ${variant === 'compact' ? 'button--soft button--sm' : 'button--primary'}`} disabled title={t('action.noLink')}>
        {t('common.open')}
      </button>
    );
  }
  return (
    <a
      className={`button ${variant === 'compact' ? 'button--soft button--sm' : 'button--primary'}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <LuExternalLink className="icon" size={15} aria-hidden="true" />
      {t('common.open')}
      <span className="visually-hidden">{t('action.inNewTab', { title: resource.title })}</span>
    </a>
  );
}

/** The copy action that fits the resource: prompt text for prompts, otherwise the URL. */
export function CopyAction({ resource, variant = 'icon' }: { resource: Resource; variant?: 'icon' | 'button' }) {
  const { t } = useI18n();
  if (resource.type === 'prompt' && resource.promptContent) {
    return (
      <CopyButton
        text={resource.promptContent}
        label={t('action.copyPrompt')}
        successMessage={t('action.promptCopied')}
        variant={variant}
      />
    );
  }
  if (!resource.url) return null;
  return <CopyButton text={resource.url} label={t('action.copyUrl')} successMessage={t('action.linkCopied')} variant={variant} />;
}

export function FavoriteButton({ resource }: { resource: Resource }) {
  const { toggleFavorite } = useLibraryActions();
  const { t } = useI18n();
  const toast = useToast();
  return (
    <button
      type="button"
      className={`icon-button favorite${resource.favorite ? ' is-on' : ''}`}
      aria-pressed={resource.favorite}
      aria-label={t(resource.favorite ? 'action.removeFavoriteNamed' : 'action.addFavoriteNamed', { title: resource.title })}
      title={t(resource.favorite ? 'action.removeFavorite' : 'action.addFavorite')}
      onClick={() => toggleFavorite(resource.id).catch((error) => toast.error(describeStorageError(error)))}
    >
      <LuStar className="icon favorite__star" size={17} aria-hidden="true" />
    </button>
  );
}

export function EditButton({ resource }: { resource: Resource }) {
  const { openModal } = useAppUiActions();
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={t('action.editNamed', { title: resource.title })}
      title={t('common.edit')}
      onClick={() => openModal({ kind: 'edit', id: resource.id })}
    >
      <LuPencil className="icon" size={16} aria-hidden="true" />
    </button>
  );
}

export function DeleteButton({ resource }: { resource: Resource }) {
  const { openModal } = useAppUiActions();
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="icon-button icon-button--danger"
      aria-label={t('action.deleteNamed', { title: resource.title })}
      title={t('common.delete')}
      onClick={() => openModal({ kind: 'deleteResource', id: resource.id })}
    >
      <LuTrash2 className="icon" size={16} aria-hidden="true" />
    </button>
  );
}
