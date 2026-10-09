import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateDraft, type ResourceDraft } from '../src/lib/validation/resource';
import { cleanIsoDate, cleanLine, cleanMultiline, cleanTags, isSafeId, parseTagInput } from '../src/lib/validation/sanitize';
import { initials, toLocalInputValue, fromLocalInputValue } from '../src/lib/format';

function draft(overrides: Partial<ResourceDraft> = {}): ResourceDraft {
  return {
    type: 'link',
    title: 'React Authentication Tutorial',
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    description: '',
    notes: '',
    promptContent: '',
    project: '',
    categoryId: 'cat',
    platform: null,
    tags: [],
    thumbnailUrl: '',
    icon: null,
    favorite: false,
    createdAt: '2025-05-05T10:00:00.000Z',
    ...overrides,
  };
}

describe('validateDraft', () => {
  it('accepts a valid resource and detects the platform', () => {
    const result = validateDraft(draft());
    assert.deepEqual(result.errors, {});
    assert.equal(result.value?.platform, 'youtube');
    assert.equal(result.value?.title, 'React Authentication Tutorial');
  });

  it('reports every missing required field', () => {
    const result = validateDraft(draft({ title: '   ', url: '', categoryId: null }));
    assert.equal(result.value, null);
    assert.ok(result.errors.title && result.errors.url && result.errors.categoryId);
  });

  it('rejects dangerous URLs and image URLs', () => {
    assert.ok(validateDraft(draft({ url: 'javascript:alert(1)' })).errors.url);
    assert.ok(validateDraft(draft({ thumbnailUrl: 'data:image/svg+xml,<svg onload=alert(1)>' })).errors.thumbnailUrl);
  });

  it('allows prompts without a URL but requires their text', () => {
    assert.ok(validateDraft(draft({ type: 'prompt', url: '', promptContent: '' })).errors.promptContent);
    const ok = validateDraft(draft({ type: 'prompt', url: '', promptContent: 'Line 1\nLine 2' }));
    assert.deepEqual(ok.errors, {});
    assert.equal(ok.value?.promptContent, 'Line 1\nLine 2');
  });

  it('drops prompt text from non-prompt types', () => {
    assert.equal(validateDraft(draft({ promptContent: 'secret' })).value?.promptContent, '');
  });

  it('rejects an invalid saved date', () => {
    assert.ok(validateDraft(draft({ createdAt: 'not-a-date' })).errors.createdAt);
  });
});

describe('sanitizers', () => {
  it('cleans lines, multiline text, tags and ids', () => {
    assert.equal(cleanLine('  a \n\t b\u0000 ', 10), 'a b');
    assert.equal(cleanLine('x'.repeat(50), 5), 'xxxxx');
    assert.equal(cleanLine(42, 5), '');
    assert.equal(cleanMultiline('a\r\n  b\r\n\r\nc', 100), 'a\n  b\n\nc');
    assert.deepEqual(cleanTags(['#React', 'react', ' css ', '', 5]), ['React', 'css']);
    assert.deepEqual(parseTagInput('one, two, #three،machine learning'), ['one', 'two', 'three', 'machine learning']);
    assert.equal(isSafeId('abc-123_X'), true);
    assert.equal(isSafeId('a b'), false);
    assert.equal(isSafeId('__proto__x'.repeat(20)), false);
    assert.equal(cleanIsoDate('2025-01-02'), '2025-01-02T00:00:00.000Z');
    assert.equal(cleanIsoDate('1800-01-01'), null);
    assert.equal(cleanIsoDate({}), null);
  });

  it('strips bidirectional override characters', () => {
    assert.equal(cleanLine('evil‮gnp.exe', 50), 'evilgnp.exe');
  });
});

describe('format helpers', () => {
  it('builds initials for Latin and Arabic titles', () => {
    assert.equal(initials('react auth'), 'RA');
    assert.equal(initials('شرح الجافاسكربت').length > 0, true);
    assert.equal(initials('   '), '?');
  });

  it('round-trips datetime-local values', () => {
    const iso = '2025-05-05T10:30:00.000Z';
    assert.equal(fromLocalInputValue(toLocalInputValue(iso)), iso);
    assert.equal(fromLocalInputValue(''), '');
  });
});
