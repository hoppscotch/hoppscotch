import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { hoppInsomniaImporter } from "../insomnia/insomniaColl"
import {
  insomniaEnvImporter,
  replaceInsomniaTemplating,
} from "../insomnia/insomniaEnv"

describe("replaceInsomniaTemplating", () => {
  it("replaces Insomnia template expressions with Hoppscotch variables", () => {
    expect(replaceInsomniaTemplating("{{ _.baseUrl }}/api")).toBe("<<baseUrl>>/api")
  })

  it("handles non-string expressions safely without throwing replaceAll error", () => {
    expect(replaceInsomniaTemplating(12345 as any)).toBe("12345")
    expect(replaceInsomniaTemplating(true as any)).toBe("true")
    expect(replaceInsomniaTemplating(null as any)).toBe("")
    expect(replaceInsomniaTemplating(undefined as any)).toBe("")
  })
})

describe("hoppInsomniaImporter - Insomnia v5 Export with non-string environment values", () => {
  it("successfully imports an Insomnia v5 collection containing numbers and booleans in environment", async () => {
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
        ])
      )
    }
  })
})

describe("insomniaEnvImporter - Insomnia environment resources", () => {
  it("imports environment resources containing number and boolean values", async () => {
    const insomniaEnvDoc = {
      resources: [
        {
          _type: "environment",
          name: "Dev Environment",
          data: {
            port: 3000,
            debug: true,
            apiUrl: "http://localhost:3000",
          },
        },
      ],
    }

    const result = await insomniaEnvImporter([JSON.stringify(insomniaEnvDoc)])()

    expect(E.isRight(result)).toBe(true)
    if (E.isRight(result)) {
      const [env] = result.right
      expect(env.name).toBe("Dev Environment")
      expect(env.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "port", initialValue: "3000" }),
          expect.objectContaining({ key: "debug", initialValue: "true" }),
          expect.objectContaining({
            key: "apiUrl",
            initialValue: "http://localhost:3000",
          }),
        ])
      )
    }
  })
})
