import type { StorageAdapter } from '../db/types';
import { createCategoryRepository } from './categories';
import { createLibraryRepository } from './library';
import { createMetaRepository } from './meta';
import { createResourceRepository } from './resources';

export function createRepositories(adapter: StorageAdapter) {
  return {
    categories: createCategoryRepository(adapter),
    resources: createResourceRepository(adapter),
    meta: createMetaRepository(adapter),
    library: createLibraryRepository(adapter),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export type { LibraryData, MergeSummary, CategoryDeletePlan } from './library';
