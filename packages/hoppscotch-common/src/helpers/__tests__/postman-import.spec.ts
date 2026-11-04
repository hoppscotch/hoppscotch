import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import {
  hoppPostmanImporter,
  replacePMVarTemplating,
} from "../import-export/import/postman"

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

const literalBracesBody =
  '{"id":4,"required":1,"data":{"type":12,"len":32,"ext":{"required":["buttonalign","buttonstyle"],"filesize":"1MB"}}}'

const postmanCollectionWithLiteralBracesBody = JSON.stringify({
  info: {
    name: "Literal Braces Body",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Raw JSON with literal braces",
      request: {
        method: "POST",
        header: [{ key: "Content-Type", value: "application/json" }],
        body: { mode: "raw", raw: literalBracesBody },
        url: "https://echo.hoppscotch.io/post",
      },
    },
  ],
})

const postmanCollectionWithMixedBody = JSON.stringify({
  info: {
    name: "Mixed Variable And Literal Braces Body",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [
    {
      name: "Raw JSON with variable and literal braces",
      request: {
        method: "POST",
        header: [{ key: "Content-Type", value: "application/json" }],
        body: {
          mode: "raw",
          raw: '{"url":"{{serviceInternalUrl}}","data":{"nested":{"k":"v"}}}',
        },
        url: "https://echo.hoppscotch.io/post",
      },
    },
  ],
})

describe("Postman importer", () => {
  describe("replacePMVarTemplating", () => {
    it("converts Postman variable templates to Hoppscotch variable templates", () => {
      expect(replacePMVarTemplating("{{serviceInternalUrl}}")).toBe(
        "<<serviceInternalUrl>>"
      )

      expect(replacePMVarTemplating("{{ serviceInternalUrl }}")).toBe(
        "<<serviceInternalUrl>>"
      )

      expect(
        replacePMVarTemplating(
          "{{serviceInternalUrl}}/api/{{ serviceToken }}"
        )
      ).toBe("<<serviceInternalUrl>>/api/<<serviceToken>>")
    })

    it("leaves literal and empty brace pairs unchanged", () => {
      expect(replacePMVarTemplating("}}")).toBe("}}")
      expect(replacePMVarTemplating('{"nested":{"k":"v"}}}')).toBe(
        '{"nested":{"k":"v"}}}'
      )
      expect(replacePMVarTemplating("{{}}")).toBe("{{}}")
      expect(replacePMVarTemplating("{{   }}")).toBe("{{   }}")
    })
  })

  it("preserves raw JSON bodies containing literal adjacent closing braces", async () => {
    const result = await hoppPostmanImporter([
      postmanCollectionWithLiteralBracesBody,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    expect(result.right[0].requests[0].body.body).toBe(literalBracesBody)
  })

  it("converts real Postman variables while leaving literal braces unchanged", async () => {
    const result = await hoppPostmanImporter([
      postmanCollectionWithMixedBody,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    expect(result.right[0].requests[0].body.body).toBe(
      '{"url":"<<serviceInternalUrl>>","data":{"nested":{"k":"v"}}}'
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
