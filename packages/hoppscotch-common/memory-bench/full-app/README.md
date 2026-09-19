# Full-app memory harness (Scenario D/E — #6340)

Drives the **assembled app** (`hoppscotch-selfhost-web`, the same `hoppscotch-common`
renderer the desktop app uses) in headless Chromium and measures post-GC retained
JS heap via the Chrome DevTools Protocol — the closest reproduction of the real
desktop renderer available without the Tauri/WebView2 shell.

## One-time prerequisites

A normal `pnpm install` produces everything below automatically (postinstall builds
workspace libs and runs gql-codegen). In a constrained/offline environment you need:

1. Built workspace libs: `@hoppscotch/{data,kernel,js-sandbox}` and
   `codemirror-lang-graphql` (each: `pnpm --filter <pkg> run build` / `vite build` /
   `rollup -c`).
2. The gql-codegen artifacts `src/helpers/backend/graphql.ts` (common) and
   `src/api/generated/graphql.ts` (selfhost-web). A normal install generates these;
   they are gitignored.
3. Playwright Chromium: `pnpm --filter @hoppscotch/common exec playwright install chromium`.

## Run

```bash
# terminal 1 — start the app
bash packages/hoppscotch-common/memory-bench/full-app/serve.sh

# terminal 2 — drive it
cd packages/hoppscotch-common
node memory-bench/full-app/probe.mjs    # boot sanity + initial heap + screenshot
node memory-bench/full-app/churn.mjs    # Scenario D/E: tab churn + idle, writes results/full-app.*
```

> macOS note: Chromium needs Mach-port access; if launched inside a restrictive
> command sandbox it fails with `bootstrap_check_in … Permission denied`. Run the
> driver outside the sandbox.

## How the driver works (and why it's robust)

Rather than clicking fragile, unlabelled tab-bar buttons, `churn.mjs` reaches the
app's **real `RESTTabService` singleton** from page context via a same-URL dynamic
`import()` (Vite dev serves source modules as per-URL ESM singletons, so the import
returns the very instance the app is using). It then calls `createNewTab(...)` /
`closeTab(...)` — exactly what the `+` and tab-close buttons call. A self-check
asserts the tab count actually moves (open 3 → close 3 → back to start); if it
doesn't, the run fails rather than reporting a meaningless flat line.

## Scenarios

- **D — tab churn:** open + close N REST request tabs per round, R rounds; sample
  post-GC retained heap per round; assert flat slope.
- **E — idle:** after churn, sit idle 8s and confirm the heap doesn't creep.

Tunable via env: `ROUNDS`, `TABS_PER_ROUND`, `APP_URL`.

## Known coverage gaps (honest scope)

This harness exercises **REST request-tab churn in the personal workspace**. It does
not yet cover: team-workspace switching (needs a backend — relevant to the
team-collection adapter subscriptions), closing a tab that has rendered a *large
response* (combines #5883/H3 with #6340), or realtime (websocket/SSE) worker churn.
Those are the next measurements to add.
