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
        return 'Your browser has no storage space left for LinkNest. Export a backup and free some space.';
      case 'blocked':
        return 'Storage is blocked by another open LinkNest tab. Close other tabs and reload.';
      case 'unavailable':
        return 'Local storage is not available in this browser session (private mode or blocked by settings).';
      default:
        return 'LinkNest could not save your data. Please try again.';
    }
  }
  return 'Something went wrong while saving. Please try again.';
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
