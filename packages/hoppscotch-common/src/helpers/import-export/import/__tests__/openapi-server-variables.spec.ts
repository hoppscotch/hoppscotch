import { describe, expect, test } from "vitest"
import { OpenAPIV2, OpenAPIV3 } from "openapi-types"
import { extractServerVariables, parseOpenAPIUrl } from "../openapi"

describe("extractServerVariables", () => {
  describe("OpenAPI V3", () => {
    test("extracts server variables with default values", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://{environment}.example.com/v{version}",
            variables: {
              environment: {
                default: "production",
                enum: ["production", "staging", "development"],
              },
              version: {
                default: "2",
              },
            },
          },
        ],
      }

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "environment",
          initialValue: "production",
          currentValue: "production",
          secret: false,
        },
        {
          key: "version",
          initialValue: "2",
          currentValue: "2",
          secret: false,
        },
      ])
    })

    test("returns empty array when no server variables are defined", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://api.example.com",
          },
        ],
      }

      const result = extractServerVariables(doc)
      expect(result).toEqual([])
    })

    test("returns empty array when servers is empty", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [],
      }

      const result = extractServerVariables(doc)
      expect(result).toEqual([])
    })

    test("returns empty array when server URL is './'", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "./",
            variables: {
              unused: { default: "val" },
            },
          },
        ],
      }

      const result = extractServerVariables(doc)
      expect(result).toEqual([])
    })

    test("uses only the first server entry", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://{env}.example.com",
            variables: {
              env: { default: "prod" },
            },
          },
          {
            url: "https://{env}.other.com",
            variables: {
              env: { default: "staging" },
            },
          },
        ],
      }

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "env",
          initialValue: "prod",
          currentValue: "prod",
          secret: false,
        },
      ])
    })

    test("handles single server variable", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://api.example.com/{basePath}",
            variables: {
              basePath: { default: "v1" },
            },
          },
        ],
      }

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "basePath",
          initialValue: "v1",
          currentValue: "v1",
          secret: false,
        },
      ])
    })

    test("filters out variables not referenced in the server URL", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://{env}.example.com",
            variables: {
              env: { default: "prod" },
              orphaned: { default: "unused" },
            },
          },
        ],
      }

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "env",
          initialValue: "prod",
          currentValue: "prod",
          secret: false,
        },
      ])
    })

    test("coerces non-string default values to strings", () => {
      const doc = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://api.example.com/{port}",
            variables: {
              port: { default: 8080 as any },
            },
          },
        ],
      } as OpenAPIV3.Document

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "port",
          initialValue: "8080",
          currentValue: "8080",
          secret: false,
        },
      ])
    })
  })

  describe("OpenAPI V2 (Swagger)", () => {
    test("creates baseUrl variable with scheme, host and basePath", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        host: "api.example.com",
        basePath: "/v1",
        schemes: ["https"],
        paths: {},
      } as OpenAPIV2.Document

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "baseUrl",
          initialValue: "https://api.example.com/v1",
          currentValue: "https://api.example.com/v1",
          secret: false,
        },
      ])
    })

    test("uses first scheme from schemes array", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        host: "api.example.com",
        schemes: ["http", "https"],
        paths: {},
      } as OpenAPIV2.Document

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "baseUrl",
          initialValue: "http://api.example.com",
          currentValue: "http://api.example.com",
          secret: false,
        },
      ])
    })

    test("defaults to https when no schemes defined", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        host: "api.example.com",
        paths: {},
      } as OpenAPIV2.Document

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "baseUrl",
          initialValue: "https://api.example.com",
          currentValue: "https://api.example.com",
          secret: false,
        },
      ])
    })

    test("strips trailing slash from basePath to avoid double-slash", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        host: "api.example.com",
        basePath: "/",
        paths: {},
      } as OpenAPIV2.Document

      const result = extractServerVariables(doc)

      expect(result).toEqual([
        {
          key: "baseUrl",
          initialValue: "https://api.example.com",
          currentValue: "https://api.example.com",
          secret: false,
        },
      ])
    })

    test("returns empty array when no host is defined", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
      } as OpenAPIV2.Document

      const result = extractServerVariables(doc)
      expect(result).toEqual([])
    })
  })

  describe("unknown document format", () => {
    test("returns empty array for unrecognized document", () => {
      const doc = {
        info: { title: "Test", version: "1.0" },
        paths: {},
      } as any

      const result = extractServerVariables(doc)
      expect(result).toEqual([])
    })
  })
})

describe("parseOpenAPIUrl", () => {
  describe("OpenAPI V2 (Swagger)", () => {
    test("uses <<baseUrl>> variable instead of hardcoded host", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        host: "api.example.com",
        basePath: "/v1",
        paths: {},
      } as OpenAPIV2.Document

      expect(parseOpenAPIUrl(doc)).toBe("<<baseUrl>>")
    })

    test("uses <<baseUrl>> variable when host has no basePath", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        host: "api.example.com",
        paths: {},
      } as OpenAPIV2.Document

      expect(parseOpenAPIUrl(doc)).toBe("<<baseUrl>>")
    })

    test("uses <<baseUrl>> placeholder when no host is defined (no variable created)", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
      } as OpenAPIV2.Document

      // parseOpenAPIUrl returns <<baseUrl>> as a user-defined placeholder
      expect(parseOpenAPIUrl(doc)).toBe("<<baseUrl>>")
      // extractServerVariables returns nothing — same behavior as the old literal fallback
      expect(extractServerVariables(doc)).toEqual([])
    })

    test("preserves basePath when host is absent", () => {
      const doc = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0" },
        basePath: "/v1",
        paths: {},
      } as OpenAPIV2.Document

      expect(parseOpenAPIUrl(doc)).toBe("<<baseUrl>>/v1")
      expect(extractServerVariables(doc)).toEqual([])
    })
  })

  describe("OpenAPI V3", () => {
    test("replaces server variable placeholders with <<var>> syntax", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [
          {
            url: "https://{environment}.example.com/v{version}",
            variables: {
              environment: { default: "production" },
              version: { default: "2" },
            },
          },
        ],
      }

      expect(parseOpenAPIUrl(doc)).toBe(
        "https://<<environment>>.example.com/v<<version>>"
      )
    })

    test("returns server URL as-is when no variables are used", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [{ url: "https://api.example.com" }],
      }

      expect(parseOpenAPIUrl(doc)).toBe("https://api.example.com")
    })

    test("falls back to <<baseUrl>> when server URL is './'", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [{ url: "./" }],
      }

      expect(parseOpenAPIUrl(doc)).toBe("<<baseUrl>>")
    })

    test("falls back to <<baseUrl>> when servers array is empty", () => {
      const doc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0" },
        paths: {},
        servers: [],
      }

      expect(parseOpenAPIUrl(doc)).toBe("<<baseUrl>>")
    })
  })
})
