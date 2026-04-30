# Zapro-branded Hoppscotch — local Docker design

**Date:** 2026-04-28
**Owner:** Joan Rosario
**Status:** Approved (brainstorm → plan)

## Goal

Run a Zapro-branded Hoppscotch locally via Docker Compose with cookie-aware
requests working end-to-end (without a browser extension) and session/data
persistence across `docker compose down`. This is a stepping-stone to
self-hosting; hosting itself is out of scope for this round.

## Non-goals (this round)

- Microsoft (Azure AD) OAuth login — deferred.
- Existing collection import / CSV migration — deferred.
- Production hosting and DNS — deferred.
- PR-driven endpoint sync from application code — optional / future.
- Desktop app (Mac / Windows) packaging — optional / future.

## Architecture

```
docker-compose.zapro.yml
├── hoppscotch-aio     all-in-one branded image (web :3000, admin :3100, backend :3170)
├── hoppscotch-db      Postgres 15 + named volume (collections, users, sessions)
└── proxyscotch        Go sidecar (:9159) for cookie-aware request forwarding
```

### Why these choices

- **AIO image, not separate web/admin/backend containers** — fewer moving parts
  for a local demo, one branded image to maintain.
- **proxyscotch as sidecar, not hoppscotch-relay** — user requirement; cleanest
  fit for a hosted web deploy where the user only has a browser. Server-side
  fetch with a persistent cookie jar.
- **Postgres in-stack, not external** — no external dependency for local; can
  swap to a managed DB at hosting time.

### Persistence

| Volume | Purpose | Survives `down` |
|---|---|---|
| `zapro-db-data` | Postgres data dir (collections, users, request history) | Yes |
| `zapro-proxyscotch-cookies` | Proxyscotch cookie jar / config | Yes |

## Branding (light, source-level)

| Surface | Change | File(s) |
|---|---|---|
| App icon / header logo | Zapro SVG | `packages/hoppscotch-common/assets/...` (replace icon set) |
| Favicon | Zapro PNG → ico/png set | `packages/hoppscotch-selfhost-web/public/` |
| Browser tab title | `Hoppscotch` → `Zapro` | `index.html` of selfhost-web + sh-admin |
| Product name in copy | `Hoppscotch` → `Zapro` | `packages/hoppscotch-common/locales/en.json` (visible strings only) |
| Meta tags (OG, description) | Zapro-centric | `index.html` head |
| Default interceptor | Proxy mode → `proxyscotch:9159` | `packages/hoppscotch-common/src/services/...` (interceptor default) |

**Sources:** logos pulled from `spc-fe-1/public/zapro.png` and
`spc-fe-1/src/assets/icons/SvgZaproLogo*.tsx`.

**Not touched (deliberately):**
- MIT license attribution (legally required).
- Embedded `hoppscotch.io` documentation links inside settings tooltips.
- Color theme.

## Cookie flow (without browser extension)

1. User makes a request in the Zapro web UI.
2. UI's interceptor is set to **Proxy** mode (not Browser), pointing at
   `http://proxyscotch:9159` (or the host's exposed port locally).
3. Proxyscotch performs the upstream HTTP call server-side, reads the
   `Set-Cookie` headers, persists them in its cookie jar.
4. Subsequent requests to the same origin attach those cookies automatically.

## Findings from codebase exploration (post-brainstorm)

- **Default interceptor is a one-line flip** in
  `packages/hoppscotch-selfhost-web/src/main.ts` (`web.defaultInterceptor:
  "browser" → "proxy"`). No env-var path exists today.
- **Proxy URL has no env var.** Today the default is a hardcoded constant
  `DEFAULT_HOPP_PROXY_URL` in
  `packages/hoppscotch-common/src/helpers/proxyUrl.ts`. We will add a
  `VITE_PROXY_URL` env var so the URL is runtime-injected via the existing
  `aio_run.mjs` `import-meta-env` rewrite trick — no rebuild needed.
- **Cookie jar is NOT wired into the proxy interceptor today.** Hoppscotch's
  `CookieJarService` is consumed only by the Agent and Native (desktop)
  interceptors. The Proxy interceptor receives `Set-Cookie` headers but does
  nothing with them. Without a fix, session cookies do not auto-attach to
  subsequent requests in proxy mode.
- **Branding has more surfaces than the original spec listed:** duplicate
  `meta.ts` files in `selfhost-web` and `common`, a hardcoded `"Hoppscotch"`
  literal in `head.ts` outside `APP_INFO`, a separate `logo.svg` for the
  admin app, and PWA manifest fields (including `web+hoppscotch` protocol
  handlers) generated inside `vite.config.ts`.

## Decisions taken (after exploration)

- **Cookie support — Option A:** wire `CookieJarService` into the proxy
  interceptor (capture `Set-Cookie` from proxy responses; inject `Cookie`
  headers from the jar into outgoing requests, mirroring the Agent path).
  Persist the in-memory jar to `localStorage` so it survives reloads. This
  is a small, isolated source change confined to two files.
- **Routing mode:** `multiport` (web :3000, admin :3100, backend :3170) for
  local. Subpath mode deferred to hosting time.
- **Locale scope:** `en.json` only this round. Other locales unchanged
  (proper nouns commonly stay untranslated anyway).
- **Footer links:** keep upstream `hoppscotch.io` links untouched (MIT
  attribution surface).
- **Proxy URL plumbing:** add a `VITE_PROXY_URL` env var; threaded through
  `proxyUrl.ts` and consumed at boot by the proxy interceptor's settings
  store.

## Updated branding inventory

| Surface | File(s) | Change |
|---|---|---|
| Header / sidebar logo | `packages/hoppscotch-common/assets/icons/logo.svg` | Replace with Zapro SVG |
| Admin sidebar logo | `packages/hoppscotch-sh-admin/public/logo.svg` | Replace with Zapro SVG |
| App icon (PWA + Apple + MS Tile) | `packages/hoppscotch-common/public/icon.png` | Replace |
| PWA icon set | `packages/hoppscotch-common/public/icons/pwa-*.png` (7 files) | Replace |
| Favicon | `packages/hoppscotch-common/public/favicon.ico` | Replace |
| Social share banner | `packages/hoppscotch-common/public/banner.png` | Replace |
| `APP_INFO` (selfhost-web) | `packages/hoppscotch-selfhost-web/meta.ts` | Update name/description/twitter/colors |
| `APP_INFO` (common) | `packages/hoppscotch-common/meta.ts` | Update to match |
| Title-suffix hardcode | `packages/hoppscotch-common/src/modules/head.ts` | Replace literal `"Hoppscotch"` with `APP_INFO.name` |
| Tab title (selfhost-web) | `packages/hoppscotch-selfhost-web/index.html` | Update `<title>` |
| Tab title (admin) | `packages/hoppscotch-sh-admin/index.html` | Update `<title>` |
| PWA manifest + protocol handlers | `packages/hoppscotch-selfhost-web/vite.config.ts` | Update names; consider dropping `web+hopp*` handlers (optional) |
| Visible product name strings | `packages/hoppscotch-common/locales/en.json`, `packages/hoppscotch-sh-admin/locales/en.json` | `Hoppscotch → Zapro` (en only) |
| Native-share strings | `packages/hoppscotch-common/src/components/app/Footer.vue` (lines 242–243) | Replace hardcoded `"Hoppscotch"` literals |

## Open risks / unknowns (residual)

- **AIO image rebuild time:** fresh build of `prod.Dockerfile` target `aio`
  is slow on first run; mitigate with BuildKit cache-mount and `pnpm` cache.
- **Proxyscotch upstream image freshness:** verify
  `hoppscotch/proxyscotch:latest` is still maintained; if abandoned, fall
  back to building from source.
- **CookieJarService `localStorage` persistence:** needs a serialization
  step (Map → JSON) and a domain-scoped restore on boot — straightforward
  but new code worth a unit test.

## Acceptance criteria

1. `docker compose -f docker-compose.zapro.yml up -d` boots cleanly on a fresh
   machine.
2. http://localhost:3000 shows Zapro logo, favicon, tab title, and product
   name in visible chrome.
3. A request to a cookie-issuing endpoint (e.g.
   `https://httpbin.org/cookies/set/foo/bar`) followed by a request to
   `https://httpbin.org/cookies` shows `foo=bar` round-tripped — without any
   browser extension installed.
4. `docker compose down` then `up` retains the user's saved collections and
   the proxy cookie jar.

## What user is asked for

- Now: nothing — implementation can proceed.
- During build: nothing.
- At end: run the compose command, verify the four acceptance criteria, then
  decide hosting target.
