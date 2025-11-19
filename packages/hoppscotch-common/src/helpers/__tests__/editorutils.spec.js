import { describe, expect, test } from "vitest"
import { getEditorLangForMimeType } from "../editorutils"
import { INTUIT_GRAPHQL_CONTENT_TYPE } from "../constants"

describe("getEditorLangForMimeType", () => {
  test("returns 'json' for valid JSON mimes", () => {
    expect(getEditorLangForMimeType("application/json")).toMatch("json")
    expect(getEditorLangForMimeType("application/hal+json")).toMatch("json")
    expect(getEditorLangForMimeType("application/vnd.api+json")).toMatch("json")
    expect(getEditorLangForMimeType(INTUIT_GRAPHQL_CONTENT_TYPE)).toMatch(
      "json"
    )
  })

  test("returns 'xml' for valid XML mimes", () => {
    expect(getEditorLangForMimeType("application/xml")).toMatch("xml")
  })

  test("returns 'html' for valid HTML mimes", () => {
    expect(getEditorLangForMimeType("text/html")).toMatch("html")
  })

  test("returns null for plain text mime", () => {
    expect(getEditorLangForMimeType("text/plain")).toBeNull()
  })

  test("returns null for unimplemented mimes", () => {
    expect(getEditorLangForMimeType("image/gif")).toBeNull()
  })

  test("returns null for null/undefined mimes", () => {
    expect(getEditorLangForMimeType(null)).toBeNull()
    expect(getEditorLangForMimeType(undefined)).toBeNull()
  })
})
