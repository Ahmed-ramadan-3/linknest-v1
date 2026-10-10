import { translate } from '../../i18n/core';
import { logDev } from '../../lib/log';
import { openIndexedDb } from './indexedDb';
import { MemoryAdapter } from './memory';
import { describeStorageError, type StorageAdapter } from './types';

export interface StorageHandle {
  adapter: StorageAdapter;
  /** True when data survives a reload. False means the in-memory fallback is active. */
  persistent: boolean;
  /** Friendly warning to show when the fallback is active. */
  warning: string | null;
}

/** Opens IndexedDB, falling back to memory so the app is still usable. */
export async function createStorage(): Promise<StorageHandle> {
  try {
    const adapter = await openIndexedDb();
    return { adapter, persistent: true, warning: null };
  } catch (error) {
    logDev('IndexedDB unavailable, using memory storage', error);
    return {
      adapter: new MemoryAdapter(),
      persistent: false,
      warning: translate('storage.memoryWarning', { reason: describeStorageError(error) }),
    };
  }
}

export { MemoryAdapter } from './memory';
export { IndexedDbAdapter } from './indexedDb';
export type { StorageAdapter, WriteOp } from './types';
export { StorageError, describeStorageError } from './types';
