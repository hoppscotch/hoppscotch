import { test, expect } from "@playwright/test"

test("basic test", async ({ page }) => {
  await page.goto("http://localhost:3000")

  await expect(page).toHaveTitle(
    "Hoppscotch - Open source API development ecosystem"
  )
})
