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

  test("returns 'text/x-yaml' for plain text mime", () => {
    expect(getEditorLangForMimeType("text/plain")).toMatch("text/x-yaml")
  })

  test("returns 'text/x-yaml' for unimplemented mimes", () => {
    expect(getEditorLangForMimeType("image/gif")).toMatch("text/x-yaml")
  })

  test("returns 'text/x-yaml' for null/undefined mimes", () => {
    expect(getEditorLangForMimeType(null)).toMatch("text/x-yaml")
    expect(getEditorLangForMimeType(undefined)).toMatch("text/x-yaml")
  })
})
