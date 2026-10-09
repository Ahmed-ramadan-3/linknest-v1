// End-to-end smoke test. Requires a production build (npm run build) and Chromium.
// Uses playwright-core; set CHROMIUM_PATH if the browser is not at the default location.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const shots = process.env.SHOTS_DIR;
const port = 4188;
const base = `http://localhost:${port}/`;
const executablePath = process.env.CHROMIUM_PATH || undefined;

const results = [];
const consoleProblems = [];
let current = '';

async function check(name, fn) {
  current = name;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: String(error?.message ?? error).split('\n')[0] });
    console.log(`  FAIL ${name}\n       ${String(error?.message ?? error).split('\n').slice(0, 3).join('\n       ')}`);
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const server = spawn('node', ['scripts/preview.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 900));
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-background-networking', '--disable-sync', '--no-first-run'] });
const context = await browser.newContext({ viewport: { width: 1360, height: 860 }, acceptDownloads: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://localhost:${port}` });
const page = await context.newPage();
page.setDefaultTimeout(6000);
page.on('console', (message) => {
  if (!['error', 'warning'].includes(message.type())) return;
  if (/Failed to load resource/.test(message.text())) return; // remote thumbnails are blocked in CI
  consoleProblems.push(`${current}: ${message.text()}`);
});
page.on('pageerror', (error) => consoleProblems.push(`${current}: pageerror ${error.message}`));
await mkdir(join(root, '.e2e'), { recursive: true });

const shot = async (name) => {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
};
const dismissSplash = async () => {
  await page.waitForSelector('.splash__skip', { timeout: 4000 });
  await page.click('.splash__skip');
  await page.waitForSelector('.splash', { state: 'detached', timeout: 4000 });
};
// Options are indented with "└ " and non-breaking spaces to show the hierarchy, so match on cleaned text.
const selectByText = async (selector, wanted) => {
  const value = await page.locator(selector).evaluate((select, text) => {
    const clean = (o) => o.textContent.replace(/[\u00a0└]/g, '').trim();
    const option = [...select.options].find((o) => clean(o) === text);
    return option ? option.value : null;
  }, wanted);
  if (value === null) throw new Error(`option "${wanted}" not found in ${selector}`);
  await page.selectOption(selector, value);
};
const toast = async (text) => page.waitForSelector(`.toast:has-text("${text}")`, { timeout: 3000 });
const discardDraft = async () => {
  await page.keyboard.press('Escape');
  await page.waitForSelector('text=Discard this draft?');
  await page.click('dialog[open] button:text-is("Discard")');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
};
const addResource = async ({ type, title, url, categoryLabel, tags, description, promptContent, favorite }) => {
  await page.click('.header .header__add');
  await page.click(`.type-tile:has(.type-tile__label:text-is("${type}"))`);
  await page.fill('#rf-title', title);
  if (url !== undefined) await page.fill('#rf-url', url);
  if (promptContent !== undefined) await page.fill('#rf-prompt', promptContent);
  if (description) await page.fill('#rf-description', description);
  if (categoryLabel) await selectByText('#rf-category', categoryLabel);
  if (tags) {
    for (const tag of tags) {
      await page.fill('#rf-tags', tag);
      await page.press('#rf-tags', 'Enter');
    }
  }
  if (favorite) await page.check('.check input[type=checkbox]');
  await page.click('button[form=resource-form]');
};

console.log('LinkNest end-to-end checks');

await check('loader shows for ~5s then hands over to the app', async () => {
  const start = Date.now();
  await page.goto(base);
  await page.waitForSelector('.splash');
  expect(await page.locator('.splash__name').innerText() === 'LinkNest', 'splash name');
  await page.waitForSelector('.splash', { state: 'detached', timeout: 9000 });
  const elapsed = Date.now() - start;
  expect(elapsed > 4300 && elapsed < 7500, `splash lasted ${elapsed}ms`);
  await page.waitForSelector('.hero');
});

await check('starter categories exist and the app is empty', async () => {
  const names = await page.locator('.shell__sidebar .tree__name').allInnerTexts();
  for (const expected of ['Programming', 'Frontend', 'React', 'Backend', 'Git & GitHub', 'Videos', 'YouTube', 'Prompts', 'Image Generation', 'Websites', 'Other']) {
    expect(names.includes(expected), `missing starter category ${expected}`);
  }
  await page.waitForSelector('text=No resources yet');
  await shot('01-home-empty');
});

await check('add a YouTube video: platform and category are suggested, card shows title', async () => {
  await page.click('.header .header__add');
  await page.click('.type-tile:has(.type-tile__label:text-is("Video"))');
  await page.fill('#rf-title', 'React Authentication Tutorial');
  await page.fill('#rf-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10');
  expect((await page.inputValue('#rf-platform')) === 'youtube', 'platform not detected');
  const category = await page.locator('#rf-category option:checked').innerText();
  expect(category.includes('YouTube'), `category suggestion was "${category}"`);
  await page.fill('#rf-tags', 'react');
  await page.press('#rf-tags', 'Enter');
  await page.fill('#rf-tags', 'auth');
  await page.press('#rf-tags', 'Enter');
  await page.click('button[form=resource-form]');
  await toast('Resource saved');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  await page.click('.shell__sidebar >> text=All Resources');
  await page.waitForSelector('article.card');
  expect((await page.locator('.card__title').first().innerText()) === 'React Authentication Tutorial', 'title');
});

await check('thumbnail fallback never shows a broken image', async () => {
  // The sandbox has no internet, so the YouTube thumbnail fails to load and the placeholder must appear.
  await page.waitForTimeout(800);
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('.card img')].filter((img) => img.complete && img.naturalWidth === 0).length,
  );
  expect(broken === 0, `${broken} broken images are visible`);
  expect(await page.locator('.card .thumb__placeholder').count() >= 1, 'placeholder missing');
  await shot('02-card-fallback');
});

await check('validation: bad URL, empty title and missing category are rejected', async () => {
  await page.click('.header .header__add');
  await page.click('.type-tile:has(.type-tile__label:text-is("Link"))');
  await page.fill('#rf-url', 'javascript:alert(1)');
  await page.click('button[form=resource-form]');
  await page.waitForSelector('#rf-title-error');
  expect((await page.locator('#rf-url-error').innerText()).includes('http'), 'url error text');
  for (const bad of ['data:text/html,<b>x</b>', 'vbscript:x', 'file:///etc/passwd']) {
    await page.fill('#rf-url', bad);
    await page.click('button[form=resource-form]');
    expect(await page.locator('#rf-url-error').count() === 1, `${bad} accepted`);
  }
  expect(await page.locator('article.card').count() === 1, 'no new card');
  await discardDraft();
});

await check('duplicate URL detection offers open existing / add anyway / cancel', async () => {
  await page.click('.header .header__add');
  await page.click('.type-tile:has(.type-tile__label:text-is("Video"))');
  await page.fill('#rf-title', 'Same video again');
  await page.fill('#rf-url', 'https://youtu.be/dQw4w9WgXcQ');
  await page.click('button[form=resource-form]');
  await page.waitForSelector('text=This URL already exists.');
  expect(await page.locator('dialog[open] button:text-is("Open existing resource")').count() === 1, 'open existing');
  await page.locator('dialog[open]').last().locator('button:text-is("Cancel")').click();
  await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
  await page.click('dialog[open] button[form=resource-form]');
  await page.locator('dialog[open]').last().locator('button:text-is("Add anyway")').click();
  await toast('Resource saved');
  expect(await page.locator('article.card').count() === 2, 'add anyway failed');
});

await check('a different video is not treated as a duplicate', async () => {
  await addResource({ type: 'Video', title: 'Other video', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' });
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 3, null, { timeout: 4000 }).catch(() => {
    throw new Error('false duplicate: a different YouTube id was treated as an existing URL');
  });
});

await check('prompt saved with line breaks, copied exactly, copy URL works', async () => {
  const prompt = 'You are a code reviewer.\n\n  - Check edge cases\n  - Explain trade-offs\nEnd.';
  await addResource({ type: 'Prompt', title: 'Code review helper', promptContent: prompt, categoryLabel: 'Coding', tags: ['review'], favorite: true });
  await toast('Resource saved');
  await page.click('.card:has-text("Code review helper") .card__open-detail');
  await page.waitForSelector('.prompt-box');
  const shown = await page.locator('.prompt-box').evaluate((el) => el.textContent);
  expect(shown === prompt, 'prompt text altered');
  await page.click('dialog[open] button:has-text("Copy Prompt")');
  await toast('Prompt copied');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip === prompt, 'clipboard content differs');
  await shot('03-prompt-detail');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  await page.click('.card:has-text("React Authentication Tutorial") button[aria-label="Copy URL"]');
  await toast('Link copied');
  expect((await page.evaluate(() => navigator.clipboard.readText())) === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'URL copy must keep query parameters');
});

await check('open link uses a new tab with noopener', async () => {
  const link = page.locator('.card:has-text("React Authentication Tutorial") a:has-text("Open")');
  expect((await link.getAttribute('target')) === '_blank', 'target');
  const rel = await link.getAttribute('rel');
  expect(rel.includes('noopener') && rel.includes('noreferrer'), `rel=${rel}`);
});

await check('search matches title, tags, prompt text and category; empty state helps', async () => {
  await page.fill('.searchbar__input', 'authentication');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 1);
  await page.fill('.searchbar__input', 'edge cases');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 1);
  await page.fill('.searchbar__input', 'dqw4w9wgxcq');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 2);
  await page.fill('.searchbar__input', 'image generation zzz');
  await page.waitForSelector('text=No resources found');
  expect(await page.locator('.empty button:has-text("Clear search")').count() === 1, 'clear suggestion');
  expect(await page.locator('.empty button:has-text("Add a new resource")').count() === 1, 'add suggestion');
  await page.click('.empty button:has-text("Clear search")');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 4);
});

await check('filters and sorting', async () => {
  await page.click('.filter-chip:has-text("Prompt")');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 1);
  await page.click('.filters__clear');
  await page.click('.filter-chip--toggle');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 1);
  await page.click('.filters__clear');
  await page.selectOption('.filters select >> nth=-1', 'title-asc');
  const titles = await page.locator('.card__title').allInnerTexts();
  const sorted = [...titles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  expect(JSON.stringify(titles) === JSON.stringify(sorted), `not sorted: ${titles}`);
  await page.selectOption('.filters select >> nth=-1', 'title-desc');
  expect((await page.locator('.card__title').first().innerText()) === titles.at(-1), 'Z-A');
  await page.selectOption('.filters select >> nth=-1', 'newest');
  await shot('04-all-resources');
});

await check('favorite toggles and appears in Favorites view; empty favorites state', async () => {
  await page.click('.shell__sidebar >> text=Favorites');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 1);
  await page.click('.card button[aria-label^="Remove"]');
  await page.waitForSelector('text=No favorites yet');
  await page.click('.shell__sidebar >> text=All Resources');
  await page.click('.card:has-text("React Authentication Tutorial") button[aria-label^="Add"]');
  await page.click('.shell__sidebar >> text=Favorites');
  await page.waitForFunction(() => document.querySelectorAll('article.card').length === 1);
  await page.click('.shell__sidebar >> text=All Resources');
});

await check('edit a resource and the change is saved', async () => {
  await page.click('.card:has-text("Other video") button[aria-label^="Edit"]');
  await page.fill('#rf-title', 'Renamed video');
  await page.click('button[form=resource-form]');
  await toast('Changes saved');
  await page.waitForSelector('.card:has-text("Renamed video")');
});

await check('delete asks for confirmation and cancel keeps the resource', async () => {
  await page.click('.card:has-text("Renamed video") button[aria-label^="Delete"]');
  await page.waitForSelector('text=Delete this resource?');
  await page.click('dialog[open] button:text-is("Cancel")');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  expect(await page.locator('.card:has-text("Renamed video")').count() === 1, 'deleted despite cancel');
  await page.click('.card:has-text("Renamed video") button[aria-label^="Delete"]');
  await page.click('dialog[open] button:text-is("Delete")');
  await toast('Resource deleted');
  expect(await page.locator('.card:has-text("Renamed video")').count() === 0, 'still there');
});

await check('nested categories: create child, breadcrumbs, counts, no circular parents', async () => {
  await page.click('.shell__sidebar >> button[aria-label="New category"]');
  await page.fill('#cat-name', 'Svelte');
  await selectByText('#cat-parent', 'Frontend');
  await page.click('button[form=category-form]');
  await toast('Category created');
  await page.waitForSelector('.breadcrumbs:has-text("Programming"):has-text("Frontend"):has-text("Svelte")');
  expect(await page.locator('.branch').count() === 1, 'branch map');
  // Editing Programming: its own descendants must not be selectable as parents.
  await page.click('.shell__sidebar .tree__link:has-text("Programming")');
  await page.click('button[aria-label="Edit Programming"]');
  const options = await page.locator('#cat-parent option').allInnerTexts();
  expect(!options.some((o) => /Frontend|Svelte|React/.test(o)), `circular choices offered: ${options.join('|')}`);
  expect(!options.some((o) => o.trim() === 'Programming'), 'self offered');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  await shot('05-category-page');
});

await check('moving a resource into the new category updates counts', async () => {
  await page.click('.shell__sidebar >> text=All Resources');
  await page.click('.card:has-text("Code review helper") button[aria-label^="Edit"]');
  await selectByText('#rf-category', 'Svelte');
  await page.click('button[form=resource-form]');
  await toast('Changes saved');
  const count = await page.locator('.shell__sidebar .tree__link:has-text("Svelte") .tree__count').innerText();
  expect(count === '1', `Svelte count ${count}`);
  const parentCount = await page.locator('.shell__sidebar .tree__link:has-text("Frontend") .tree__count').innerText();
  expect(parentCount === '1', `Frontend rolled-up count ${parentCount}`);
});

await check('deleting a category keeps its resources (moved to the parent)', async () => {
  await page.click('.shell__sidebar .tree__link:has-text("Svelte")');
  await page.click('button[aria-label="Delete Svelte"]');
  await page.waitForSelector('text=Your resources are kept.');
  await page.click('dialog[open] button:text-is("Delete category")');
  await toast('Category deleted');
  await page.click('.shell__sidebar >> text=All Resources');
  const crumb = await page.locator('.card:has-text("Code review helper") .card__crumb').innerText();
  expect(crumb.includes('Frontend'), `crumb ${crumb}`);
});

await check('XSS: markup in titles/notes is shown as text and never executes', async () => {
  const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
  await addResource({ type: 'Link', title: payload, url: 'https://example.com/x?a=1', description: payload, categoryLabel: 'Tools' });
  await toast('Resource saved');
  await page.click('.shell__sidebar >> text=All Resources');
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.__xss)) === undefined, 'script executed');
  expect(await page.locator(`.card__title:has-text("<img src=x")`).count() === 1, 'payload not shown as text');
  expect(await page.locator('.card__title img, .card__description img, .card script').count() === 0, 'markup became DOM');
});

await check('data persists after a full reload (IndexedDB) and theme persists', async () => {
  await page.click('.header button[aria-label^="Theme"]'); // system -> light
  await page.click('.header button[aria-label^="Theme"]'); // light -> dark
  expect((await page.getAttribute('html', 'data-theme')) === 'dark', 'dark theme not applied');
  const before = await page.locator('article.card').count();
  await page.reload();
  expect((await page.getAttribute('html', 'data-theme')) === 'dark', 'theme lost on reload');
  await dismissSplash();
  await page.click('.shell__sidebar >> text=All Resources');
  await page.waitForSelector('article.card');
  expect(await page.locator('article.card').count() === before, 'resources lost after reload');
  await shot('06-dark-all');
});

await check('starter categories are not re-created after a reload', async () => {
  const n = await page.locator('.shell__sidebar .tree__name:text-is("Programming")').count();
  expect(n === 1, `Programming x${n}`);
});

await check('export produces a valid versioned backup; invalid imports are rejected safely', async () => {
  await page.click('.header button[aria-label="Settings"]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export JSON")')]);
  const path = join(root, '.e2e', 'backup.json');
  await download.saveAs(path);
  const backup = JSON.parse(await readFile(path, 'utf8'));
  expect(backup.app === 'LinkNest' && backup.schemaVersion === 1, 'header');
  expect(Array.isArray(backup.resources) && backup.resources.length >= 4, 'resources');
  expect(Array.isArray(backup.categories) && backup.categories.length > 20, 'categories');

  await writeFile(join(root, '.e2e', 'bad.json'), '{not json');
  await page.setInputFiles('input[type=file]', join(root, '.e2e', 'bad.json'));
  await page.waitForSelector('.notice--error:has-text("not valid JSON")');
  await writeFile(join(root, '.e2e', 'wrong.json'), JSON.stringify({ hello: 'world' }));
  await page.setInputFiles('input[type=file]', join(root, '.e2e', 'wrong.json'));
  await page.waitForSelector('.notice--error:has-text("not a LinkNest backup")');
});

await check('importing a hostile backup is sanitised (unsafe URLs dropped) and merge never deletes', async () => {
  const hostile = {
    app: 'LinkNest', schemaVersion: 1, exportedAt: new Date().toISOString(),
    categories: [{ id: 'imp1', name: 'Imported', parentId: 'imp2', icon: 'nope' }, { id: 'imp2', name: 'Loop', parentId: 'imp1' }],
    resources: [
      { id: 'h1', type: 'link', title: 'Good import', url: 'https://example.org/ok', categoryId: 'imp1', tags: ['x'] },
      { id: 'h2', type: 'link', title: 'Evil', url: 'javascript:alert(1)' },
      { id: 'h3', type: 'link', title: 'Evil data', url: 'data:text/html,<script>1</script>' },
    ],
    settings: { theme: 'light' },
  };
  await writeFile(join(root, '.e2e', 'hostile.json'), JSON.stringify(hostile));
  const before = (await page.evaluate(() => document.querySelectorAll('.shell__sidebar .tree__link').length));
  await page.setInputFiles('input[type=file]', join(root, '.e2e', 'hostile.json'));
  await page.waitForSelector('.import-preview');
  const preview = await page.locator('.import-preview').innerText();
  expect(preview.includes('1 resource'), `preview: ${preview}`);
  expect(/skipped/.test(preview), 'warnings should mention skipped items');
  await page.click('button:has-text("Merge and import")');
  await toast('Imported');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  await page.click('.shell__sidebar >> text=All Resources');
  expect(await page.locator('.card:has-text("Good import")').count() === 1, 'good resource missing');
  expect(await page.locator('.card:has-text("Evil")').count() === 0, 'unsafe resource imported');
  expect(await page.locator('article.card').count() >= 5, 'merge removed data');
  expect((await page.evaluate(() => document.querySelectorAll('.shell__sidebar .tree__link').length)) > before, 'categories not merged');
});

await check('keyboard: dialog traps focus, Escape closes, focus returns to opener', async () => {
  await page.click('.shell__sidebar >> text=Home');
  await page.focus('.header .header__add');
  await page.keyboard.press('Enter');
  await page.waitForSelector('dialog[open]');
  for (let i = 0; i < 25; i += 1) await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog'));
  expect(inside, 'focus escaped the dialog');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  const back = await page.evaluate(() => document.activeElement?.classList.contains('header__add'));
  expect(back, 'focus not restored');
});

await check('offline: the app shell loads from the service worker and data is intact', async () => {
  const ready = await page.evaluate(() =>
    Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]),
  );
  expect(ready, 'service worker never became ready');
  await page.reload();
  await dismissSplash();
  await context.setOffline(true);
  await page.reload();
  await dismissSplash();
  await page.click('.shell__sidebar >> text=All Resources');
  await page.waitForSelector('article.card');
  await addResource({ type: 'Link', title: 'Added offline', url: 'https://offline.example/x', categoryLabel: 'Tools' });
  await toast('Resource saved');
  await context.setOffline(false);
});

await check('reset requires typing RESET, then restores starter categories', async () => {
  await page.click('.header button[aria-label="Settings"]');
  await page.click('button:has-text("Reset all local data")');
  await page.waitForSelector('text=This will remove all LinkNest data stored in this browser.');
  const confirm = page.locator('dialog[open] button:text-is("Delete everything")');
  expect(await confirm.isDisabled(), 'confirm enabled without typing');
  await page.fill('dialog[open] input.input', 'RESET');
  await confirm.click();
  await toast('All local data was removed');
  await page.click('.shell__sidebar >> text=All Resources');
  await page.waitForSelector('text=No resources yet');
  expect(await page.locator('.shell__sidebar .tree__name:text-is("Programming")').count() === 1, 'starter categories missing');
});

await check('no horizontal overflow at phone, tablet, laptop and wide sizes', async () => {
  await addResource({ type: 'Link', title: 'A very long title '.repeat(8), url: 'https://example.com/' + 'long-segment-'.repeat(20), categoryLabel: 'Tools', tags: ['averyveryverylongtagnamethatkeepsgoing'.repeat(1)] });
  await toast('Resource saved');
  for (const [w, h] of [[360, 740], [412, 915], [768, 1024], [1024, 768], [1440, 900], [2200, 1200]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const target of ['Home', 'All Resources']) {
      if (w < 1024) {
        if (target === 'Home') await page.click('.mobile-nav >> text=Home').catch(() => page.click('.header__brand'));
        else await page.click('.mobile-nav >> text=All').catch(() => {});
      } else {
        await page.click(`.shell__sidebar >> text=${target}`);
      }
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow <= 0, `${w}x${h} ${target} overflows by ${overflow}px`);
    }
    if (w === 360) await shot('07-mobile-all');
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.click('.mobile-nav__add');
  await page.waitForSelector('.type-tile');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow <= 0, 'dialog overflows on phones');
  await shot('08-mobile-add');
  await page.keyboard.press('Escape');
  await page.waitForSelector('dialog[open]', { state: 'detached' });
  await page.click('.mobile-nav >> text=Browse');
  await page.waitForSelector('.drawer.is-open');
  await shot('09-mobile-drawer');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.drawer.is-open', { state: 'detached' });
});

await check('no console errors or warnings during the whole run', async () => {
  expect(consoleProblems.length === 0, consoleProblems.slice(0, 4).join(' || '));
});

await browser.close();
server.kill();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
