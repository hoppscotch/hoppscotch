import { describe, expect, it } from "vitest"
import * as E from "fp-ts/Either"

import { insomniaEnvImporter, replaceInsomniaTemplating } from "../insomniaEnv"
import { hoppInsomniaImporter, replacePathVarTemplating } from "../insomniaColl"

describe("insomnia import templating", () => {
  it("coerces non-string templating inputs instead of crashing (#6606)", () => {
    expect(replaceInsomniaTemplating("{{ _.host }}:3000")).toBe("<<host>>:3000")
    expect(replaceInsomniaTemplating(123)).toBe("123")
    expect(replaceInsomniaTemplating(true)).toBe("true")
    expect(replaceInsomniaTemplating(undefined)).toBe("")
  })

  it("templates path-segment variables but leaves port numbers alone", () => {
    expect(replacePathVarTemplating("/api/v1/:id")).toBe("/api/v1/<<id>>")
    expect(replacePathVarTemplating("http://localhost:3000/api")).toBe(
      "http://localhost:3000/api"
    )
    expect(
      replacePathVarTemplating("https://api.example.com:8443/v1/:userId")
    ).toBe("https://api.example.com:8443/v1/<<userId>>")
  })

  it('preserves JSON null env values as the literal string "null"', async () => {
    const contents = [
      JSON.stringify({
        resources: [
          {
            _type: "environment",
            name: "test-env",
            data: { a: null, b: 123, c: true, d: "plain" },
          },
        ],
      }),
    ]

    const result = await insomniaEnvImporter(contents)()

    if (!E.isRight(result)) {
      throw new Error("expected the import to succeed")
    }

    const variables = result.right[0].variables
    const initialValues = Object.fromEntries(
      variables.map((v) => [v.key, v.initialValue])
    )

    expect(initialValues).toEqual({
      a: "null",
      b: "123",
      c: "true",
      d: "plain",
    })
  })

  it('preserves null v5 collection and folder env values as the literal string "null"', async () => {
    const contents = [
      JSON.stringify({
        _type: "export",
        __export_format: 5,
        type: "collection.insomnia.rest/5.0.1",
        name: "test-collection",
        meta: { id: "w_1", created: 1, modified: 1, description: null },
        environments: { data: { a: null, b: 123, c: true, d: "plain" } },
        collection: [
          {
            name: "folder",
            meta: { id: "f_1", created: 1, modified: 1, description: null },
            children: [],
            environment: { f: null, g: false },
          },
        ],
      }),
    ]

    const result = await hoppInsomniaImporter(contents)()

    if (!E.isRight(result)) {
      throw new Error("expected the import to succeed")
    }

    const [collection] = result.right
    const collectionValues = Object.fromEntries(
      collection.variables.map((v) => [v.key, v.initialValue])
    )
    expect(collectionValues).toEqual({
      a: "null",
      b: "123",
      c: "true",
      d: "plain",
    })

    const folderValues = Object.fromEntries(
      collection.folders[0].variables.map((v) => [v.key, v.initialValue])
    )
    expect(folderValues).toEqual({ f: "null", g: "false" })
  })
})
