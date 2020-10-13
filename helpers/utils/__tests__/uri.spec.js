import { parseUrlAndPath } from "../uri"

describe("parseUrlAndPath", () => {
  test("has url and path fields", () => {
    const result = parseUrlAndPath("https://hoppscotch.io/")

    expect(result).toHaveProperty("url")
    expect(result).toHaveProperty("path")
  })

  test("parses out URL correctly", () => {
    const result = parseUrlAndPath("https://hoppscotch.io/test/page")

    expect(result.url).toBe("https://hoppscotch.io")
  })
  test("parses out Path correctly", () => {
    const result = parseUrlAndPath("https://hoppscotch.io/test/page")

    expect(result.path).toBe("/test/page")
  })
})
