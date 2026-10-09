import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTree,
  canReparent,
  countResources,
  descendantIds,
  flattenTree,
  indexById,
  pathLabel,
  pathTo,
} from '../src/lib/categories/tree';
import { buildSeedCategories } from '../src/data/repositories/library';
import { makeCategory, makeResource } from './helpers';

const a = makeCategory({ id: 'a', name: 'A' });
const b = makeCategory({ id: 'b', name: 'B', parentId: 'a' });
const c = makeCategory({ id: 'c', name: 'C', parentId: 'b' });
const d = makeCategory({ id: 'd', name: 'D' });
const all = [a, b, c, d];

describe('category tree', () => {
  it('builds nested nodes with depth in creation order', () => {
    const tree = buildTree(all);
    assert.deepEqual(tree.map((n) => n.category.id), ['a', 'd']);
    assert.deepEqual(flattenTree(tree).map((n) => [n.category.id, n.depth]), [['a', 0], ['b', 1], ['c', 2], ['d', 0]]);
  });

  it('collects descendants and breadcrumb paths', () => {
    assert.deepEqual([...descendantIds(all, 'a')].sort(), ['a', 'b', 'c']);
    const byId = indexById(all);
    assert.deepEqual(pathTo(byId, 'c').map((x) => x.id), ['a', 'b', 'c']);
    assert.equal(pathLabel(byId, 'c'), 'A › B › C');
    assert.equal(pathLabel(byId, null), 'Uncategorized');
  });

  it('prevents circular and self parents', () => {
    assert.equal(canReparent(all, 'a', 'c').ok, false);
    assert.equal(canReparent(all, 'a', 'a').ok, false);
    assert.equal(canReparent(all, 'a', 'b').ok, false);
    assert.equal(canReparent(all, 'c', 'd').ok, true);
    assert.equal(canReparent(all, 'c', null).ok, true);
    assert.equal(canReparent(all, 'c', 'missing').ok, false);
  });

  it('enforces the maximum depth', () => {
    const chain = Array.from({ length: 6 }, (_, i) =>
      makeCategory({ id: `n${i}`, parentId: i === 0 ? null : `n${i - 1}` }),
    );
    const extra = makeCategory({ id: 'extra' });
    assert.equal(canReparent([...chain, extra], 'extra', 'n5').ok, false);
    assert.equal(canReparent([...chain, extra], 'extra', 'n3').ok, true);
  });

  it('does not loop forever on corrupt cyclic data', () => {
    const x = makeCategory({ id: 'x', parentId: 'y' });
    const y = makeCategory({ id: 'y', parentId: 'x' });
    assert.ok(pathTo(indexById([x, y]), 'x').length <= 2);
    assert.ok(buildTree([x, y]).length >= 0);
  });

  it('counts direct and rolled-up resources and uncategorized ones', () => {
    const counts = countResources(all, [
      makeResource({ categoryId: 'c' }),
      makeResource({ categoryId: 'b' }),
      makeResource({ categoryId: null }),
      makeResource({ categoryId: 'ghost' }),
    ]);
    assert.equal(counts.direct.get('c'), 1);
    assert.equal(counts.total.get('a'), 2);
    assert.equal(counts.total.get('b'), 2);
    assert.equal(counts.total.get('d'), undefined);
    assert.equal(counts.uncategorized, 2);
  });
});

describe('starter categories', () => {
  it('create a valid hierarchy with stable seed keys', () => {
    const seeds = buildSeedCategories();
    const byId = indexById(seeds);
    assert.ok(seeds.length > 20);
    assert.equal(new Set(seeds.map((s) => s.id)).size, seeds.length);
    assert.ok(seeds.every((s) => s.parentId === null || byId.has(s.parentId)));
    const roots = buildTree(seeds).map((n) => n.category.name);
    assert.deepEqual(roots, ['Programming', 'Videos', 'Prompts', 'Social Media', 'Websites', 'Other']);
    const frontend = seeds.find((s) => s.seedKey === 'programming.frontend');
    assert.deepEqual(buildTree(seeds)[0].children.find((n) => n.category.id === frontend?.id)?.children.map((n) => n.category.name), ['HTML', 'CSS', 'JavaScript', 'React']);
  });
});
