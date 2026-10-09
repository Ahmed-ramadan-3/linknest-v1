import type { Category, Resource } from '../src/types';

let counter = 0;

export function makeCategory(overrides: Partial<Category> = {}): Category {
  counter += 1;
  const stamp = new Date(Date.UTC(2025, 0, 1, 0, 0, counter)).toISOString();
  return {
    id: `cat${counter}`,
    name: `Category ${counter}`,
    parentId: null,
    icon: 'folder',
    accent: null,
    seedKey: null,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

export function makeResource(overrides: Partial<Resource> = {}): Resource {
  counter += 1;
  const stamp = new Date(Date.UTC(2025, 0, 1, 0, 0, counter)).toISOString();
  return {
    id: `res${counter}`,
    type: 'link',
    title: `Resource ${counter}`,
    url: `https://example.com/${counter}`,
    description: '',
    notes: '',
    promptContent: '',
    project: '',
    categoryId: null,
    platform: null,
    tags: [],
    thumbnailUrl: null,
    icon: null,
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}
