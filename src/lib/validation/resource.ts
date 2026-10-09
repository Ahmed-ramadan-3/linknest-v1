import { LIMITS, RESOURCE_TYPE_META } from '../../config/app';
import type { Platform, Resource, ResourceType } from '../../types';
import { PLATFORMS } from '../../types';
import { detectPlatform } from '../platform';
import { checkUrl } from '../url';
import {
  cleanIcon,
  cleanIsoDate,
  cleanLine,
  cleanMultiline,
  cleanTags,
} from './sanitize';

/** Raw values as they come out of the form (everything is a string or simple value). */
export interface ResourceDraft {
  type: ResourceType;
  title: string;
  url: string;
  description: string;
  notes: string;
  promptContent: string;
  project: string;
  categoryId: string | null;
  platform: Platform | null;
  tags: string[];
  thumbnailUrl: string;
  icon: string | null;
  favorite: boolean;
  /** ISO string; the form converts from datetime-local. */
  createdAt: string;
}

export type DraftErrors = Partial<Record<'title' | 'url' | 'categoryId' | 'thumbnailUrl' | 'promptContent' | 'createdAt', string>>;

export interface DraftResult {
  errors: DraftErrors;
  /** Present only when errors is empty. */
  value: Omit<Resource, 'id' | 'updatedAt'> | null;
}

export function validateDraft(draft: ResourceDraft): DraftResult {
  const errors: DraftErrors = {};
  const meta = RESOURCE_TYPE_META[draft.type];

  const title = cleanLine(draft.title, LIMITS.title);
  if (!title) errors.title = 'Give this resource a title.';

  let url = '';
  const rawUrl = draft.url.trim();
  if (rawUrl || meta.requiresUrl) {
    const checked = checkUrl(rawUrl);
    if (checked.ok) url = checked.url;
    else errors.url = checked.reason;
  }

  const promptContent = cleanMultiline(draft.promptContent, LIMITS.promptContent);
  if (draft.type === 'prompt' && !promptContent.trim()) {
    errors.promptContent = 'Paste or write the prompt text.';
  }

  if (!draft.categoryId) errors.categoryId = 'Choose a category.';

  let thumbnailUrl: string | null = null;
  if (draft.thumbnailUrl.trim()) {
    const checked = checkUrl(draft.thumbnailUrl);
    if (checked.ok) thumbnailUrl = checked.url;
    else errors.thumbnailUrl = 'The image address must be a valid http(s) URL.';
  }

  const createdAt = cleanIsoDate(draft.createdAt);
  if (!createdAt) errors.createdAt = 'Enter a valid date.';

  if (Object.keys(errors).length > 0 || !createdAt) return { errors, value: null };

  const platform = draft.platform && PLATFORMS.includes(draft.platform) ? draft.platform : null;

  return {
    errors,
    value: {
      type: draft.type,
      title,
      url,
      description: cleanMultiline(draft.description, LIMITS.description).trim(),
      notes: cleanMultiline(draft.notes, LIMITS.notes).trim(),
      promptContent: draft.type === 'prompt' ? promptContent : '',
      project: cleanLine(draft.project, LIMITS.project),
      categoryId: draft.categoryId,
      platform: platform ?? (url ? detectPlatform(url) : null),
      tags: cleanTags(draft.tags),
      thumbnailUrl,
      icon: cleanIcon(draft.icon),
      favorite: draft.favorite,
      createdAt,
    },
  };
}
