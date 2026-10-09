import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBackup, parseBackup, serializeBackup } from '../src/data/backup';
import { makeCategory, makeResource } from './helpers';

const settings = { theme: 'dark', motion: 'reduce', remoteThumbnails: false } as const;

function roundTrip(extra: Record<string, unknown> = {}) {
  const cat = makeCategory({ id: 'c1', name: 'Programming', icon: 'code' });
  const res = makeResource({
    id: 'r1',
    title: 'My prompt',
    type: 'prompt',
    url: '',
    promptContent: 'Line one\n  indented line\n\nLine four',
    categoryId: 'c1',
    tags: ['a', 'b'],
  });
  const text = serializeBackup({ ...buildBackup({ categories: [cat], resources: [res] }, settings), ...extra });
  return { cat, res, text };
}

describe('backup export/import', () => {
  it('round-trips data and preserves prompt line breaks', () => {
    const { res, text } = roundTrip();
    const parsed = parseBackup(text);
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    assert.equal(parsed.backup.data.resources[0].promptContent, res.promptContent);
    assert.equal(parsed.backup.data.categories[0].name, 'Programming');
    assert.deepEqual(parsed.backup.settings, settings);
    assert.deepEqual(parsed.backup.warnings, []);
  });

  it('rejects files that are not valid LinkNest backups', () => {
    assert.equal(parseBackup('{not json').ok, false);
    assert.equal(parseBackup('[]').ok, false);
    assert.equal(parseBackup('null').ok, false);
    assert.equal(parseBackup(JSON.stringify({ app: 'Other', schemaVersion: 1, categories: [], resources: [] })).ok, false);
    assert.equal(parseBackup(JSON.stringify({ app: 'LinkNest', schemaVersion: 'x', categories: [], resources: [] })).ok, false);
    assert.equal(parseBackup(JSON.stringify({ app: 'LinkNest', schemaVersion: 999, categories: [], resources: [] })).ok, false);
    assert.equal(parseBackup(JSON.stringify({ app: 'LinkNest', schemaVersion: 1, categories: {}, resources: [] })).ok, false);
  });

  it('drops resources with unsafe or invalid URLs and reports it', () => {
    const payload = {
      app: 'LinkNest',
      schemaVersion: 1,
      exportedAt: 'nonsense',
      categories: [],
      resources: [
        { id: 'a', type: 'link', title: 'ok', url: 'https://example.com' },
        { id: 'b', type: 'link', title: 'xss', url: 'javascript:alert(1)' },
        { id: 'c', type: 'link', title: 'data', url: 'data:text/html,<b>x</b>' },
        { id: 'd', type: 'link', title: 'no url' },
        'garbage',
        null,
      ],
    };
    const parsed = parseBackup(JSON.stringify(payload));
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.backup.data.resources.map((r) => r.id), ['a']);
    assert.ok(parsed.backup.warnings.some((w) => w.includes('skipped')));
    assert.equal(parsed.backup.exportedAt, null);
  });

  it('only keeps known fields and strips markup-significant control characters', () => {
    const payload = {
      app: 'LinkNest',
      schemaVersion: 1,
      categories: [{ id: 'c', name: 'Cat\u0000egory', icon: 'not-an-icon', evil: '<script>', __proto__: { polluted: true } }],
      resources: [
        {
          id: 'r',
          type: 'bogus',
          title: '<img src=x onerror=alert(1)>',
          url: 'https://example.com',
          thumbnailUrl: 'javascript:alert(1)',
          icon: '<b>',
          tags: ['ok', '<script>', 5, null, 'ok'],
          favorite: 'yes',
          createdAt: 'garbage',
          extra: { nested: 1 },
        },
      ],
    };
    const parsed = parseBackup(JSON.stringify(payload));
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    const [cat] = parsed.backup.data.categories;
    const [res] = parsed.backup.data.resources;
    assert.equal(cat.name, 'Category');
    assert.equal(cat.icon, 'folder');
    assert.equal('evil' in cat, false);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(res.type, 'other');
    assert.equal(res.thumbnailUrl, null);
    assert.equal(res.icon, null);
    assert.equal(res.favorite, false);
    assert.deepEqual(res.tags, ['ok', '<script>']);
    assert.equal('extra' in res, false);
    assert.ok(!Number.isNaN(Date.parse(res.createdAt)));
    // Titles stay plain text; the UI renders them through React's escaping.
    assert.equal(res.title, '<img src=x onerror=alert(1)>');
  });

  it('repairs missing parents, cycles, duplicate ids and unknown categories', () => {
    const payload = {
      app: 'LinkNest',
      schemaVersion: 1,
      categories: [
        { id: 'a', name: 'A', parentId: 'b' },
        { id: 'b', name: 'B', parentId: 'a' },
        { id: 'c', name: 'C', parentId: 'ghost' },
        { id: 'c', name: 'Duplicate C' },
        { id: 'bad id!', name: 'Bad' },
        { id: 'e', name: '   ' },
      ],
      resources: [
        { id: 'r', type: 'link', title: 'One', url: 'https://one.example', categoryId: 'ghost' },
        { id: 'r', type: 'link', title: 'Two', url: 'https://two.example', categoryId: 'c' },
      ],
    };
    const parsed = parseBackup(JSON.stringify(payload));
    assert.ok(parsed.ok);
    if (!parsed.ok) return;
    const { categories, resources } = parsed.backup.data;
    assert.deepEqual(categories.map((c) => c.id), ['a', 'b', 'c']);
    assert.ok(categories.filter((c) => c.parentId === null).length >= 1, 'cycle broken');
    assert.equal(categories.find((c) => c.id === 'c')?.parentId, null);
    assert.equal(new Set(resources.map((r) => r.id)).size, 2);
    assert.equal(resources.find((r) => r.title === 'One')?.categoryId, null);
    assert.equal(resources.find((r) => r.title === 'Two')?.categoryId, 'c');
    assert.ok(parsed.backup.warnings.length >= 2);
  });

  it('ignores invalid settings values', () => {
    const { text } = roundTrip({ settings: { theme: 'neon', motion: 3, remoteThumbnails: 'yes' } });
    const parsed = parseBackup(text);
    assert.ok(parsed.ok);
    if (parsed.ok) assert.deepEqual(parsed.backup.settings, {});
  });
});
