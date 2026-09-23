/**
 * Full-app boot probe: launches the assembled selfhost-web app (which renders the
 * same hoppscotch-common renderer) in headless Chromium and verifies it actually
 * mounts, capturing console errors, a screenshot, and the initial post-GC JS heap
 * (via CDP Runtime.getHeapUsage + HeapProfiler.collectGarbage).
 *
 * Prereq: the dev server must be running at APP_URL (see memory-bench/full-app/README).
 *   node memory-bench/full-app/probe.mjs
 */
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/"

const MB = 1024 * 1024

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"],
  })
  const page = await browser.newPage()

  const consoleErrors = []
  const pageErrors = []
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text())
  })
  page.on("pageerror", (e) => pageErrors.push(String(e)))

  const client = await page.context().newCDPSession(page)
  await client.send("HeapProfiler.enable")

  const gcAndHeap = async () => {
    await client.send("HeapProfiler.collectGarbage")
    const { usedSize } = await client.send("Runtime.getHeapUsage")
    return usedSize
  }

  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 })
  // Give the SPA time to mount + settle.
  await page.waitForTimeout(6000)

  const diagnostics = await page.evaluate(() => {
    const app = document.querySelector("#app, [id=app], main, body > div")
    return {
      title: document.title,
      url: location.href,
      bodyTextLen: document.body?.innerText?.length ?? 0,
      appChildren: app ? app.childElementCount : 0,
      testIds: document.querySelectorAll("[data-testid]").length,
      buttons: document.querySelectorAll("button").length,
      hasSendBtn: !!document.querySelector(
        '[data-testid="send_button"], button'
      ),
    }
  })

  const heap = await gcAndHeap()

  const shot = resolve(__dirname, "boot.png")
  await page.screenshot({ path: shot, fullPage: false })

  console.log(
    JSON.stringify(
      {
        ok: pageErrors.length === 0 && diagnostics.bodyTextLen > 0,
        diagnostics,
        initialHeapMB: +(heap / MB).toFixed(2),
        consoleErrors: consoleErrors.slice(0, 8),
        pageErrors: pageErrors.slice(0, 8),
        screenshot: shot,
      },
      null,
      2
    )
  )

  await browser.close()
}

main().catch((e) => {
  console.error("PROBE FAILED:", e)
  process.exit(1)
})
