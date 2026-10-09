import { DB_NAME, DB_VERSION } from '../../config/app';
import type { DatabaseSchema, StoreName } from '../../types';
import { logDev } from '../../lib/log';
import { runMigrations } from '../migrations';
import { StorageError, type StorageAdapter, type WriteOp } from './types';

function toStorageError(error: unknown, fallback: string): StorageError {
  if (error instanceof StorageError) return error;
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError') {
    return new StorageError('quota', 'Storage quota exceeded', { cause: error });
  }
  return new StorageError('failed', fallback, { cause: error });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error, 'Request failed'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toStorageError(tx.error, 'Transaction failed'));
    tx.onabort = () => reject(toStorageError(tx.error, 'Transaction aborted'));
  });
}

export class IndexedDbAdapter implements StorageAdapter {
  readonly persistent = true;

  constructor(private readonly db: IDBDatabase) {}

  async getAll<S extends StoreName>(store: S): Promise<DatabaseSchema[S][]> {
    const tx = this.db.transaction(store, 'readonly');
    return requestToPromise(tx.objectStore(store).getAll() as IDBRequest<DatabaseSchema[S][]>);
  }

  async get<S extends StoreName>(store: S, key: string): Promise<DatabaseSchema[S] | undefined> {
    const tx = this.db.transaction(store, 'readonly');
    return requestToPromise(tx.objectStore(store).get(key) as IDBRequest<DatabaseSchema[S] | undefined>);
  }

  async write(ops: WriteOp[]): Promise<void> {
    if (ops.length === 0) return;
    const stores = [...new Set(ops.map((op) => op.store))];
    try {
      const tx = this.db.transaction(stores, 'readwrite');
      const done = transactionDone(tx);
      for (const op of ops) {
        const store = tx.objectStore(op.store);
        if (op.op === 'put') store.put(op.value);
        else if (op.op === 'delete') store.delete(op.key);
        else store.clear();
      }
      await done;
    } catch (error) {
      throw toStorageError(error, 'Write failed');
    }
  }

  close(): void {
    this.db.close();
  }
}

/** Opens (and if needed upgrades) the database. Rejects with a StorageError. */
export function openIndexedDb(): Promise<IndexedDbAdapter> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('unavailable', 'IndexedDB is not available'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(new StorageError('unavailable', 'IndexedDB could not be opened', { cause: error }));
      return;
    }

    request.onupgradeneeded = (event) => {
      const tx = request.transaction;
      if (!tx) return;
      try {
        runMigrations(request.result, tx, event.oldVersion, event.newVersion ?? DB_VERSION);
      } catch (error) {
        logDev('Migration failed', error);
        tx.abort();
      }
    };
    request.onblocked = () => reject(new StorageError('blocked', 'Database upgrade is blocked'));
    request.onerror = () => reject(new StorageError('unavailable', 'IndexedDB failed to open', { cause: request.error }));
    request.onsuccess = () => {
      const db = request.result;
      // Let another tab upgrade the schema instead of blocking it.
      db.onversionchange = () => db.close();
      resolve(new IndexedDbAdapter(db));
    };
  });
}
