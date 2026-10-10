import { translate } from '../../i18n/core';
import type { DatabaseSchema, StoreName } from '../../types';

export type StorageErrorCode = 'unavailable' | 'quota' | 'blocked' | 'failed';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
    this.code = code;
  }
}

/** User-facing text for a storage failure. Never includes stack traces. */
export function describeStorageError(error: unknown): string {
  if (error instanceof StorageError) {
    switch (error.code) {
      case 'quota':
        return translate('storage.quota');
      case 'blocked':
        return translate('storage.blocked');
      case 'unavailable':
        return translate('storage.unavailable');
      default:
        return translate('storage.failed');
    }
  }
  return translate('storage.generic');
}

export type WriteOp =
  | { op: 'put'; store: StoreName; value: DatabaseSchema[StoreName] }
  | { op: 'delete'; store: StoreName; key: string }
  | { op: 'clear'; store: StoreName };

/**
 * Minimal storage contract. Repositories depend on this interface only, so the
 * IndexedDB implementation can be swapped (memory fallback, tests, future sync).
 */
export interface StorageAdapter {
  readonly persistent: boolean;
  getAll<S extends StoreName>(store: S): Promise<DatabaseSchema[S][]>;
  get<S extends StoreName>(store: S, key: string): Promise<DatabaseSchema[S] | undefined>;
  /** Applies all operations atomically: either every one is stored or none is. */
  write(ops: WriteOp[]): Promise<void>;
  close(): void;
}
