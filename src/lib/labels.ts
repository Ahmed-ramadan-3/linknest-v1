import { PLATFORM_META } from '../config/app';
import { translate } from '../i18n/core';
import type { Platform, ResourceType } from '../types';

/** Display text for resource types and platforms in the current language. */
export function typeLabel(type: ResourceType): string {
  return translate(`type.${type}`);
}

export function typeDescription(type: ResourceType): string {
  return translate(`type.${type}.desc`);
}

export function platformLabel(platform: Platform): string {
  return platform === 'other' ? translate('platform.other') : PLATFORM_META[platform].label;
}
