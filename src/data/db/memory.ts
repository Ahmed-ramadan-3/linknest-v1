import type { DatabaseSchema, StoreName } from '../../types';
import type { StorageAdapter, WriteOp } from './types';

type Row = DatabaseSchema[StoreName];

function keyOf(store: StoreName, value: Row): string {
  return store === 'meta' ? (value as DatabaseSchema['meta']).key : (value as { id: string }).id;
}

/**
 * In-memory adapter. Used when IndexedDB is unavailable (the app then warns that
 * nothing will persist) and by tests. Writes are applied atomically.
 */
export class MemoryAdapter implements StorageAdapter {
  readonly persistent = false;
  private readonly stores: Record<StoreName, Map<string, Row>> = {
    resources: new Map(),
    categories: new Map(),
    meta: new Map(),
  };

  async getAll<S extends StoreName>(store: S): Promise<DatabaseSchema[S][]> {
    return [...this.stores[store].values()].map((row) => structuredClone(row)) as DatabaseSchema[S][];
  }

  async get<S extends StoreName>(store: S, key: string): Promise<DatabaseSchema[S] | undefined> {
    const row = this.stores[store].get(key);
    return row === undefined ? undefined : (structuredClone(row) as DatabaseSchema[S]);
  }

  async write(ops: WriteOp[]): Promise<void> {
    // Stage first so a throwing clone leaves the real stores untouched.
    const staged = ops.map((op) =>
      op.op === 'put' ? { ...op, value: structuredClone(op.value) } : op,
    );
    for (const op of staged) {
      const map = this.stores[op.store];
      if (op.op === 'put') map.set(keyOf(op.store, op.value), op.value);
      else if (op.op === 'delete') map.delete(op.key);
      else map.clear();
    }
  }

  close(): void {
    // Nothing to release.
  }
}
