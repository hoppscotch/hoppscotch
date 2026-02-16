import { describe, expect, test } from "vitest"
import {
  knownContentTypes,
  ValidContentTypesList,
} from "../content-types"

describe("content-types", () => {
  describe("knownContentTypes", () => {
    test("maps JSON content types to 'json'", () => {
      expect(knownContentTypes["application/json"]).toBe("json")
      expect(knownContentTypes["application/ld+json"]).toBe("json")
      expect(knownContentTypes["application/hal+json"]).toBe("json")
      expect(knownContentTypes["application/vnd.api+json"]).toBe("json")
    })

    test("maps XML content types to 'xml'", () => {
      expect(knownContentTypes["application/xml"]).toBe("xml")
      expect(knownContentTypes["text/xml"]).toBe("xml")
    })

    test("maps form content types to 'multipart'", () => {
      expect(knownContentTypes["application/x-www-form-urlencoded"]).toBe(
        "multipart"
      )
      expect(knownContentTypes["multipart/form-data"]).toBe("multipart")
    })

    test("maps binary content type correctly", () => {
      expect(knownContentTypes["application/octet-stream"]).toBe("binary")
    })

    test("maps text content types correctly", () => {
      expect(knownContentTypes["text/html"]).toBe("html")
      expect(knownContentTypes["text/plain"]).toBe("plain")
    })
  })

  describe("ValidContentTypesList", () => {
    test("contains all known content type keys", () => {
      const expectedKeys = Object.keys(knownContentTypes)
      expect(ValidContentTypesList).toEqual(expectedKeys)
    })

    test("has the correct number of entries", () => {
      expect(ValidContentTypesList.length).toBe(
        Object.keys(knownContentTypes).length
      )
    })

    test("each entry is a valid content type string", () => {
      for (const ct of ValidContentTypesList) {
        expect(ct).toMatch(/^(application|text|multipart)\//)
      }
    })
  })
})
