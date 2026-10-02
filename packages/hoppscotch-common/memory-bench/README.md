# Memory benchmark harness

A reproducible harness for measuring the **renderer JS heap** of `hoppscotch-common`,
built to investigate the desktop memory issues (#5883, #6340, #6408), to drive the
JSON response-lens memory fix that shipped alongside it, and to guard against
regressions.

## The fix this harness drove

Heap-snapshot bisection (`full-app/snapshot.mjs`) traced the bulk of an open large
response's retained heap to derived structures the JSON lens built eagerly for every
response. `src/components/lenses/renderers/JSONLensRenderer.vue` now caps two of them
by response size (read from `meta.responseSize`, falling back to decoded-string length):

- **Prettify round-trip** (lossless-parse → re-stringified pretty copy) is skipped
  above `JSON_PRETTIFY_MAX_BYTES` (2 MB) — the body is shown unformatted.
- **Structure-outline AST** (the positional `jsonParse`, ~5× the body and ~45% of an
  open response's retained heap) is skipped above `JSON_OUTLINE_MAX_BYTES` (512 KB) —
  the outline breadcrumb is omitted.

Raw view, copy, download and filtering are unaffected. Measured by
`full-app/response-render.mjs` on an ~800 KB JSON response (retained while displayed):
**17.6 MB → 9.6 MB** (−8 MB, ~45%) from the outline-AST cap; the prettify cap removes
the multi-copy amplification on multi-MB bodies (the #5883 case). This reduces the
renderer JS heap behind #5883 (Windows) and #6408 (macOS), and the renderer-heap
contribution to #6340 (WebView2 process memory, which also has an OS/webview-controlled
component this harness does not measure).

## Why renderer JS heap

The desktop app is Tauri (WebView2 on Windows, WKWebView on macOS) rendering this
same Vue app. The addressable memory is overwhelmingly the renderer JS heap.
WebView2/WKWebView **process RSS** is partly OS/webview-controlled and is reported
separately (it is not what this harness measures).

## Truth metric

**Post-GC retained JS heap.** In a browser this is
`performance.memory.usedJSHeapSize`; under Node/V8 (where this harness runs) the
faithful equivalent is `process.memoryUsage().heapUsed` sampled immediately after a
forced GC. The harness therefore runs under `--expose-gc` and forces several GC
cycles before every sample (`lib/measure.ts`).

- **Leak signal:** run an action loop N times; after GC the retained heap should
  return to ~baseline (flat). A positive slope that scales with the work is a
  retained-reference leak. A one-time spike that fully recovers is acceptable.

## Running

```bash
cd packages/hoppscotch-common
pnpm run bench:memory          # = cross-env NODE_OPTIONS=--expose-gc vitest run --config vitest.bench.config.mts
```

Results are written to `memory-bench/results/<scenario>.{json,md}` (Vitest 4
suppresses in-test console output on non-TTY runs, so the numbers are persisted to
disk for CI artifacts and PR evidence).

## Layout

```
memory-bench/
  lib/measure.ts      GC + post-GC heap sampling, leak-slope (OLS) helpers
  lib/fixtures.ts     synthetic collection trees / request objects
  lib/report.ts       JSON + Markdown result writers
  scenarios/
    collections.bench.spec.ts     Scenario B (collection load) + D-lite (mount/unmount)
    response-body.bench.spec.ts    Scenario C (large JSON response copy amplification)
  full-app/           headless-Chromium drivers for the assembled app (Scenarios C/D/E)
    serve.sh            start the assembled selfhost-web app
    lib.mjs             shared browser launch + CDP post-GC sampler + leak-slope
    probe.mjs           boot sanity + initial heap + screenshot
    churn.mjs           Scenario D/E — tab churn + idle growth (#6340)
    response-render.mjs Scenario C — large JSON in the real lens; before/after + regression guard
    snapshot.mjs        diagnostic heap snapshot (what survives tab close)
    discover.mjs        DOM / test-id discovery helper
    README.md           full-app prerequisites + usage
  results/            generated; gitignored
```

## Scenario coverage vs the issue set

| ID  | Scenario                          | Status                                                                                                                                            |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Cold-start baseline               | implicit (harness baseline ≈ store-only)                                                                                                         |
| B   | Collection load (#5883)           | **covered** (`scenarios/collections.bench.spec.ts`)                                                                                              |
| C   | Large JSON response (#5883/#6408) | **covered + fixed** — `scenarios/response-body.bench.spec.ts` (copy amplification) and `full-app/response-render.mjs` (real lens, before/after the cap) |
| D   | Tab/workspace churn (#6340)       | **covered** — full assembled app (`full-app/churn.mjs`); workspace switching still TODO                                                          |
| E   | Idle growth (#6340)               | **covered** (`full-app/churn.mjs` idle phase)                                                                                                    |
| F   | Regression guard                  | `full-app/response-render.mjs` exits non-zero if the retained-after-close slope exceeds `SLOPE_BUDGET_MB` (default 25) for ≥3 MB bodies          |

Two runners: the vitest unit harness (`pnpm run bench:memory`, Scenarios B/C) and the
full-app headless-Chromium harness (`full-app/`, Scenarios C/D/E — see `full-app/README.md`).

> **Playwright is not a declared dependency.** The vitest harness (Scenarios B/C)
> needs no extra install. The full-app runner (`full-app/`) drives headless
> Chromium via Playwright, but to keep the default `pnpm install` lean it is **not**
> listed in `package.json`. Install it ad-hoc only when you want to run the
> full-app harness:
>
> ```bash
> cd packages/hoppscotch-common
> pnpm add -D playwright          # or: pnpm dlx playwright
> pnpm exec playwright install chromium
> ```

## Methodology notes / fidelity

- The collection scenario reconstructs the real `restCollectionStore` wiring using
  the **production** `DispatchingStore` class and the **production**
  `useReadonlyStream` composable (the genuine modules under test), wired exactly as
  `newstore/collections.ts` does. It deliberately does not import
  `newstore/collections.ts` wholesale, because that module pulls in the full app
  bootstrap (i18n, dioc services, auth) which needs the app's real entry sequence.
- The large-response scenario uses the **same `lossless-json` library and the same
  parse→pretty operations** as `JSONLensRenderer.vue`, plus the exact
  `getResponseBodyText` implementation.
- Numbers are scaled above Node heap measurement noise where needed and the effect
  scales linearly with size; realistic (issue-sized) numbers are reported too.
- The full-fidelity variant that drives the **assembled app** in headless Chromium
  (real post-GC heap via CDP, real DOM detachment, real persistence/IndexedDB) is
  implemented under `full-app/` (Scenarios C/D/E) and is what measures the shipped fix
  in the real `JSONLensRenderer`. It needs built workspace libs and the gql-codegen
  artifact — both produced by a normal `pnpm install` — see `full-app/README.md`.
