import type { Resource } from '../../types';
import type { StorageAdapter } from '../db/types';

export function createResourceRepository(adapter: StorageAdapter) {
  return {
    list: (): Promise<Resource[]> => adapter.getAll('resources'),
    save: (resource: Resource): Promise<void> =>
      adapter.write([{ op: 'put', store: 'resources', value: resource }]),
    remove: (id: string): Promise<void> =>
      adapter.write([{ op: 'delete', store: 'resources', key: id }]),
  };
}

export type ResourceRepository = ReturnType<typeof createResourceRepository>;
