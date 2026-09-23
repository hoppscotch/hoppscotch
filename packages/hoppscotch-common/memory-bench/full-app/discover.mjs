import { chromium } from "playwright"
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/"
const browser = await chromium.launch({ headless: true, args: ["--js-flags=--expose-gc"] })
const page = await browser.newPage()
await page.goto(APP_URL, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(5000)
const info = await page.evaluate(() => {
  const out = { testIds: [], labelledButtons: [], tabish: [] }
  for (const el of document.querySelectorAll("[data-testid]"))
    out.testIds.push(el.getAttribute("data-testid"))
  for (const b of document.querySelectorAll("button")) {
    const label = b.getAttribute("aria-label") || b.getAttribute("title") || b.textContent?.trim().slice(0, 24) || ""
    if (label) out.labelledButtons.push(label)
    const cls = b.className?.toString() || ""
    if (/tab|add|new|close/i.test(label + " " + cls)) out.tabish.push({ label, cls: cls.slice(0, 60) })
  }
  return out
})
console.log(JSON.stringify({
  testIds: [...new Set(info.testIds)],
  labelledButtons: [...new Set(info.labelledButtons)].slice(0, 40),
  tabish: info.tabish.slice(0, 20),
}, null, 2))
await browser.close()
