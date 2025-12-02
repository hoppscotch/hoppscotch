import { describe, expect, test } from "vitest"
import { getEditorLangForMimeType } from "../editorutils"

describe("getEditorLangForMimeType", () => {
  test("returns 'json' for valid JSON mimes", () => {
    expect(getEditorLangForMimeType("application/json")).toMatch("json")
    expect(getEditorLangForMimeType("application/hal+json")).toMatch("json")
    expect(getEditorLangForMimeType("application/vnd.api+json")).toMatch("json")
  })

  test("returns 'xml' for valid XML mimes", () => {
    expect(getEditorLangForMimeType("application/xml")).toMatch("xml")
    expect(getEditorLangForMimeType("text/xml")).toMatch("xml")
  })

  test("returns 'html' for valid HTML mimes", () => {
    expect(getEditorLangForMimeType("text/html")).toMatch("html")
  })

  test("returns text/plain for plain text mime", () => {
    expect(getEditorLangForMimeType("text/plain")).toBe("text/plain")
  })

  test("returns text/plain for unimplemented mimes", () => {
    expect(getEditorLangForMimeType("image/gif")).toBe("text/plain")
  })

  test("returns text/plain for null/undefined mimes", () => {
    expect(getEditorLangForMimeType(null)).toBe("text/plain")
    expect(getEditorLangForMimeType(undefined)).toBe("text/plain")
  })
})
