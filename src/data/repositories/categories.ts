import type { Category } from '../../types';
import type { StorageAdapter } from '../db/types';

export function createCategoryRepository(adapter: StorageAdapter) {
  return {
    list: (): Promise<Category[]> => adapter.getAll('categories'),
    save: (category: Category): Promise<void> =>
      adapter.write([{ op: 'put', store: 'categories', value: category }]),
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
