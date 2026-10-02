import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { hoppInsomniaImporter } from "../insomnia/insomniaColl"
import {
  insomniaEnvImporter,
  replaceInsomniaTemplating,
  safeStringifyValue,
} from "../insomnia/insomniaEnv"

describe("safeStringifyValue and replaceInsomniaTemplating", () => {
  it("replaces Insomnia template expressions with Hoppscotch variables", () => {
    expect(replaceInsomniaTemplating("{{ _.baseUrl }}/api")).toBe("<<baseUrl>>/api")
  })

  it("handles non-string expressions safely without throwing replaceAll error", () => {
    expect(replaceInsomniaTemplating(12345 as any)).toBe("12345")
    expect(replaceInsomniaTemplating(true as any)).toBe("true")
    expect(replaceInsomniaTemplating(null as any)).toBe("")
    expect(replaceInsomniaTemplating(undefined as any)).toBe("")
  })

  it("preserves nested objects and arrays as valid JSON strings", () => {
    expect(safeStringifyValue({ key: "value", nested: 42 })).toBe(
      JSON.stringify({ key: "value", nested: 42 })
    )
    expect(safeStringifyValue([1, 2, "three"])).toBe(JSON.stringify([1, 2, "three"]))
  })
})

describe("hoppInsomniaImporter - Insomnia v5 Export with complex environment values", () => {
  it("successfully imports an Insomnia v5 collection containing numbers, booleans, nulls, and nested template objects", async () => {
    const insomniaV5Doc = {
      type: "collection.insomnia.rest/5.0",
      name: "Sample V5 Collection",
      meta: {
        description: "Test Collection",
      },
      environments: {
        data: {
          port: 8080,
          enabled: true,
          baseUrl: "https://api.example.com",
          timeout: null,
          config: { retries: 3, endpoint: "{{ _.baseUrl }}/v1" },
        },
      },
      collection: [
        {
          name: "Test Request",
          method: "GET",
          url: "https://api.example.com/users/:userId",
          headers: [],
          parameters: [],
        },
      ],
    }

    const result = await hoppInsomniaImporter([JSON.stringify(insomniaV5Doc)])()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      const [collection] = result.right
      expect(collection.name).toBe("Sample V5 Collection")
      expect(collection.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "port", initialValue: "8080" }),
          expect.objectContaining({ key: "enabled", initialValue: "true" }),
          expect.objectContaining({
            key: "baseUrl",
            initialValue: "https://api.example.com",
          }),
          expect.objectContaining({ key: "timeout", initialValue: "" }),
          expect.objectContaining({
            key: "config",
            initialValue: JSON.stringify({ retries: 3, endpoint: "<<baseUrl>>/v1" }),
          }),
        ])
      )
    }
  })
})

describe("insomniaEnvImporter - Insomnia environment resources with null and object data", () => {
  it("handles environment resources with null data and preserves object values", async () => {
    const insomniaEnvDoc = {
      resources: [
        {
          _type: "environment",
          name: "Dev Environment",
          data: {
            port: 3000,
            debug: true,
            apiUrl: "http://localhost:3000",
            headers: { "X-Custom": "{{ _.customHeader }}" },
          },
        },
        {
          _type: "environment",
          name: "Empty Environment",
          data: null,
        },
      ],
    }

    const result = await insomniaEnvImporter([JSON.stringify(insomniaEnvDoc)])()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      const [devEnv, emptyEnv] = result.right
      expect(devEnv.name).toBe("Dev Environment")
      expect(devEnv.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "port", initialValue: "3000" }),
          expect.objectContaining({ key: "debug", initialValue: "true" }),
          expect.objectContaining({
            key: "apiUrl",
            initialValue: "http://localhost:3000",
          }),
          expect.objectContaining({
            key: "headers",
            initialValue: JSON.stringify({ "X-Custom": "<<customHeader>>" }),
          }),
        ])
      )

      expect(emptyEnv.name).toBe("Empty Environment")
      expect(emptyEnv.variables).toEqual([])
    }
  })
})
