import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkUrl, normalizeUrlKey, toSafeHref, hostLabel } from '../src/lib/url';
import { detectPlatform, extractYouTubeId } from '../src/lib/platform';
import { getThumbnailUrl } from '../src/lib/thumbnail';

describe('checkUrl', () => {
  it('accepts http and https URLs and preserves what the user typed', () => {
    const result = checkUrl('  https://example.com/a?b=1&c=2  ');
    assert.deepEqual(result, { ok: true, url: 'https://example.com/a?b=1&c=2' });
    assert.equal(checkUrl('http://example.com').ok, true);
  });

  it('upgrades bare domains to https', () => {
    assert.deepEqual(checkUrl('example.com/path'), { ok: true, url: 'https://example.com/path' });
    assert.deepEqual(checkUrl('localhost:3000/x'), { ok: true, url: 'https://localhost:3000/x' });
  });

  it('rejects dangerous or non-web protocols', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'ftp://example.com/file',
      'mailto:a@b.com',
      'blob:https://example.com/x',
      'about:blank',
    ]) {
      assert.equal(checkUrl(bad).ok, false, bad);
    }
  });

  it('rejects whitespace, control characters, credentials and non-hosts', () => {
    assert.equal(checkUrl('https://exa mple.com').ok, false);
    assert.equal(checkUrl('https://example.com/\u0000').ok, false);
    assert.equal(checkUrl('https://user:pass@example.com').ok, false);
    assert.equal(checkUrl('hello').ok, false);
    assert.equal(checkUrl('').ok, false);
    assert.equal(checkUrl('https://' + 'a'.repeat(3000) + '.com').ok, false);
  });
});

describe('toSafeHref / hostLabel', () => {
  it('only returns safe absolute hrefs', () => {
    assert.equal(toSafeHref('https://example.com/a b'), null);
    assert.equal(toSafeHref('javascript:alert(1)'), null);
    assert.equal(toSafeHref(null), null);
    assert.equal(toSafeHref('https://example.com'), 'https://example.com/');
    assert.equal(hostLabel('https://www.example.com/x'), 'example.com');
  });
});

describe('normalizeUrlKey', () => {
  it('treats cosmetic differences as the same URL', () => {
    const a = normalizeUrlKey('https://Example.com/path/?b=2&a=1#section');
    const b = normalizeUrlKey('http://example.com/path?a=1&b=2');
    assert.equal(a, b);
    assert.equal(normalizeUrlKey('https://example.com:443/x'), normalizeUrlKey('https://example.com/x'));
  });

  it('keeps different paths, query values and hosts distinct', () => {
    assert.notEqual(normalizeUrlKey('https://example.com/a'), normalizeUrlKey('https://example.com/b'));
    assert.notEqual(normalizeUrlKey('https://example.com/?id=1'), normalizeUrlKey('https://example.com/?id=2'));
    assert.notEqual(normalizeUrlKey('https://www.example.com/'), normalizeUrlKey('https://example.com/'));
    assert.notEqual(normalizeUrlKey('https://example.com/'), normalizeUrlKey('https://example.com/x'));
  });

  it('collapses YouTube URL shapes to the video id', () => {
    const id = 'dQw4w9WgXcQ';
    const keys = new Set([
      normalizeUrlKey(`https://www.youtube.com/watch?v=${id}`),
      normalizeUrlKey(`https://youtu.be/${id}?t=42`),
      normalizeUrlKey(`https://www.youtube.com/shorts/${id}`),
      normalizeUrlKey(`https://www.youtube.com/embed/${id}`),
    ]);
    assert.equal(keys.size, 1);
    assert.notEqual(
      normalizeUrlKey(`https://youtu.be/${id}`),
      normalizeUrlKey('https://youtu.be/aaaaaaaaaaa'),
    );
  });
});

describe('platform detection', () => {
  it('recognises known platforms and rejects look-alike hosts', () => {
    assert.equal(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'youtube');
    assert.equal(detectPlatform('https://youtu.be/dQw4w9WgXcQ'), 'youtube');
    assert.equal(detectPlatform('https://m.facebook.com/x'), 'facebook');
    assert.equal(detectPlatform('https://fb.watch/abc'), 'facebook');
    assert.equal(detectPlatform('https://www.instagram.com/p/x'), 'instagram');
    assert.equal(detectPlatform('https://vm.tiktok.com/x'), 'tiktok');
    assert.equal(detectPlatform('https://x.com/a/status/1'), 'x');
    assert.equal(detectPlatform('https://twitter.com/a'), 'x');
    assert.equal(detectPlatform('https://notyoutube.com/watch?v=dQw4w9WgXcQ'), null);
    assert.equal(detectPlatform('https://youtube.com.evil.example/'), null);
    assert.equal(detectPlatform('not a url'), null);
  });

  it('extracts YouTube ids only when they are well-formed', () => {
    const id = 'dQw4w9WgXcQ';
    assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${id}&list=PL1`), id);
    assert.equal(extractYouTubeId(`https://music.youtube.com/watch?v=${id}`), id);
    assert.equal(extractYouTubeId(`https://youtu.be/${id}`), id);
    assert.equal(extractYouTubeId(`https://youtube.com/live/${id}`), id);
    assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=short'), null);
    assert.equal(extractYouTubeId('https://www.youtube.com/watch?v="><script>x'), null);
    assert.equal(extractYouTubeId('https://www.youtube.com/'), null);
    assert.equal(extractYouTubeId('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  });
});

describe('getThumbnailUrl', () => {
  it('prefers a user image, then YouTube, then nothing', () => {
    const yt = 'https://youtu.be/dQw4w9WgXcQ';
    assert.equal(
      getThumbnailUrl({ url: yt, thumbnailUrl: 'https://img.example.com/a.png' }, true),
      'https://img.example.com/a.png',
    );
    assert.equal(
      getThumbnailUrl({ url: yt, thumbnailUrl: null }, true),
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
    assert.equal(getThumbnailUrl({ url: 'https://example.com', thumbnailUrl: null }, true), null);
    assert.equal(getThumbnailUrl({ url: yt, thumbnailUrl: null }, false), null);
    assert.equal(getThumbnailUrl({ url: yt, thumbnailUrl: 'javascript:alert(1)' }, true), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
