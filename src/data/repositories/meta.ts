import type { StorageAdapter } from '../db/types';

export const META_KEYS = {
  seeded: 'seeded',
} as const;

export function createMetaRepository(adapter: StorageAdapter) {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const record = await adapter.get('meta', key);
      return record?.value as T | undefined;
    },
    set: (key: string, value: unknown): Promise<void> =>
      adapter.write([{ op: 'put', store: 'meta', value: { key, value } }]),
  };
}

export type MetaRepository = ReturnType<typeof createMetaRepository>;
