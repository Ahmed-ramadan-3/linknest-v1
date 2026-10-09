import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryAdapter } from '../src/data/db/memory';
import { createRepositories } from '../src/data/repositories';
import { makeCategory, makeResource } from './helpers';

function setup() {
  const adapter = new MemoryAdapter();
  return { adapter, repos: createRepositories(adapter) };
}

describe('repositories (memory adapter)', () => {
  it('saves, lists and removes resources', async () => {
    const { repos } = setup();
    const r = makeResource({ id: 'r1', title: 'Hello' });
    await repos.resources.save(r);
    assert.deepEqual((await repos.resources.list()).map((x) => x.title), ['Hello']);
    await repos.resources.save({ ...r, title: 'Changed' });
    assert.equal((await repos.resources.list())[0].title, 'Changed');
    await repos.resources.remove('r1');
    assert.equal((await repos.resources.list()).length, 0);
  });

  it('seeds starter categories exactly once', async () => {
    const { repos } = setup();
    const first = await repos.library.seedIfNeeded(await repos.library.loadAll());
    assert.ok(first && first.length > 0);
    // Even after the user deletes everything, defaults must not come back.
    const loaded = await repos.library.loadAll();
    await repos.library.replaceAll({ categories: [], resources: [] });
    const second = await repos.library.seedIfNeeded(await repos.library.loadAll());
    assert.equal(second, null);
    assert.ok(loaded.categories.length > 0);
  });

  it('does not seed when data already exists', async () => {
    const { repos } = setup();
    await repos.categories.save(makeCategory({ id: 'mine' }));
    assert.equal(await repos.library.seedIfNeeded(await repos.library.loadAll()), null);
    assert.equal((await repos.library.loadAll()).categories.length, 1);
  });

  it('replaceAll swaps every record', async () => {
    const { repos } = setup();
    await repos.resources.save(makeResource({ id: 'old' }));
    await repos.library.replaceAll({
      categories: [makeCategory({ id: 'c' })],
      resources: [makeResource({ id: 'new' })],
    });
    const data = await repos.library.loadAll();
    assert.deepEqual(data.resources.map((r) => r.id), ['new']);
    assert.deepEqual(data.categories.map((c) => c.id), ['c']);
  });

  it('mergeAll adds new records and keeps the newer duplicate', async () => {
    const { repos } = setup();
    const older = makeResource({ id: 'same', title: 'Old', updatedAt: '2025-01-01T00:00:00.000Z' });
    const newer = makeResource({ id: 'same', title: 'New', updatedAt: '2025-02-01T00:00:00.000Z' });
    const current = { categories: [], resources: [newer, makeResource({ id: 'keep' })] };
    await repos.library.replaceAll(current);
    const { data, summary } = await repos.library.mergeAll(current, {
      categories: [makeCategory({ id: 'c' })],
      resources: [older, makeResource({ id: 'extra' })],
    });
    assert.equal(data.resources.find((r) => r.id === 'same')?.title, 'New');
    assert.equal(summary.resourcesAdded, 1);
    assert.equal(summary.categoriesAdded, 1);
    assert.equal(summary.skipped, 1);
    assert.equal((await repos.library.loadAll()).resources.length, 3);
  });

  it('deleting a category re-homes its children and resources atomically', async () => {
    const { repos } = setup();
    const parent = makeCategory({ id: 'parent' });
    const mid = makeCategory({ id: 'mid', parentId: 'parent' });
    const leaf = makeCategory({ id: 'leaf', parentId: 'mid' });
    const inMid = makeResource({ id: 'r', categoryId: 'mid' });
    const data = { categories: [parent, mid, leaf], resources: [inMid] };
    await repos.library.replaceAll(data);

    const next = await repos.library.deleteCategory({ id: 'mid', childrenGoTo: 'parent', resourcesGoTo: 'parent' }, data);
    assert.deepEqual(next.categories.map((c) => c.id).sort(), ['leaf', 'parent']);
    assert.equal(next.categories.find((c) => c.id === 'leaf')?.parentId, 'parent');
    assert.equal(next.resources[0].categoryId, 'parent');

    const stored = await repos.library.loadAll();
    assert.deepEqual(stored.categories.map((c) => c.id).sort(), ['leaf', 'parent']);
    assert.equal(stored.resources[0].categoryId, 'parent');
  });

  it('resetAll clears data and restores the starter categories', async () => {
    const { repos } = setup();
    await repos.resources.save(makeResource());
    const seeds = await repos.library.resetAll();
    const data = await repos.library.loadAll();
    assert.equal(data.resources.length, 0);
    assert.equal(data.categories.length, seeds.length);
  });

  it('applies writes atomically in the memory adapter', async () => {
    const { adapter } = setup();
    const circular: Record<string, unknown> = {};
    circular.self = () => 1; // functions cannot be cloned
    await assert.rejects(
      adapter.write([
        { op: 'put', store: 'resources', value: makeResource({ id: 'ok' }) },
        { op: 'put', store: 'resources', value: circular as never },
      ]),
    );
    assert.equal((await adapter.getAll('resources')).length, 0);
  });
});
