# LinkNest

**Your personal space for links, videos, prompts & digital resources.**

LinkNest is a private, local-first organizer: a bookmark manager, resource library, prompt vault and
visual category map in one lightweight web app. There is **no backend, no database server, no account
and no analytics**. Everything you save stays in your browser (IndexedDB) on your device.

## Features

- Save links, videos, programming resources, prompts, websites and social posts, each with title, URL,
  description, notes, tags, platform, thumbnail, project, custom icon, favorite flag and editable saved date.
- Hierarchical categories (up to 6 levels) with icons, accent tints, live counts, a collapsible sidebar tree,
  breadcrumbs and a mind-map style branch view. Circular parents are impossible.
- Prompt Vault: line breaks and indentation are preserved exactly; one-click **Copy Prompt**.
- Global search (title, URL, description, notes, prompt text, tags, category, platform), filters (type,
  category, platform, tags, favorites, date) and six sort orders.
- Duplicate-URL detection (“This URL already exists”) that never merges genuinely different URLs.
- JSON backup/restore (merge or replace) with strict validation and sanitisation.
- **Arabic and English.** A language button in the header (and in Settings) switches every label, message,
  date and count between Arabic (right-to-left) and English. The choice is remembered; on a first visit it follows
  the browser language. Starter categories are shown translated until you rename them. Your own content is never
  translated.
- **Hide / show the library menu.** The button at the start of the header hides or shows the sidebar on desktop
  (remembered), and opens the drawer on tablets and phones.
- **Search bar that steps aside.** It slides away while you read down a page and returns when you scroll back
  up (or press `/` or Ctrl/Cmd+K). It never hides while you are typing in it.
- **Fast on weak devices.** Dialogs and the Arabic text load on demand, repeated cards skip blur and off-screen
  work, and a *Lite* mode (automatic on low-memory / few-core devices, or chosen in Settings → Performance)
  removes blur and background animation.
- Light / dark / system theme, reduced-motion support, responsive layouts with a phone bottom bar and
  drawer, keyboard accessible dialogs, RTL layout.
- Installable PWA with an offline-first service worker.
- A branded intro with a skip button and a hard timer, so it can never trap you: the full 5 seconds on your first
  visit, 2 seconds on later visits (`SPLASH_DURATION_MS` / `SPLASH_RETURNING_MS` in `src/config/app.ts`).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live rebuild (no service worker). |
| `npm run build` | Typechecks and builds the static site into `dist/`. |
| `npm run preview` | Serves `dist/` at http://localhost:4173. |
| `npm run typecheck` | Strict TypeScript check. |
| `npm run lint` | Strict TypeScript check plus unused locals/parameters. |
| `npm test` | Unit tests (URL handling, search, categories, backup, repositories). |
| `npm run test:e2e` | Browser end-to-end tests (needs a build and Chromium, see below). |
| `npm run check` | Typecheck, lint, unit tests and build. |

Requirements: Node.js 20 or newer. The only runtime dependencies are `react`, `react-dom` and
`react-icons` (Lucide icon set). The bundler is esbuild; there is no Vite/webpack config to maintain.

### End-to-end tests

```bash
npm run build
CHROMIUM_PATH=/path/to/chromium npm run test:e2e   # CHROMIUM_PATH is optional if Playwright's browser is installed
```

Set `SHOTS_DIR=/some/dir` to also save screenshots of each major view.

## Where data lives

| Data | Location |
| --- | --- |
| Resources, categories | IndexedDB database `linknest` in this browser profile |
| Theme, motion, thumbnail preference | `localStorage` key `linknest.prefs.v1` (tiny; read before first paint) |

Clearing site data, using a different browser or a private window means starting empty. **Use
Settings → Export JSON regularly** and Import to move between devices. The Settings page shows approximate
sizes and honestly labels browser-provided numbers as estimates.

## Project structure

```
src/
  i18n/          en.ts (every message key), ar.ts (Arabic), core.ts (translate, plurals), index.tsx (provider)
  config/        brand.json (name, tagline), app.ts (types, platforms, starter categories, limits), icons.ts
  types/         Resource, Category, AppSettings, ImportExportSchema, DatabaseSchema, ...
  data/
    db/          StorageAdapter interface, IndexedDB + in-memory adapters
    migrations/  versioned schema migrations (add a new entry to change the schema)
    repositories/  resources, categories, meta and atomic multi-record operations
    backup.ts    export/import schema, validation and sanitisation
  lib/           url, platform (YouTube), thumbnail, search, categories, validation, format, clipboard, prefs, ...
  hooks/         library, settings, routing, toasts, UI state
  components/    layout, navigation, resources, categories, modals, settings, search, ui
  pages/         Dashboard, LibraryPage
  styles/        tokens (all colours), glass, layout, components, dialogs, pages, splash
public/          manifest, service worker, icons, theme-init.js
scripts/         build.mjs, dev.mjs, preview.mjs
tests/           unit tests and e2e/smoke.mjs
```

Components never touch IndexedDB directly: they use the library context, which uses repositories, which
use a `StorageAdapter`.

### Customising

- **Interface text / adding a language:** every string lives in `src/i18n/en.ts`. `src/i18n/ar.ts` must define
  the same keys (TypeScript and `tests/i18n.test.ts` enforce it). To add a language, add its code to `LANGUAGES`
  in `src/types/index.ts`, create a dictionary file, and register it in `src/i18n/core.ts`.
- **Name and tagline:** `src/config/brand.json`.
- **Starter categories, resource types, platforms, limits:** `src/config/app.ts`.
- **Colours:** every colour is a CSS variable in `src/styles/tokens.css` (light and dark).
- **Changing the stored data shape:** raise `DB_VERSION` in `src/config/app.ts`, append a migration in
  `src/data/migrations/index.ts`, and bump `SCHEMA_VERSION` with a matching backup migration if the export
  format changes.

## Deployment

The build output (`dist/`) is a fully static site that uses relative URLs and hash routing, so it works at a
domain root or under a sub-path.

### Vercel

Import the repository. `vercel.json` already sets the build command (`npm run build`), the output
directory (`dist`), long-lived caching for hashed assets and security headers (including the CSP and
`frame-ancestors`). No environment variables are needed.

### GitHub Pages

Build and publish `dist/` with a workflow such as:

```yaml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

GitHub Pages cannot send custom headers, so the CSP is also embedded as a `<meta>` tag in `index.html`
(`frame-ancestors` cannot be set that way; only the Vercel header carries it).

## Security notes

- All user content is rendered through React's escaping; there is no `innerHTML`, `dangerouslySetInnerHTML`
  or `eval` anywhere in `src/`.
- Only `http:` and `https:` URLs can be saved. `javascript:`, `data:`, `vbscript:`, `file:` and others are
  rejected on input, on import, and again when a link is rendered. URLs with embedded credentials are rejected.
- External links open with `target="_blank" rel="noopener noreferrer"`. Websites are never embedded in iframes.
- Imported JSON is parsed into fresh objects from known fields only; strings are length-capped and stripped of
  control and bidi-override characters; ids are validated; broken or cyclic category links are repaired.
- CSP: `script-src 'self'` and `style-src 'self'` (no inline scripts or styles, no eval). `img-src` allows
  `https:` because saved thumbnails can live on any site, and `data:` for the built-in grain texture. The
  “Load preview images” switch in Settings turns remote images off entirely.
- No secrets exist in this project and none are needed.

## Thumbnails: what is and is not possible

Browsers cannot read Open Graph tags from arbitrary sites (CORS). LinkNest therefore uses, in order:
YouTube thumbnails derived from the video id, then an image URL you paste, then a generated placeholder
(type icon, tint and title initials). It never shows a broken-image icon. Thumbnails are stored as URLs, not
downloaded. Automatic metadata for other sites needs a server; see [docs/METADATA_API.md](docs/METADATA_API.md).

## Known limitations

- Data is per browser profile. There is no sync; use export/import.
- Thumbnails other than YouTube need a pasted image URL, and remote images only show when online.
- The category map is a structured tree view, not a free-form graph editor, and there is no drag-and-drop
  reordering yet.
- The interface is available in English and Arabic only. The Arabic text was written for this project and has
  not been reviewed by a professional translator; corrections are welcome in `src/i18n/ar.ts`.
- The search bar hides when you scroll *down* the page and returns when you scroll *up*; this is the usual
  convention and is set in `src/hooks/useHideOnScroll.ts`.

## License

MIT
