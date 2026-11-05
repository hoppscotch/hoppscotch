/**
 * Scenario D/E — Tab churn + idle (issue #6340: "memory grows during usage, not
 * freed when idle, closing tabs/workspaces doesn't reduce it").
 *
 * Drives the ASSEMBLED app (selfhost-web, same renderer as desktop) in headless
 * Chromium. Instead of fragile DOM clicking, it reaches the app's REAL
 * `RESTTabService` singleton via a same-URL dynamic import from page context
 * (Vite dev serves source modules as per-URL ESM singletons, so the imported
 * module is the very instance the running app uses). Opening/closing tabs this way
 * calls exactly what the "+" button and tab close button call.
 *
 * Truth metric: post-GC retained JS heap via CDP HeapProfiler.collectGarbage +
 * Runtime.getHeapUsage. Asserts the retained heap is flat across churn rounds
 * (a positive slope that scales with rounds = the #6340 leak).
 *
 * Prereq: dev server running (memory-bench/full-app/serve.sh). Then:
 *   node memory-bench/full-app/churn.mjs
 */
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { mkdirSync, writeFileSync } from "node:fs"
import { bytesToMB, leakSlope, launchHeapSession } from "./lib.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/"
// Absolute /@fs URL base for hoppscotch-common/src (matches the app's module URLs).
const SRC = "/@fs" + new URL("../../src/", import.meta.url).pathname

const ROUNDS = Number(process.env.ROUNDS ?? 12)
const TABS_PER_ROUND = Number(process.env.TABS_PER_ROUND ?? 10)
const WARMUP_ROUNDS = 3

async function main() {
  const { browser, page, pageErrors, gcHeap } = await launchHeapSession(
    APP_URL,
    { gcWaitMs: 30 }
  )
  await page.waitForTimeout(6000)

  // Wire up the real tab service in page context.
  const setup = await page.evaluate(async (SRC) => {
    const dioc = await import(`${SRC}/modules/dioc.ts`)
    const { RESTTabService } = await import(`${SRC}/services/tab/rest.ts`)
    const { getDefaultRESTRequest } = await import(`${SRC}/helpers/rest/default.ts`)
    const tabs = dioc.getService(RESTTabService)
    const makeDoc = () => ({
      type: "request",
      request: getDefaultRESTRequest(),
      isDirty: false,
      optionTabPreference: "params",
    })
    window.__bench = {
      tabCount: () => tabs.getTabs().length,
      openTabs: (n) => {
        const ids = []
        for (let i = 0; i < n; i++) ids.push(tabs.createNewTab(makeDoc(), true).id)
        return ids
      },
      closeTabs: (ids) => ids.forEach((id) => tabs.closeTab(id)),
      firstTabId: () => tabs.getTabs()[0]?.id,
    }
    return { initialTabs: tabs.getTabs().length }
  }, SRC)

  // Self-check: opening/closing must actually change the count, else the driver
  // is not wired to the real service and the measurement is meaningless.
  // closeTab() defers tabMap.delete to Vue nextTick, so wait a tick before counting.
  const beforeMid = await page.evaluate(() => {
    const before = window.__bench.tabCount()
    const ids = window.__bench.openTabs(3)
    window.__bench._lastIds = ids
    return { before, mid: window.__bench.tabCount() }
  })
  await page.waitForTimeout(50)
  await page.evaluate(() => window.__bench.closeTabs(window.__bench._lastIds))
  await page.waitForTimeout(100)
  const afterCount = await page.evaluate(() => window.__bench.tabCount())
  const check = { before: beforeMid.before, mid: beforeMid.mid, after: afterCount }
  if (!(check.mid === check.before + 3 && check.after === check.before)) {
    throw new Error(
      `Tab-service driver self-check failed: ${JSON.stringify(check)} — not wired to the real service`
    )
  }

  const samples = []
  const totalRounds = WARMUP_ROUNDS + ROUNDS
  for (let r = 0; r < totalRounds; r++) {
    await page.evaluate((n) => {
      const ids = window.__bench.openTabs(n)
      window.__bench.closeTabs(ids)
    }, TABS_PER_ROUND)
    await page.waitForTimeout(80) // let Vue nextTick run the deferred tabMap.delete
    const heap = await gcHeap()
    if (r >= WARMUP_ROUNDS) samples.push(bytesToMB(heap))
  }

  // Scenario E (idle): after churn, sit idle and confirm heap doesn't creep.
  const idleStart = await gcHeap()
  await page.waitForTimeout(8000)
  const idleEnd = await gcHeap()

  const slope = leakSlope(samples) // MB per round
  const result = {
    scenario: "D/E full-app tab churn + idle (#6340)",
    rounds: ROUNDS,
    tabsPerRound: TABS_PER_ROUND,
    selfCheck: check,
    retainedMB: samples,
    startMB: samples[0],
    endMB: samples[samples.length - 1],
    deltaMB: +(samples[samples.length - 1] - samples[0]).toFixed(2),
    slopeMB_per_round: +slope.toFixed(4),
    idle: { startMB: bytesToMB(idleStart), endMB: bytesToMB(idleEnd) },
    pageErrors: pageErrors.slice(0, 5),
  }

  const outDir = resolve(__dirname, "../results")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, "full-app.json"), JSON.stringify(result, null, 2) + "\n")
  writeFileSync(
    resolve(outDir, "full-app.md"),
    [
      "# Full-app churn (Scenario D/E, #6340)",
      "",
      `Opened+closed ${TABS_PER_ROUND} REST tabs per round, ${ROUNDS} measured rounds (post-GC retained heap, CDP).`,
      "",
      `- driver self-check (open 3 / close 3): ${JSON.stringify(check)}`,
      `- retained per round (MB): ${samples.join(", ")}`,
      `- start ${result.startMB} MB -> end ${result.endMB} MB (delta ${result.deltaMB} MB)`,
      `- leak slope: ${result.slopeMB_per_round} MB/round`,
      `- idle 8s: ${result.idle.startMB} MB -> ${result.idle.endMB} MB`,
      "",
      slope < 0.5
        ? "Verdict: FLAT — no tab-churn leak detected in the renderer for this path."
        : "Verdict: GROWING — retained heap ratchets up with rounds (candidate #6340 leak).",
      "",
    ].join("\n") + "\n"
  )

  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error("CHURN HARNESS FAILED:", e)
  process.exit(1)
})
