import { getEditorLangForMimeType } from "../editorutils"

describe("getEditorLangForMimeType", () => {
  test("returns 'json' for valid JSON mimes", () => {
    expect(getEditorLangForMimeType("application/json")).toMatch("json")
    expect(getEditorLangForMimeType("application/hal+json")).toMatch("json")
    expect(getEditorLangForMimeType("application/vnd.api+json")).toMatch("json")
  })

  test("returns 'xml' for valid XML mimes", () => {
    expect(getEditorLangForMimeType("application/xml")).toMatch("xml")
  })

  test("returns 'html' for valid HTML mimes", () => {
    expect(getEditorLangForMimeType("text/html")).toMatch("html")
  })

  test("returns 'plain_text' for plain text mime", () => {
    expect(getEditorLangForMimeType("text/plain")).toMatch("plain_text")
  })

  test("returns 'plain_text' for unimplemented mimes", () => {
    expect(getEditorLangForMimeType("image/gif")).toMatch("plain_text")
  })

  test("returns 'plain_text' for null/undefined mimes", () => {
    expect(getEditorLangForMimeType(null)).toMatch("plain_text")
    expect(getEditorLangForMimeType(undefined)).toMatch("plain_text")
  })
})
