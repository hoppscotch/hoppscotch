import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// `getService(CookieJarService)` at module top level would construct
// the service during ESM evaluation. `onServiceInit` then calls
// `Store.init()`, which reads `window.__KERNEL__.store` and throws
// because `createHoppApp` has not yet called `initKernel(...)`. The
// catch in `onServiceInit` degrades the service to in-memory mode
// but logs `[CookieJar] Kernel store unavailable` on every browser
// load. The lazy form `() => getService(...)` defers construction to
// first call, by which point `initKernel(...)` has run and
// `Store.init()` succeeds.
//
// This spec pins the source form. A re-import test would re-trigger
// RequestRunner's circular `i18n → newstore/history → RequestRunner`
// cycle and fail under vitest's module evaluation.
//
// `fileURLToPath(import.meta.url)` keeps the path resolution
// ESM-portable. A bare `__dirname` works under vitest today but
// depends on a CJS global the package's `module: "ESNext"` config
// does not guarantee. `new URL("../X", import.meta.url)` would hit
// Vite's asset-URL transform and resolve against the dev server
// origin (`http://localhost:3000/...`).
const here = dirname(fileURLToPath(import.meta.url))

describe("RequestRunner cookie-jar binding", () => {
  test("binds CookieJarService lazily on first call", () => {
    const source = readFileSync(resolve(here, "../RequestRunner.ts"), "utf8")
    // The optional `\s*:\s*\S+` group catches a typed eager binding
    // like `const cookieJarService: CookieJarService = getService(...)`
    // which a plain `^const\s+\w+\s*=` would skip.
    expect(source).not.toMatch(
      /^const\s+\w+(?:\s*:\s*\S+)?\s*=\s*getService\s*\(\s*CookieJarService\s*\)/m
    )
    expect(source).toMatch(/=>\s*getService\s*\(\s*CookieJarService\s*\)/)
  })
})
