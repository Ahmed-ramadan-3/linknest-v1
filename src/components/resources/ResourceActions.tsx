import { LuExternalLink, LuPencil, LuStar, LuTrash2 } from 'react-icons/lu';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { describeStorageError } from '../../data/db';
import { toSafeHref } from '../../lib/url';
import type { Resource } from '../../types';
import { CopyButton } from '../ui/CopyButton';

/** Opens a saved URL in a new tab. The href is re-validated at render time. */
export function OpenLink({ resource, variant = 'button' }: { resource: Resource; variant?: 'button' | 'compact' }) {
  const href = toSafeHref(resource.url);
  if (!href) {
    return (
      <button type="button" className={`button ${variant === 'compact' ? 'button--soft button--sm' : 'button--primary'}`} disabled title="This resource has no link">
        Open
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
      Open
      <span className="visually-hidden"> {resource.title} in a new tab</span>
    </a>
  );
}

/** The copy action that fits the resource: prompt text for prompts, otherwise the URL. */
export function CopyAction({ resource, variant = 'icon' }: { resource: Resource; variant?: 'icon' | 'button' }) {
  if (resource.type === 'prompt' && resource.promptContent) {
    return (
      <CopyButton
        text={resource.promptContent}
        label="Copy Prompt"
        successMessage="Prompt copied"
        variant={variant}
      />
    );
  }
  if (!resource.url) return null;
  return <CopyButton text={resource.url} label="Copy URL" successMessage="Link copied" variant={variant} />;
}

export function FavoriteButton({ resource }: { resource: Resource }) {
  const { toggleFavorite } = useLibrary();
  const toast = useToast();
  return (
    <button
      type="button"
      className={`icon-button favorite${resource.favorite ? ' is-on' : ''}`}
      aria-pressed={resource.favorite}
      aria-label={resource.favorite ? `Remove ${resource.title} from favorites` : `Add ${resource.title} to favorites`}
      title={resource.favorite ? 'Remove from favorites' : 'Add to favorites'}
      onClick={() => toggleFavorite(resource.id).catch((error) => toast.error(describeStorageError(error)))}
    >
      <LuStar className="icon favorite__star" size={17} aria-hidden="true" />
    </button>
  );
}

export function EditButton({ resource }: { resource: Resource }) {
  const { openModal } = useAppUi();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={`Edit ${resource.title}`}
      title="Edit"
      onClick={() => openModal({ kind: 'edit', id: resource.id })}
    >
      <LuPencil className="icon" size={16} aria-hidden="true" />
    </button>
  );
}

export function DeleteButton({ resource }: { resource: Resource }) {
  const { openModal } = useAppUi();
  return (
    <button
      type="button"
      className="icon-button icon-button--danger"
      aria-label={`Delete ${resource.title}`}
      title="Delete"
      onClick={() => openModal({ kind: 'deleteResource', id: resource.id })}
    >
      <LuTrash2 className="icon" size={16} aria-hidden="true" />
    </button>
  );
}
