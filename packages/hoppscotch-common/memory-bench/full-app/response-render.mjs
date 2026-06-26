/**
 * Scenario C (full-app) — render a large JSON response in the REAL JSONLensRenderer
 * and measure retained JS heap while displayed, then after closing the tab.
 *
 * This is the faithful before/after instrument for the H3 fix: it injects a large
 * HoppRESTSuccessResponse onto the active REST tab (exactly the shape RequestRunner
 * produces), which renders the production response lens (useResponseBody x3,
 * LJSON pretty-print, jsonc AST for the outline, CodeMirror). It measures:
 *   - baseline (no response)
 *   - displayed (lens rendered)            <- the steady-state retained cost
 *   - afterClose (tab closed)              <- does it recover? (#5883+#6340)
 *
 * Prereq: dev server running (serve.sh). Usage:
 *   BODY_MB=3 node memory-bench/full-app/response-render.mjs
 */
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { mkdirSync, writeFileSync } from "node:fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/"
const SRC = "/@fs" + resolve(__dirname, "../../src")
const MB = 1024 * 1024
const toMB = (b) => +(b / MB).toFixed(2)
const BODY_MB = Number(process.env.BODY_MB ?? 3)

async function main() {
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
    for (let i = 0; i < 4; i++) {
      await client.send("HeapProfiler.collectGarbage")
      await page.waitForTimeout(40)
    }
    return (await client.send("Runtime.getHeapUsage")).usedSize
  }

  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.waitForTimeout(6000)

  const ROUNDS = Number(process.env.ROUNDS ?? 5)

  // One round: open a tab, inject a large JSON response (rendered by the real
  // lens), then close the tab. Returns the body size. Self-contained.
  const doRound = () =>
    page.evaluate(
      async ({ SRC, mb }) => {
        const dioc = await import(`${SRC}/modules/dioc.ts`)
        const { RESTTabService } = await import(`${SRC}/services/tab/rest.ts`)
        const tabs = dioc.getService(RESTTabService)
        const { getDefaultRESTRequest } = await import(
          `${SRC}/helpers/rest/default.ts`
        )
        const tab = tabs.createNewTab(
          {
            type: "request",
            request: getDefaultRESTRequest(),
            isDirty: false,
            optionTabPreference: "params",
          },
          true
        )
        const rows = []
        let approx = 0,
          i = 0
        while (approx < mb * 1024 * 1024) {
          rows.push({
            id: i,
            uuid: `${i}-3f2a9c1e-8b7d-4e6f-a1b2-cccccccccccc`,
            name: `Resource number ${i}`,
            email: `user${i}@example.com`,
            active: i % 2 === 0,
            score: i * 1.5,
            tags: ["alpha", "beta", "gamma", `tag-${i}`],
            nested: { a: i, b: `value-${i}`, c: [i, i + 1, i + 2] },
          })
          approx += 160
          i++
        }
        const str = JSON.stringify({ data: rows, count: rows.length })
        const body = new TextEncoder().encode(str).buffer
        tab.document.response = {
          type: "success",
          headers: [
            { key: "content-type", value: "application/json; charset=utf-8" },
          ],
          body,
          statusCode: 200,
          statusText: "OK",
          meta: { responseSize: body.byteLength, responseDuration: 8 },
          req: tab.document.request,
        }
        window.__pendingTabId = tab.id
        return { bodyMB: +(body.byteLength / 1048576).toFixed(2) }
      },
      { SRC, mb: BODY_MB }
    )

  const closeRound = (clearHistory) =>
    page.evaluate(
      async ({ SRC, clearHistory }) => {
        const dioc = await import(`${SRC}/modules/dioc.ts`)
        const { RESTTabService } = await import(`${SRC}/services/tab/rest.ts`)
        const tabs = dioc.getService(RESTTabService)
        tabs.closeTab(window.__pendingTabId)
        // Keep recently-closed history empty so it can't be the retainer under test.
        if (clearHistory && Array.isArray(tabs.recentlyClosedTabs))
          tabs.recentlyClosedTabs.length = 0
      },
      { SRC, clearHistory }
    )

  const baseline = await gcHeap()
  const afterCloseSamples = []
  let bodyMB = 0
  for (let r = 0; r < ROUNDS; r++) {
    const { bodyMB: bmb } = await doRound()
    bodyMB = bmb
    await page.waitForTimeout(3500) // let the lens render
    await closeRound(true)
    await page.waitForTimeout(800)
    afterCloseSamples.push(toMB(await gcHeap()))
  }

  // Linear slope of retained-after-close across rounds (MB per round).
  const ys = afterCloseSamples
  const n = ys.length
  const mx = (n - 1) / 2
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0,
    den = 0
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (ys[i] - my)
    den += (i - mx) ** 2
  }
  const slope = den ? num / den : 0

  const result = {
    scenario: `Scenario C/D full-app — large JSON rendered then closed, ${ROUNDS} rounds (${bodyMB} MB body each)`,
    baselineMB: toMB(baseline),
    retainedAfterCloseMB_perRound: ys,
    firstRoundMB: ys[0],
    lastRoundMB: ys[ys.length - 1],
    deltaMB: +(ys[ys.length - 1] - ys[0]).toFixed(2),
    slopeMB_per_round: +slope.toFixed(3),
    verdict:
      slope > bodyMB * 0.5
        ? "LEAK — retained heap ratchets ~per rendered response even after closing the tab"
        : "one-time — first render has a fixed cost (lazy CodeMirror/jq-wasm) but closing frees per-response heap",
    pageErrors: pageErrors.slice(0, 5),
  }
  const outDir = resolve(__dirname, "../results")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, "response-render.json"), JSON.stringify(result, null, 2) + "\n")
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error("RESPONSE-RENDER HARNESS FAILED:", e)
  process.exit(1)
})
