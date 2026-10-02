/**
 * Shared helpers for the full-app (headless-Chromium) memory drivers.
 *
 * Plain `.mjs` so the drivers can be `node`-run directly with no build step.
 * They cannot import the TypeScript `../lib/measure.ts` (that targets the
 * in-process vitest harness via `process.memoryUsage()`/`global.gc`), so the
 * post-GC sampling here goes through the Chrome DevTools Protocol instead.
 *
 * Playwright is loaded lazily inside `launchHeapSession` (it is a manual,
 * unlisted dependency — see ../README.md) so the pure helpers below can be
 * imported without it installed.
 */

export const MB = 1024 * 1024
export const bytesToMB = (b) => +(b / MB).toFixed(2)

/**
 * Ordinary-least-squares slope of `ys` against sample index (units of `ys` per
 * round). Near-zero = flat; a positive slope that scales with rounds is a
 * retained-reference leak.
 */
export function leakSlope(ys) {
  const n = ys.length
  if (n < 2) return 0
  const mx = (n - 1) / 2
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0,
    den = 0
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (ys[i] - my)
    den += (i - mx) ** 2
  }
  return den ? num / den : 0
}

/**
 * Launch headless Chromium with `--expose-gc`, open a page at `appUrl`, attach a
 * CDP session with HeapProfiler enabled, and start collecting page errors.
 * Returns the handles plus a `gcHeap()` sampler that forces several GC cycles
 * and reads the post-GC retained heap (`Runtime.getHeapUsage`).
 */
export async function launchHeapSession(
  appUrl,
  { gcCycles = 4, gcWaitMs = 40 } = {}
) {
  const { chromium } = await import("playwright")
  const browser = await chromium.launch({
    headless: true,
    args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"],
  })
  const page = await browser.newPage()
  const pageErrors = []
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  const client = await page.context().newCDPSession(page)
  await client.send("HeapProfiler.enable")

  const gcHeap = async () => {
    for (let i = 0; i < gcCycles; i++) {
      await client.send("HeapProfiler.collectGarbage")
      await page.waitForTimeout(gcWaitMs)
    }
    return (await client.send("Runtime.getHeapUsage")).usedSize
  }

  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })

  return { browser, page, client, pageErrors, gcHeap }
}
