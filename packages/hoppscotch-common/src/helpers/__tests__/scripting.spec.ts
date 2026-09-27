import { describe, expect, test } from "vitest"

import {
  hasActualScript,
  stripJsonSerializedModulePrefix,
} from "@hoppscotch/js-sandbox/scripting"

describe("hasActualScript", () => {
  test("returns false for null, undefined, or empty input", () => {
    expect(hasActualScript(null)).toBe(false)
    expect(hasActualScript(undefined)).toBe(false)
    expect(hasActualScript("")).toBe(false)
  })

  test("returns false for whitespace-only input", () => {
    expect(hasActualScript("   ")).toBe(false)
    expect(hasActualScript("\n\t  \n")).toBe(false)
  })

  test("returns false when only the Monaco module prefix is present", () => {
    expect(hasActualScript("export {};\n")).toBe(false)
    expect(hasActualScript("export {};")).toBe(false)
    expect(hasActualScript("export {};\n   ")).toBe(false)
  })

  test("returns true when script body exists after the prefix", () => {
    expect(hasActualScript("export {};\nconst x = 1;")).toBe(true)
    expect(hasActualScript("const x = 1;")).toBe(true)
  })
})

describe("stripJsonSerializedModulePrefix", () => {
  test("strips `export {};\\n` from JSON string values", () => {
    const json = JSON.stringify({
      preRequestScript: "export {};\nconst x = 1;",
      testScript: "export {};const y = 2;",
    })
    const out = stripJsonSerializedModulePrefix(json)
    const parsed = JSON.parse(out) as Record<string, string>
    expect(parsed.preRequestScript).toBe("const x = 1;")
    expect(parsed.testScript).toBe("const y = 2;")
  })

  test("leaves values without the prefix untouched", () => {
    const json = JSON.stringify({
      name: "request name",
      preRequestScript: "const z = 3;",
    })
    expect(stripJsonSerializedModulePrefix(json)).toBe(json)
  })

  test("preserves spacing between key delimiter and the stripped value", () => {
    const json = `{"preRequestScript":  "export {};const a = 1;"}`
    const out = stripJsonSerializedModulePrefix(json)
    expect(out).toBe(`{"preRequestScript":  "const a = 1;"}`)
  })

  test("does not strip when the prefix appears mid-value", () => {
    const json = JSON.stringify({
      preRequestScript: "const a = 1;\nexport {};\nconst b = 2;",
    })
    expect(stripJsonSerializedModulePrefix(json)).toBe(json)
  })
})
