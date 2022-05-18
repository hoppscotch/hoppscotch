import { expect, test } from "@playwright/test"

test("send a request with params", async ({ page }) => {
  await page.goto("http://localhost:3000/")

  await page.fill(
    "[data-test-id=request-url-input] [contenteditable]",
    "https://echo.hoppscotch.io"
  )

  await page.locator("[data-test-id=http-params]").click()

  await page.fill(
    "[data-test-id=http-param-0] [contenteditable]",
    "sampleParam"
  )
  await page.fill(
    "[data-test-id=http-param-value-0] [contenteditable]",
    "sampleValue"
  )

  const [res] = await Promise.all([
    page.waitForResponse("https://echo.hoppscotch.io/*"),
    page.locator("[data-test-id=send-request-button]").click(),
  ])

  expect(await res.json()).toMatchObject(
    expect.objectContaining({
      args: { sampleParam: "sampleValue" },
    })
  )
})
