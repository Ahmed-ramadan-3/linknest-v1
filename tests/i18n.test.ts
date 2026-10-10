import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ar, arSeeds } from '../src/i18n/ar';
import { en, enSeeds, type Message } from '../src/i18n/en';
import {
  categoryDisplayName,
  loadLanguage,
  setCurrentLanguage,
  translate,
} from '../src/i18n/core';

const placeholders = (message: Message): string[] => {
  const texts = typeof message === 'string' ? [message] : Object.values(message);
  const names = new Set<string>();
  for (const text of texts) for (const match of text.matchAll(/\{(\w+)\}/g)) names.add(match[1]);
  return [...names].sort();
};

test('every English key has an Arabic translation with the same placeholders', () => {
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    const arabic = ar[key];
    assert.ok(arabic !== undefined && arabic !== '', `missing Arabic text for ${key}`);
    const englishNames = placeholders(en[key]);
    const arabicNames = placeholders(arabic);
    // Plural forms may omit {n} when the form states the number in words ("one resource").
    const missing = englishNames.filter((name) => name !== 'n' && !arabicNames.includes(name));
    assert.deepEqual(missing, [], `placeholders missing in Arabic for ${key}`);
    const extra = arabicNames.filter((name) => !englishNames.includes(name));
    assert.deepEqual(extra, [], `unknown placeholders in Arabic for ${key}`);
  }
});

test('Arabic starter category names cover every English one', () => {
  for (const key of Object.keys(enSeeds)) assert.ok(arSeeds[key], `missing seed name ${key}`);
});

test('English plurals and parameters', () => {
  setCurrentLanguage('en');
  assert.equal(translate('count.resource', { n: 1 }), '1 resource');
  assert.equal(translate('count.resource', { n: 5 }), '5 resources');
  assert.equal(translate('page.addTo', { name: 'Tools' }), 'Add to Tools');
});

test('Arabic uses its six plural forms', async () => {
  await loadLanguage('ar');
  setCurrentLanguage('ar');
  try {
    assert.equal(translate('count.resource', { n: 0 }), 'لا موارد');
    assert.equal(translate('count.resource', { n: 1 }), 'مورد واحد');
    assert.equal(translate('count.resource', { n: 2 }), 'موردان');
    assert.equal(translate('count.resource', { n: 3 }), '3 موارد');
    assert.equal(translate('count.resource', { n: 11 }), '11 موردًا');
    assert.equal(translate('count.resource', { n: 100 }), '100 مورد');
    assert.equal(translate('nav.all'), 'كل الموارد');
  } finally {
    setCurrentLanguage('en');
  }
});

test('starter categories are translated until renamed', async () => {
  await loadLanguage('ar');
  const starter = { name: 'Programming', seedKey: 'programming' };
  const renamed = { name: 'My code', seedKey: 'programming' };
  setCurrentLanguage('ar');
  try {
    assert.equal(categoryDisplayName(starter), 'البرمجة');
    assert.equal(categoryDisplayName(renamed), 'My code');
    assert.equal(categoryDisplayName({ name: 'Custom', seedKey: null }), 'Custom');
  } finally {
    setCurrentLanguage('en');
  }
  assert.equal(categoryDisplayName(starter), 'Programming');
});
