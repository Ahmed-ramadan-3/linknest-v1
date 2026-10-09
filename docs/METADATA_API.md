# Optional future feature: `/api/metadata`

**Not implemented and not required.** Version 1 is fully functional without it (`FEATURES.metadataApi` is
`false` in `src/config/app.ts`). This page records the intended design so it can be added later, for example as
a Vercel serverless function, without rewriting the app.

## Why it would exist

A browser cannot fetch another site's HTML to read its Open Graph tags (CORS). A small server-side function
can, and could pre-fill the title, description and image when saving a link.

## Contract

`GET /api/metadata?url=<encoded http(s) url>` returns

```json
{ "title": "…", "description": "…", "image": "https://…", "siteName": "…" }
```

Any field can be `null`. The client type is already defined in `src/lib/metadata/types.ts`
(`LinkMetadata`, `MetadataProvider`). To wire it in later: implement `MetadataProvider` with a `fetch` to the
endpoint (with an `AbortSignal` timeout), call it from the resource form after the URL field loses focus, and
only fill fields the user has not edited. The CSP `connect-src 'self'` already permits same-origin calls.

## Server requirements (all mandatory)

1. Accept only `http:` and `https:`; reject credentials in the URL; limit the URL length.
2. **SSRF protection:** resolve the hostname first and refuse loopback, private, link-local and unique-local
   ranges (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7, fe80::/10) and cloud metadata
   addresses; re-check after every redirect and pin the connection to the validated IP.
3. Follow at most 3 redirects; enforce an overall timeout (about 5 s).
4. Cap the response size (about 512 KB) and stop reading after `</head>`; accept only `text/html`.
5. Never read local files or return raw upstream bodies; extract only title, description, `og:image`,
   `og:site_name`, and return plain strings (length-capped). Validate that `image` is an `https:` URL.
6. Rate-limit per client and send no cookies or credentials upstream.
7. Keep any secret (for example a rate-limit store token) in Vercel environment variables, never in the repo.

## Hosting note

The function lives in `api/metadata.ts` at the repository root so Vercel picks it up automatically. The static
site and service worker need no changes. GitHub Pages cannot host it; the feature would simply stay off there.
