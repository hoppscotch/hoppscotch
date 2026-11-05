import { afterEach, describe, expect, test, vi } from "vitest"
import { getDefaultProxyUrl, getEnvProxyUrl } from "../proxyUrl"

describe("getDefaultProxyUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test("uses a valid deployment proxy URL before the platform default", async () => {
    vi.stubEnv("VITE_PROXY_APP_URL", "https://proxy.example.com/")

    await expect(getDefaultProxyUrl()).resolves.toBe(
      "https://proxy.example.com/"
    )
  })

  test("ignores an invalid deployment proxy URL", () => {
    vi.stubEnv("VITE_PROXY_APP_URL", "javascript:alert(1)")

    expect(getEnvProxyUrl()).toBeNull()
  })
})
