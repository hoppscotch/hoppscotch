import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { hoppPostmanImporter } from "../import-export/import/postman"

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

describe("Postman importer", () => {
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

  it("preserves literal }} in request bodies while replacing {{var}}", async () => {
    const postmanCollectionWithLiteralBraces = JSON.stringify({
      info: {
        name: "Literal Braces Import",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [
        {
          name: "Request with literal braces",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json",
              },
            ],
            body: {
              mode: "raw",
              raw: '{"url": "{{host}}", "nested": "{{variable}}text}}", "ext": {"required": ["buttonalign", "buttonstyle"]}}',
              options: {
                raw: {
                  language: "json",
                },
              },
            },
            url: "https://echo.hoppscotch.io/post",
          },
        },
      ],
    })

    const result = await hoppPostmanImporter([
      postmanCollectionWithLiteralBraces,
    ])()

    expect(E.isRight(result)).toBe(true)

    if (E.isLeft(result)) {
      throw new Error("Expected Postman import to succeed")
    }

    expect(result.right[0].requests[0].body.body).toEqual(
      '{"url": "<<host>>", "nested": "<<variable>>text}}", "ext": {"required": ["buttonalign", "buttonstyle"]}}'
    )
  })
})
