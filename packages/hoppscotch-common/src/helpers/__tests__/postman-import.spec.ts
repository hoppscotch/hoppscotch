import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import {
  hoppPostmanImporter,
  replacePMVarTemplating,
} from "../import-export/import/postman"

const postmanCollectionWithNestedBraces = JSON.stringify({
  info: {
    name: "Nested Braces Body",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Nested JSON body",
      request: {
        method: "POST",
        header: [{ key: "Content-Type", value: "application/json" }],
        body: {
          mode: "raw",
          raw: '{"id":4,"data":{"type":12,"ext":{"required":["align","style"]}}}',
          options: { raw: { language: "json" } },
        },
        url: "{{serviceInternalUrl}}/api/asset",
      },
    },
  ],
})

const postmanCollectionWithArrayHeader = JSON.stringify({
  info: {
    name: "Array Header Import",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Import Array Header",
      request: {
        method: "GET",
        header: [
          {
            key: "Authorization",
            value: ["Basic xxxxx", "Basic xxxxxxxxxxxx="],
          },
          {
            key: "Content-Type",
            value: "application/x-www-form-urlencoded",
          },
        ],
        url: "https://echo.hoppscotch.io/get",
      },
    },
  ],
})

describe("replacePMVarTemplating", () => {
  it("replaces paired {{var}} with <<var>>", () => {
    expect(replacePMVarTemplating("{{baseUrl}}/api")).toBe("<<baseUrl>>/api")
  })

  it("does not corrupt literal }} that are not part of a variable", () => {
    expect(
      replacePMVarTemplating('{"a":{"b":{"c":1}}}')
    ).toBe('{"a":{"b":{"c":1}}}')
  })

  it("replaces variables but leaves standalone }} intact", () => {
    expect(
      replacePMVarTemplating("{{host}}/path?x=1}}")
    ).toBe("<<host>>/path?x=1}}")
  })

  it("handles whitespace inside {{ }}", () => {
    expect(replacePMVarTemplating("{{ myVar }}")).toBe("<<myVar>>")
  })
})

describe("Postman importer", () => {
  it("does not corrupt }} in raw request body (issue #6324)", async () => {
    const result = await hoppPostmanImporter([
      postmanCollectionWithNestedBraces,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    const body = result.right[0].requests[0].body
    expect(body.contentType).toBe("application/json")
    // Body must be byte-identical — no }} → >> corruption
    expect(body.body).toBe(
      '{"id":4,"data":{"type":12,"ext":{"required":["align","style"]}}}'
    )
    // The variable in the URL should still be translated
    expect(result.right[0].requests[0].endpoint).toBe(
      "<<serviceInternalUrl>>/api/asset"
    )
  })

  it("coerces array header values instead of crashing during import", async () => {
    const result = await hoppPostmanImporter([
      postmanCollectionWithArrayHeader,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    expect(result.right[0].requests[0].headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Authorization",
          value: "Basic xxxxx,Basic xxxxxxxxxxxx=",
          active: true,
        }),
        expect.objectContaining({
          key: "Content-Type",
          value: "application/x-www-form-urlencoded",
          active: true,
        }),
      ])
    )
  })
})
