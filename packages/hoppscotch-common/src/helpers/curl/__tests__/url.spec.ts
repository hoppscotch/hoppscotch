import { describe, test, expect } from "vitest"
import { getURLObject } from "../sub_helpers/url"

describe("curl URL parsing - asterisk preservation", () => {
  test("preserves asterisk in query param value", () => {
    const parsedArguments: any = {
      _: ["node", "https://example.com/path?code=14402976*"],
    }

    const urlObj = getURLObject(parsedArguments)

    expect(urlObj.searchParams.get("code")).toBe("14402976*")
  })

  test("preserves asterisks when URL is wrapped in single quotes", () => {
    const parsedArguments: any = {
      _: ["node", "'https://example.com/path?token=*abc*'"],
    }

    const urlObj = getURLObject(parsedArguments)

    expect(urlObj.searchParams.get("token")).toBe("*abc*")
  })
})
