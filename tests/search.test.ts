import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EMPTY_FILTERS,
  applyFilters,
  buildSearchIndex,
  collectTags,
  normalizeForSearch,
  sortResources,
} from '../src/lib/search';
import type { LibraryFilters } from '../src/types';
import { makeCategory, makeResource } from './helpers';

const programming = makeCategory({ id: 'p', name: 'Programming' });
const frontend = makeCategory({ id: 'f', name: 'Frontend', parentId: 'p' });
const videos = makeCategory({ id: 'v', name: 'Videos' });
const categories = [programming, frontend, videos];

const react = makeResource({
  id: 'r1',
  title: 'React Authentication Tutorial',
  url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  type: 'video',
  platform: 'youtube',
  categoryId: 'f',
  tags: ['react', 'auth'],
  favorite: true,
  createdAt: '2025-03-01T10:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
});
const prompt = makeResource({
  id: 'r2',
  title: 'Code review helper',
  type: 'prompt',
  url: '',
  promptContent: 'Review this function for edge cases.\nExplain trade-offs.',
  categoryId: 'v',
  tags: ['review'],
  createdAt: '2025-02-01T10:00:00.000Z',
  updatedAt: '2025-02-01T10:00:00.000Z',
});
const arabic = makeResource({
  id: 'r3',
  title: 'شرح الجافاسكربت',
  notes: 'مصدر مفيد',
  categoryId: 'p',
  createdAt: '2024-01-01T10:00:00.000Z',
  updatedAt: '2024-01-02T10:00:00.000Z',
});
const resources = [react, prompt, arabic];
const index = buildSearchIndex(resources, categories);
const run = (partial: Partial<LibraryFilters>, now?: number) =>
  applyFilters({ ...EMPTY_FILTERS, ...partial }, { resources, categories, index, now }).map((r) => r.id);

describe('search', () => {
  it('matches title, url, notes, prompt content, tags, category and platform', () => {
    assert.deepEqual(run({ query: 'authentication' }), ['r1']);
    assert.deepEqual(run({ query: 'dqw4w9wgxcq' }), ['r1']);
    assert.deepEqual(run({ query: 'edge cases' }), ['r2']);
    assert.deepEqual(run({ query: 'review' }), ['r2']);
    assert.deepEqual(run({ query: 'frontend' }), ['r1']);
    assert.deepEqual(run({ query: 'youtube' }), ['r1']);
    assert.deepEqual(run({ query: 'مفيد' }), ['r3']);
  });

  it('requires every word to match and ignores case and diacritics', () => {
    assert.deepEqual(run({ query: 'REACT tutorial' }), ['r1']);
    assert.deepEqual(run({ query: 'react nonexistent' }), []);
    assert.equal(normalizeForSearch('Café'), 'cafe');
  });

  it('finds nothing for an unmatched query and everything for an empty one', () => {
    assert.deepEqual(run({ query: 'zzzz' }), []);
    assert.equal(run({}).length, 3);
  });
});

describe('filters', () => {
  it('filters by type, platform, tags, favorites and date', () => {
    assert.deepEqual(run({ types: ['prompt'] }), ['r2']);
    assert.deepEqual(run({ platforms: ['youtube'] }), ['r1']);
    assert.deepEqual(run({ tags: ['REACT'] }), ['r1']);
    assert.deepEqual(run({ tags: ['react', 'review'] }), []);
    assert.deepEqual(run({ favoritesOnly: true }), ['r1']);
    const now = Date.parse('2025-03-05T00:00:00.000Z');
    assert.deepEqual(run({ date: '7d' }, now), ['r1']);
    assert.deepEqual(run({ date: 'year' }, now).sort(), ['r1', 'r2']);
  });

  it('scopes a category to its descendants, but search stays global', () => {
    assert.deepEqual(run({ categoryId: 'p' }).sort(), ['r1', 'r3']);
    assert.deepEqual(run({ categoryId: 'f' }), ['r1']);
    assert.deepEqual(run({ categoryId: 'f', query: 'code review' }), ['r2']);
  });
});

describe('sorting', () => {
  const titles = (sort: Parameters<typeof sortResources>[1]) => sortResources(resources, sort).map((r) => r.id);
  it('supports every sort mode', () => {
    assert.deepEqual(titles('newest'), ['r1', 'r2', 'r3']);
    assert.deepEqual(titles('oldest'), ['r3', 'r2', 'r1']);
    assert.deepEqual(titles('title-asc'), ['r2', 'r1', 'r3'].sort((a, b) => {
      const t = (id: string) => resources.find((r) => r.id === id)!.title;
      return t(a).localeCompare(t(b), undefined, { sensitivity: 'base', numeric: true });
    }));
    assert.deepEqual(titles('title-desc'), [...titles('title-asc')].reverse());
    assert.deepEqual(titles('updated'), ['r1', 'r2', 'r3']);
    assert.equal(titles('favorites')[0], 'r1');
  });

  it('does not mutate its input', () => {
    const before = resources.map((r) => r.id);
    sortResources(resources, 'oldest');
    assert.deepEqual(resources.map((r) => r.id), before);
  });
});

describe('collectTags', () => {
  it('counts tags case-insensitively', () => {
    const tags = collectTags([
      makeResource({ tags: ['React'] }),
      makeResource({ tags: ['react', 'css'] }),
    ]);
    assert.deepEqual(tags.map((t) => [t.tag.toLowerCase(), t.count]), [['react', 2], ['css', 1]]);
  });
});
