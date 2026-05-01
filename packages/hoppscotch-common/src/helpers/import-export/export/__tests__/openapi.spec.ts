import { describe, expect, it } from "vitest"
import {
  makeRESTRequest,
  getDefaultRESTRequest,
  makeCollection,
  makeHoppRESTResponseOriginalRequest,
  HoppCollection,
  HoppRESTRequest,
  HoppRESTRequestResponse,
} from "@hoppscotch/data"
import { OpenAPI } from "openapi-types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { hoppCollectionToOpenAPI } from "../openapi"
import {
  convertOpenApiDocsToHopp,
  splitTagSegments,
  hasSharedTagPathPrefix,
  pickRequestFolderSegments,
} from "../../import/openapi"

function buildCollection(
  overrides: Partial<Parameters<typeof makeCollection>[0]> = {}
) {
  return makeCollection({
    name: "Test Collection",
    requests: [],
    folders: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
    ...overrides,
  } as Parameters<typeof makeCollection>[0])
}

function buildRequest(
  overrides: Partial<Parameters<typeof makeRESTRequest>[0]> = {}
) {
  const base = getDefaultRESTRequest()
  return makeRESTRequest({
    ...base,
    ...overrides,
  } as Parameters<typeof makeRESTRequest>[0])
}

describe("hoppCollectionToOpenAPI", () => {
  it("produces a valid OpenAPI 3.1.0 document structure", () => {
    const collection = buildCollection({ name: "My API" })
    const { doc } = hoppCollectionToOpenAPI(collection)

    expect(doc.openapi).toBe("3.1.0")
    expect(doc.info.title).toBe("My API")
    expect(doc.info.version).toBe("1.0.0")
    expect(doc.paths).toBeDefined()
  })

  it("includes collection description in info", () => {
    const collection = buildCollection({
      name: "My API",
      description: "A test API",
    })
    const { doc } = hoppCollectionToOpenAPI(collection)

    expect(doc.info.description).toBe("A test API")
  })

  it("omits description when null", () => {
    const collection = buildCollection({ description: null })
    const { doc } = hoppCollectionToOpenAPI(collection)

    expect(doc.info.description).toBeUndefined()
  })

  describe("requests and paths", () => {
    it("converts a root-level GET request", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get Users",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/users"]).toBeDefined()
      expect(doc.paths!["/users"]!.get).toBeDefined()
      expect(doc.paths!["/users"]!.get!.summary).toBe("Get Users")
      expect(doc.paths!["/users"]!.get!.operationId).toBe("Get_Users")
    })

    it("extracts server URL from endpoint", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get Users",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.servers).toEqual([{ url: "https://api.example.com" }])
    })

    it("deduplicates server URLs", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get Users",
            endpoint: "https://api.example.com/users",
          }),
          buildRequest({
            name: "Get Posts",
            endpoint: "https://api.example.com/posts",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.servers).toHaveLength(1)
    })

    it("handles relative paths (no server)", () => {
      const collection = buildCollection({
        requests: [buildRequest({ name: "Test", endpoint: "/api/test" })],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.servers).toBeUndefined()
      expect(doc.paths!["/api/test"]).toBeDefined()
    })

    it("converts template variables <<var>> to {var}", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get User",
            endpoint: "https://api.example.com/users/<<id>>",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/users/{id}"]).toBeDefined()
    })

    it("auto-generates path params for template variables without requestVariables", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get User",
            endpoint: "https://api.example.com/users/<<id>>/posts/<<postId>>",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/users/{id}/posts/{postId}"]!.get!
        .parameters as any[]

      const pathParams = params.filter((p: any) => p.in === "path")
      expect(pathParams).toHaveLength(2)
      expect(pathParams).toContainEqual(
        expect.objectContaining({ name: "id", in: "path", required: true })
      )
      expect(pathParams).toContainEqual(
        expect.objectContaining({ name: "postId", in: "path", required: true })
      )
    })

    it("does not duplicate path params already defined in requestVariables", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get User",
            endpoint: "https://api.example.com/users/<<id>>",
            requestVariables: [{ key: "id", value: "123", active: true }],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/users/{id}"]!.get!.parameters as any[]

      const pathParams = params.filter((p: any) => p.in === "path")
      expect(pathParams).toHaveLength(1)
      expect(pathParams[0].example).toBe("123")
    })

    it("deduplicates operationIds for requests with the same name", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get Users",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
          buildRequest({
            name: "Get Users",
            method: "POST",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/users"]!.get!.operationId).toBe("Get_Users")
      expect(doc.paths!["/users"]!.post!.operationId).toBe("Get_Users_2")
    })

    it("falls back to method_path operationId when name is all special characters", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "!!!",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/users"]!.get!.operationId).toBe("get_users")
    })

    it("maps multiple HTTP methods to the same path", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get Users",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
          buildRequest({
            name: "Create User",
            method: "POST",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/users"]!.get).toBeDefined()
      expect(doc.paths!["/users"]!.post).toBeDefined()
    })

    it("includes request description when present", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get Users",
            endpoint: "https://api.example.com/users",
            description: "Fetches all users",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/users"]!.get!.description).toBe("Fetches all users")
    })
  })

  describe("parameters", () => {
    it("converts active query params", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Search",
            endpoint: "https://api.example.com/search",
            params: [
              { key: "q", value: "test", active: true, description: "" },
              {
                key: "inactive",
                value: "skip",
                active: false,
                description: "",
              },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/search"]!.get!.parameters as any[]

      expect(params).toHaveLength(1)
      expect(params[0]).toMatchObject({
        name: "q",
        in: "query",
        example: "test",
      })
    })

    it("converts active headers", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            headers: [
              { key: "X-Custom", value: "val", active: true, description: "" },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/test"]!.get!.parameters as any[]

      expect(params).toHaveLength(1)
      expect(params[0]).toMatchObject({
        name: "X-Custom",
        in: "header",
        example: "val",
      })
    })

    it("converts path variables as required", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get User",
            endpoint: "https://api.example.com/users/<<id>>",
            requestVariables: [{ key: "id", value: "123", active: true }],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/users/{id}"]!.get!.parameters as any[]

      const pathParam = params.find((p: any) => p.in === "path")
      expect(pathParam).toMatchObject({
        name: "id",
        in: "path",
        required: true,
        example: "123",
      })
    })

    it("omits parameters when none are active", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            params: [
              { key: "skip", value: "me", active: false, description: "" },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/test"]!.get!.parameters).toBeUndefined()
    })
  })

  describe("request body", () => {
    it("converts JSON body with parsed example", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Create User",
            method: "POST",
            endpoint: "https://api.example.com/users",
            body: {
              contentType: "application/json",
              body: '{"name":"John"}',
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const reqBody = doc.paths!["/users"]!.post!.requestBody as any

      expect(reqBody.content["application/json"].example).toEqual({
        name: "John",
      })
    })

    it("handles invalid JSON body gracefully", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            method: "POST",
            endpoint: "https://api.example.com/test",
            body: {
              contentType: "application/json",
              body: "not json",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const reqBody = doc.paths!["/test"]!.post!.requestBody as any

      expect(reqBody.content["application/json"].example).toBe("not json")
    })

    it("converts multipart/form-data body", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Upload",
            method: "POST",
            endpoint: "https://api.example.com/upload",
            body: {
              contentType: "multipart/form-data",
              body: [
                {
                  key: "file",
                  value: "",
                  active: true,
                  isFile: true,
                },
                {
                  key: "name",
                  value: "test",
                  active: true,
                  isFile: false,
                },
                {
                  key: "inactive",
                  value: "skip",
                  active: false,
                  isFile: false,
                },
              ],
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const schema = (doc.paths!["/upload"]!.post!.requestBody as any).content[
        "multipart/form-data"
      ].schema

      expect(schema.properties.file).toEqual({
        type: "string",
        format: "binary",
      })
      expect(schema.properties.name).toEqual({
        type: "string",
        example: "test",
      })
      expect(schema.properties.inactive).toBeUndefined()
    })

    it("converts form-urlencoded body", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Login",
            method: "POST",
            endpoint: "https://api.example.com/login",
            body: {
              contentType: "application/x-www-form-urlencoded",
              body: "username=admin&password=secret",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const schema = (doc.paths!["/login"]!.post!.requestBody as any).content[
        "application/x-www-form-urlencoded"
      ].schema

      expect(schema.properties.username).toEqual({
        type: "string",
        example: "admin",
      })
      expect(schema.properties.password).toEqual({
        type: "string",
        example: "secret",
      })
    })

    it("converts plain text body", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Send Text",
            method: "POST",
            endpoint: "https://api.example.com/text",
            body: { contentType: "text/plain", body: "Hello world" },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const reqBody = doc.paths!["/text"]!.post!.requestBody as any

      expect(reqBody.content["text/plain"].example).toBe("Hello world")
    })

    it("omits requestBody when contentType is null", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get",
            endpoint: "https://api.example.com/test",
            body: { contentType: null, body: null },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/test"]!.get!.requestBody).toBeUndefined()
    })
  })

  describe("authentication", () => {
    it("converts basic auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "basic",
              authActive: true,
              username: "user",
              password: "pass",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.basicAuth).toEqual({
        type: "http",
        scheme: "basic",
      })
      expect(doc.paths!["/test"]!.get!.security).toEqual([{ basicAuth: [] }])
    })

    it("converts bearer auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "bearer",
              authActive: true,
              token: "abc123",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.bearerAuth).toEqual({
        type: "http",
        scheme: "bearer",
      })
    })

    it("converts OAuth2 authorization code flow", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "AUTHORIZATION_CODE",
                authEndpoint: "https://auth.example.com/authorize",
                tokenEndpoint: "https://auth.example.com/token",
                clientID: "client123",
                clientSecret: "secret",
                scopes: "read write",
                isPKCE: false,
                codeVerifierMethod: "S256",
                token: "",
              },
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      expect(scheme.type).toBe("oauth2")
      expect(scheme.flows.authorizationCode).toEqual({
        authorizationUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        scopes: { read: "", write: "" },
      })
    })

    it("converts OAuth2 client credentials flow", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "CLIENT_CREDENTIALS",
                authEndpoint: "https://auth.example.com/token",
                clientID: "client123",
                clientSecret: "secret",
                scopes: "admin",
                token: "",
              },
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      expect(scheme.flows.clientCredentials).toEqual({
        tokenUrl: "https://auth.example.com/token",
        scopes: { admin: "" },
      })
    })

    it("converts OAuth2 password flow", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "PASSWORD",
                authEndpoint: "https://auth.example.com/token",
                clientID: "client123",
                clientSecret: "secret",
                username: "user",
                password: "pass",
                scopes: "",
                token: "",
              },
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      expect(scheme.flows.password).toEqual({
        tokenUrl: "https://auth.example.com/token",
        scopes: {},
      })
    })

    it("converts OAuth2 implicit flow", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "IMPLICIT",
                authEndpoint: "https://auth.example.com/authorize",
                clientID: "client123",
                scopes: "profile email",
                token: "",
              },
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      expect(scheme.flows.implicit).toEqual({
        authorizationUrl: "https://auth.example.com/authorize",
        scopes: { profile: "", email: "" },
      })
      expect(doc.paths!["/test"]!.get!.security).toEqual([
        { oauth2: ["profile", "email"] },
      ])
    })

    it("merges OAuth2 flows across requests with different grant types", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Auth Code Request",
            endpoint: "https://api.example.com/a",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "AUTHORIZATION_CODE",
                authEndpoint: "https://auth.example.com/authorize",
                tokenEndpoint: "https://auth.example.com/token",
                clientID: "c",
                clientSecret: "s",
                scopes: "read",
                isPKCE: false,
                codeVerifierMethod: "S256",
                token: "",
              },
            } as any,
          }),
          buildRequest({
            name: "Client Credentials Request",
            endpoint: "https://api.example.com/b",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "CLIENT_CREDENTIALS",
                authEndpoint: "https://auth.example.com/token",
                clientID: "c",
                clientSecret: "s",
                scopes: "admin",
                token: "",
              },
            } as any,
          }),
        ],
      })
      const { doc, warnings } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      expect(scheme.flows.authorizationCode).toEqual({
        authorizationUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        scopes: { read: "" },
      })
      expect(scheme.flows.clientCredentials).toEqual({
        tokenUrl: "https://auth.example.com/token",
        scopes: { admin: "" },
      })
      expect(doc.paths!["/a"]!.get!.security).toEqual([{ oauth2: ["read"] }])
      expect(doc.paths!["/b"]!.get!.security).toEqual([{ oauth2: ["admin"] }])
      expect(warnings).not.toContain("export.openapi_auth_limited_detail")
    })

    it("unions OAuth2 scopes across requests sharing a grant type and endpoints", () => {
      const grantInfo = {
        grantType: "AUTHORIZATION_CODE" as const,
        authEndpoint: "https://auth.example.com/authorize",
        tokenEndpoint: "https://auth.example.com/token",
        clientID: "c",
        clientSecret: "s",
        isPKCE: false,
        codeVerifierMethod: "S256" as const,
        token: "",
      }
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Read",
            endpoint: "https://api.example.com/read",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: { ...grantInfo, scopes: "read:users" },
            } as any,
          }),
          buildRequest({
            name: "Write",
            endpoint: "https://api.example.com/write",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: { ...grantInfo, scopes: "write:users" },
            } as any,
          }),
        ],
      })
      const { doc, warnings } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      expect(scheme.flows.authorizationCode.scopes).toEqual({
        "read:users": "",
        "write:users": "",
      })
      expect(doc.paths!["/read"]!.get!.security).toEqual([
        { oauth2: ["read:users"] },
      ])
      expect(doc.paths!["/write"]!.get!.security).toEqual([
        { oauth2: ["write:users"] },
      ])
      expect(warnings).not.toContain("export.openapi_auth_limited_detail")
    })

    it("flags OAuth2 endpoint conflicts within a shared grant type as lossy", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Service A",
            endpoint: "https://a.example.com/a-resource",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "AUTHORIZATION_CODE",
                authEndpoint: "https://a.example.com/authorize",
                tokenEndpoint: "https://a.example.com/token",
                clientID: "c",
                clientSecret: "s",
                scopes: "read",
                isPKCE: false,
                codeVerifierMethod: "S256",
                token: "",
              },
            } as any,
          }),
          buildRequest({
            name: "Service B",
            endpoint: "https://b.example.com/b-resource",
            auth: {
              authType: "oauth-2",
              authActive: true,
              addTo: "HEADERS",
              grantTypeInfo: {
                grantType: "AUTHORIZATION_CODE",
                authEndpoint: "https://b.example.com/authorize",
                tokenEndpoint: "https://b.example.com/token",
                clientID: "c",
                clientSecret: "s",
                scopes: "read",
                isPKCE: false,
                codeVerifierMethod: "S256",
                token: "",
              },
            } as any,
          }),
        ],
      })
      const { doc, warnings } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes!.oauth2 as any

      // Earlier endpoints win; later conflicting endpoints drop but get flagged.
      expect(scheme.flows.authorizationCode.authorizationUrl).toBe(
        "https://a.example.com/authorize"
      )
      expect(scheme.flows.authorizationCode.tokenUrl).toBe(
        "https://a.example.com/token"
      )
      expect(warnings).toContain("export.openapi_auth_limited_detail")
    })

    it("converts API key auth in header", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "api-key",
              authActive: true,
              key: "X-API-Key",
              value: "secret",
              addTo: "HEADERS",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes![
        "apiKey_header_X-API-Key"
      ] as any

      expect(scheme).toEqual({
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      })
    })

    it("converts API key auth in query params", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "api-key",
              authActive: true,
              key: "api_key",
              value: "secret",
              addTo: "QUERY_PARAMS",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const scheme = doc.components!.securitySchemes![
        "apiKey_query_api_key"
      ] as any

      expect(scheme).toEqual({
        type: "apiKey",
        in: "query",
        name: "api_key",
      })
    })

    it("converts JWT auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "jwt",
              authActive: true,
              secret: "s3cret",
              privateKey: "",
              algorithm: "HS256",
              payload: "{}",
              addTo: "HEADERS",
              headerPrefix: "Bearer",
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.jwtAuth).toEqual({
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      })
      expect(doc.paths!["/test"]!.get!.security).toEqual([{ jwtAuth: [] }])
    })

    it("converts digest auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "digest",
              authActive: true,
              username: "user",
              password: "pass",
              realm: "",
              nonce: "",
              algorithm: "MD5",
              qop: "auth",
              nc: "",
              cnonce: "",
              opaque: "",
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.digestAuth).toEqual({
        type: "http",
        scheme: "digest",
      })
    })

    it("converts AWS Signature auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "aws-signature",
              authActive: true,
              accessKey: "AKIA...",
              secretKey: "secret",
              region: "us-east-1",
              serviceName: "s3",
              addTo: "HEADERS",
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.awsSigV4).toEqual({
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "AWS Signature Version 4",
      })
    })

    it("converts HAWK auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "hawk",
              authActive: true,
              authId: "id123",
              authKey: "key456",
              algorithm: "sha256",
              includePayloadHash: false,
              timestamp: "",
              nonce: "",
              ext: "",
              app: "",
              dlg: "",
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.hawkAuth).toEqual({
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Hawk authentication",
      })
    })

    it("converts Akamai EdgeGrid auth", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "akamai-eg",
              authActive: true,
              accessToken: "token",
              clientToken: "client",
              clientSecret: "secret",
              baseURL: "",
              timestamp: "",
              nonce: "",
              headersToSign: "",
              maxBodySize: 131072,
            } as any,
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components!.securitySchemes!.akamaiEdgeGrid).toEqual({
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Akamai EdgeGrid authentication",
      })
    })

    it("skips auth when authActive is false", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "basic",
              authActive: false,
              username: "user",
              password: "pass",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.components).toBeUndefined()
      expect(doc.paths!["/test"]!.get!.security).toBeUndefined()
    })

    it("exports collection-level auth as global security", () => {
      const collection = buildCollection({
        auth: {
          authType: "basic",
          authActive: true,
          username: "user",
          password: "pass",
        },
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.security).toEqual([{ basicAuth: [] }])
      expect(doc.components!.securitySchemes!.basicAuth).toEqual({
        type: "http",
        scheme: "basic",
      })
    })

    it("skips global security for inherit/none collection auth", () => {
      const collection = buildCollection({
        auth: { authType: "inherit", authActive: true },
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.security).toBeUndefined()
    })

    it("sets security to empty array when authType is none and authActive is true", () => {
      const collection = buildCollection({
        auth: {
          authType: "basic",
          authActive: true,
          username: "u",
          password: "p",
        },
        requests: [
          buildRequest({
            name: "Public",
            endpoint: "https://api.example.com/health",
            auth: { authType: "none", authActive: true },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.security).toEqual([{ basicAuth: [] }])
      expect(doc.paths!["/health"]!.get!.security).toEqual([])
    })
  })

  describe("collection-level headers", () => {
    it("includes collection-level headers in operation parameters", () => {
      const collection = buildCollection({
        headers: [
          {
            key: "X-Global",
            value: "global-val",
            active: true,
            description: "",
          },
        ],
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/test"]!.get!.parameters as any[]

      expect(params).toContainEqual(
        expect.objectContaining({
          name: "X-Global",
          in: "header",
          example: "global-val",
        })
      )
    })

    it("request headers override collection headers (case-insensitive)", () => {
      const collection = buildCollection({
        headers: [
          {
            key: "X-Custom",
            value: "collection-val",
            active: true,
            description: "",
          },
        ],
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            headers: [
              {
                key: "x-custom",
                value: "request-val",
                active: true,
                description: "",
              },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/test"]!.get!.parameters as any[]

      const headerParams = params.filter((p: any) => p.in === "header")
      expect(headerParams).toHaveLength(1)
      expect(headerParams[0].example).toBe("request-val")
    })
  })

  describe("folders and tags", () => {
    it("creates tags from folders", () => {
      const collection = buildCollection({
        folders: [
          buildCollection({
            name: "Users",
            requests: [
              buildRequest({
                name: "List Users",
                endpoint: "https://api.example.com/users",
              }),
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.tags).toContainEqual({ name: "Users" })
      expect(doc.paths!["/users"]!.get!.tags).toEqual(["Users"])
    })

    it("creates nested tag paths for nested folders", () => {
      const collection = buildCollection({
        folders: [
          buildCollection({
            name: "API",
            folders: [
              buildCollection({
                name: "Users",
                requests: [
                  buildRequest({
                    name: "List",
                    endpoint: "https://api.example.com/users",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.tags).toContainEqual({ name: "API" })
      expect(doc.tags).toContainEqual({ name: "API/Users" })
      expect(doc.paths!["/users"]!.get!.tags).toEqual(["API/Users"])
    })

    it("root-level requests have no tags", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Health",
            endpoint: "https://api.example.com/health",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/health"]!.get!.tags).toBeUndefined()
      expect(doc.tags).toBeUndefined()
    })
  })

  describe("responses", () => {
    it("generates default 200 response when no responses saved", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            responses: {},
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/test"]!.get!.responses).toEqual({
        "200": { description: "Successful response" },
      })
    })

    it("converts saved responses with body and headers", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            responses: {
              resp1: {
                name: "Success",
                code: 200,
                status: "OK",
                headers: [
                  { key: "Content-Type", value: "application/json" },
                  { key: "X-Request-Id", value: "abc" },
                ],
                body: '{"result":"ok"}',
              } as any,
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const resp = doc.paths!["/test"]!.get!.responses["200"] as any

      expect(resp.description).toBe("Success")
      expect(resp.headers["X-Request-Id"].example).toBe("abc")
      expect(resp.content["application/json"].example).toEqual({
        result: "ok",
      })
    })
  })

  describe("warnings", () => {
    it("warns when requests have scripts", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            preRequestScript: "console.log('hi')",
          }),
        ],
      })
      const { warnings } = hoppCollectionToOpenAPI(collection)

      expect(warnings).toContain("export.openapi_scripts_not_included")
    })

    it("warns when lossy auth types are used", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            auth: {
              authType: "digest",
              authActive: true,
              username: "user",
              password: "pass",
              realm: "",
              nonce: "",
              algorithm: "MD5",
              qop: "auth",
              nc: "",
              cnonce: "",
              opaque: "",
            } as any,
          }),
        ],
      })
      const { warnings } = hoppCollectionToOpenAPI(collection)

      expect(warnings).toContain("export.openapi_auth_limited_detail")
    })

    it("does not warn for empty scripts with module prefix", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            preRequestScript: "export {};\n",
            testScript: "export {};\n",
          }),
        ],
      })
      const { warnings } = hoppCollectionToOpenAPI(collection)

      expect(warnings).not.toContain("export.openapi_scripts_not_included")
    })

    it("returns no warnings for a clean collection", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
          }),
        ],
      })
      const { warnings } = hoppCollectionToOpenAPI(collection)

      expect(warnings).toHaveLength(0)
    })

    it("warns when requests share the same path and method", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "First",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
          buildRequest({
            name: "Second",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc, warnings } = hoppCollectionToOpenAPI(collection)

      // First wins; second is dropped
      expect(doc.paths!["/users"]!.get!.summary).toBe("First")
      expect(warnings).toContain("export.openapi_duplicate_paths")
    })

    it("warns and skips operations with HTTP methods OpenAPI does not support", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Connect Tunnel",
            method: "CONNECT",
            endpoint: "https://api.example.com/tunnel",
          }),
          buildRequest({
            name: "Get Users",
            method: "GET",
            endpoint: "https://api.example.com/users",
          }),
        ],
      })
      const { doc, warnings } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/tunnel"]).toBeUndefined()
      expect(doc.paths!["/users"]).toBeDefined()
      expect(warnings).toContain("export.openapi_unsupported_methods")
    })

    it("warns when collection-level scripts are present", () => {
      const collection = buildCollection({
        preRequestScript: "console.log('coll')",
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
          }),
        ],
      })
      const { warnings } = hoppCollectionToOpenAPI(collection)

      expect(warnings).toContain("export.openapi_scripts_not_included")
    })

    it("warns when folder-level scripts are present", () => {
      const collection = buildCollection({
        folders: [
          buildCollection({
            name: "Folder",
            testScript: "console.log('folder')",
            requests: [
              buildRequest({
                name: "Test",
                endpoint: "https://api.example.com/test",
              }),
            ],
          }),
        ],
      })
      const { warnings } = hoppCollectionToOpenAPI(collection)

      expect(warnings).toContain("export.openapi_scripts_not_included")
    })
  })

  describe("path template variables (regression)", () => {
    // These tests document the BLOCKER fix: the WHATWG URL parser
    // percent-encodes `{}` to `%7B%7D` in pathnames. The converter must
    // decode those back so OpenAPI path parameters land correctly.
    it("preserves {var} placeholders that the URL parser percent-encoded", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get",
            endpoint: "https://api.example.com/users/{id}",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/users/{id}"]).toBeDefined()
    })

    it("converts <<var>> in absolute URLs to {var} after URL parsing", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get",
            endpoint: "https://api.example.com/users/<<id>>/posts/<<postId>>",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/users/{id}/posts/{postId}"]).toBeDefined()
    })

    it("preserves intentionally percent-encoded path segments (e.g. %2F)", () => {
      // Regression: an over-eager decodeURIComponent on the whole pathname
      // would turn `%2F` into a literal `/`, splitting a single segment in two.
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get",
            endpoint: "https://api.example.com/files/a%2Fb/info",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/files/a%2Fb/info"]).toBeDefined()
      expect(doc.paths!["/files/a/b/info"]).toBeUndefined()
    })

    it("strips fragments from relative endpoints", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({ name: "Get", endpoint: "/users/list#section" }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/users/list"]).toBeDefined()
      expect(doc.paths!["/users/list#section"]).toBeUndefined()
    })

    it("treats a leading <<var>> as the server, not as a path segment", () => {
      // Regression: `<<baseUrl>>/pets/9704` was previously kept whole inside
      // the path, then importer-side double-prefixed `<<baseUrl>>` on round-trip.
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Get pet",
            endpoint: "<<baseUrl>>/pets/9704",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths!["/pets/9704"]).toBeDefined()
      // The leading variable lands in servers, not in any path key
      expect(doc.paths!["/<<baseUrl>>/pets/9704"]).toBeUndefined()
      expect(doc.paths!["/{baseUrl}/pets/9704"]).toBeUndefined()
      expect(doc.servers).toEqual([{ url: "<<baseUrl>>" }])
    })

    it("handles a bare leading <<var>> with no path", () => {
      const collection = buildCollection({
        requests: [buildRequest({ name: "Root", endpoint: "<<baseUrl>>" })],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/"]).toBeDefined()
      expect(doc.servers).toEqual([{ url: "<<baseUrl>>" }])
    })

    it("resolves a leading <<var>> to its collection-variable value in servers", () => {
      // Regression: previously the doc shipped `servers: [{ url: "<<baseUrl>>" }]`
      // even when the collection knew the actual host. OpenAPI consumers can't
      // resolve Hoppscotch placeholders, so we substitute the value here.
      const collection = buildCollection({
        variables: [
          {
            key: "baseUrl",
            initialValue: "https://api.petstore.com",
            currentValue: "https://api.petstore.com",
            secret: false,
          },
        ],
        requests: [
          buildRequest({
            name: "Get pet",
            endpoint: "<<baseUrl>>/pets/9704",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.servers).toEqual([{ url: "https://api.petstore.com" }])
      expect(doc.paths!["/pets/9704"]).toBeDefined()
    })

    it("works for any variable name, not only baseUrl", () => {
      const collection = buildCollection({
        variables: [
          {
            key: "petstoreHost",
            initialValue: "https://api.petstore.com",
            currentValue: "https://api.petstore.com",
            secret: false,
          },
        ],
        requests: [
          buildRequest({
            name: "Get pet",
            endpoint: "<<petstoreHost>>/pets/9704",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.servers).toEqual([{ url: "https://api.petstore.com" }])
    })

    it("does not leak secret variables into the exported servers", () => {
      const collection = buildCollection({
        variables: [
          {
            key: "secretHost",
            initialValue: "https://internal.example.com",
            currentValue: "https://internal.example.com",
            secret: true,
          },
        ],
        requests: [
          buildRequest({
            name: "Get",
            endpoint: "<<secretHost>>/api/x",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      // Falls back to the placeholder so the user can see something is off,
      // rather than embedding a secret value into the spec.
      expect(doc.servers).toEqual([{ url: "<<secretHost>>" }])
    })

    it("falls back to placeholder when no matching variable exists", () => {
      const collection = buildCollection({
        variables: [],
        requests: [
          buildRequest({
            name: "Get",
            endpoint: "<<unknown>>/path",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.servers).toEqual([{ url: "<<unknown>>" }])
    })

    it("uses currentValue, falling back to initialValue", () => {
      const collection = buildCollection({
        variables: [
          {
            key: "baseUrl",
            initialValue: "https://prod.example.com",
            currentValue: "https://staging.example.com",
            secret: false,
          },
        ],
        requests: [buildRequest({ name: "Get", endpoint: "<<baseUrl>>/x" })],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.servers).toEqual([{ url: "https://staging.example.com" }])
    })

    it("a deeper folder variable overrides a collection variable", () => {
      const collection = buildCollection({
        variables: [
          {
            key: "baseUrl",
            initialValue: "https://prod.example.com",
            currentValue: "https://prod.example.com",
            secret: false,
          },
        ],
        folders: [
          buildCollection({
            name: "Sandbox",
            variables: [
              {
                key: "baseUrl",
                initialValue: "https://sandbox.example.com",
                currentValue: "https://sandbox.example.com",
                secret: false,
              },
            ],
            requests: [
              buildRequest({ name: "Get", endpoint: "<<baseUrl>>/x" }),
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.servers).toEqual([{ url: "https://sandbox.example.com" }])
    })
  })

  describe("URL query string handling", () => {
    it("extracts query params from absolute URL into operation parameters", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Search",
            endpoint: "https://api.example.com/search?q=hello&limit=10",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/search"]!.get!.parameters as any[]

      // path key has no `?`
      expect(doc.paths!["/search?q=hello&limit=10"]).toBeUndefined()
      const queryParams = params.filter((p: any) => p.in === "query")
      expect(queryParams).toContainEqual(
        expect.objectContaining({ name: "q", example: "hello" })
      )
      expect(queryParams).toContainEqual(
        expect.objectContaining({ name: "limit", example: "10" })
      )
    })

    it("strips query string from a relative endpoint and exposes its params", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Filter",
            endpoint: "/users?active=true",
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/users"]).toBeDefined()
      // path key must not contain `?`
      expect(doc.paths!["/users?active=true"]).toBeUndefined()
      const params = doc.paths!["/users"]!.get!.parameters as any[]
      const queryParams = params.filter((p: any) => p.in === "query")
      expect(queryParams).toContainEqual(
        expect.objectContaining({ name: "active", example: "true" })
      )
    })

    it("explicit request.params take precedence over duplicates in URL", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Search",
            endpoint: "https://api.example.com/search?q=from-url",
            params: [
              {
                key: "q",
                value: "from-explicit",
                active: true,
                description: "",
              },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/search"]!.get!.parameters as any[]
      const queryParams = params.filter((p: any) => p.in === "query")
      expect(queryParams).toHaveLength(1)
      expect(queryParams[0].example).toBe("from-explicit")
    })
  })

  describe("parameter de-duplication", () => {
    it("dedupes duplicate query params (first wins)", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/test",
            params: [
              { key: "page", value: "1", active: true, description: "" },
              { key: "page", value: "2", active: true, description: "" },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/test"]!.get!.parameters as any[]
      const queryParams = params.filter((p: any) => p.in === "query")
      expect(queryParams).toHaveLength(1)
      expect(queryParams[0].example).toBe("1")
    })

    it("dedupes duplicate path params introduced both via requestVariables and path", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "Test",
            endpoint: "https://api.example.com/users/<<id>>/posts/<<id>>",
            requestVariables: [{ key: "id", value: "42", active: true }],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths!["/users/{id}/posts/{id}"]!.get!
        .parameters as any[]
      const pathParams = params.filter((p: any) => p.in === "path")
      expect(pathParams).toHaveLength(1)
      expect(pathParams[0].name).toBe("id")
    })
  })

  describe("auth inheritance", () => {
    it("operation inherits folder-level auth when request auth is inherit", () => {
      const collection = buildCollection({
        folders: [
          buildCollection({
            name: "Authenticated",
            auth: {
              authType: "basic",
              authActive: true,
              username: "u",
              password: "p",
            },
            requests: [
              buildRequest({
                name: "Get Secure",
                endpoint: "https://api.example.com/secure",
                auth: { authType: "inherit", authActive: true },
              }),
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/secure"]!.get!.security).toEqual([{ basicAuth: [] }])
      expect(doc.components!.securitySchemes!.basicAuth).toEqual({
        type: "http",
        scheme: "basic",
      })
    })

    it("nested folder auth wins over collection auth via inherit", () => {
      const collection = buildCollection({
        auth: {
          authType: "basic",
          authActive: true,
          username: "u",
          password: "p",
        },
        folders: [
          buildCollection({
            name: "Inner",
            auth: { authType: "bearer", authActive: true, token: "t" },
            requests: [
              buildRequest({
                name: "Get",
                endpoint: "https://api.example.com/inner",
                auth: { authType: "inherit", authActive: true },
              }),
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/inner"]!.get!.security).toEqual([{ bearerAuth: [] }])
    })

    it("folder auth=none under collection auth produces empty operation security", () => {
      const collection = buildCollection({
        auth: {
          authType: "basic",
          authActive: true,
          username: "u",
          password: "p",
        },
        folders: [
          buildCollection({
            name: "Public",
            auth: { authType: "none", authActive: true },
            requests: [
              buildRequest({
                name: "Health",
                endpoint: "https://api.example.com/public/health",
                auth: { authType: "inherit", authActive: true },
              }),
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      expect(doc.paths!["/public/health"]!.get!.security).toEqual([])
      expect(doc.security).toEqual([{ basicAuth: [] }])
    })
  })

  describe("API key scheme name collisions", () => {
    it("disambiguates API-key schemes that sanitize to the same name", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "A",
            endpoint: "https://api.example.com/a",
            auth: {
              authType: "api-key",
              authActive: true,
              key: "X@Api-Key",
              value: "v1",
              addTo: "HEADERS",
            },
          }),
          buildRequest({
            name: "B",
            endpoint: "https://api.example.com/b",
            auth: {
              authType: "api-key",
              authActive: true,
              key: "X#Api-Key",
              value: "v2",
              addTo: "HEADERS",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const schemes = doc.components!.securitySchemes!
      const schemeNames = Object.keys(schemes)
      // both schemes should exist under different names; neither should silently overwrite
      expect(schemeNames).toHaveLength(2)
      // each operation should reference its own scheme
      const aSec = doc.paths!["/a"]!.get!.security as any[]
      const bSec = doc.paths!["/b"]!.get!.security as any[]
      expect(Object.keys(aSec[0])[0]).not.toBe(Object.keys(bSec[0])[0])
      // but the underlying scheme.name fields should differ
      const aSchemeName = Object.keys(aSec[0])[0]
      const bSchemeName = Object.keys(bSec[0])[0]
      expect((schemes[aSchemeName] as any).name).toBe("X@Api-Key")
      expect((schemes[bSchemeName] as any).name).toBe("X#Api-Key")
    })

    it("reuses the scheme name when two API-key schemes are identical", () => {
      const collection = buildCollection({
        requests: [
          buildRequest({
            name: "A",
            endpoint: "https://api.example.com/a",
            auth: {
              authType: "api-key",
              authActive: true,
              key: "X-Api-Key",
              value: "v",
              addTo: "HEADERS",
            },
          }),
          buildRequest({
            name: "B",
            endpoint: "https://api.example.com/b",
            auth: {
              authType: "api-key",
              authActive: true,
              key: "X-Api-Key",
              value: "v",
              addTo: "HEADERS",
            },
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const schemes = doc.components!.securitySchemes!
      expect(Object.keys(schemes)).toHaveLength(1)
    })
  })
})

// Round-trip audit: HoppCollection -> OpenAPI 3.1 -> HoppCollection.
// Tests labelled `LOSSY` document a known and disclosed loss; tests without
// that label assert exact preservation. New regressions surfaced by the
// audit land here.

const buildResponse = (
  overrides: {
    name?: string
    code?: number
    status?: string
    headers?: Array<{ key: string; value: string }>
    body?: string
  } = {}
): HoppRESTRequestResponse =>
  ({
    name: "Success",
    code: 200,
    status: "OK",
    headers: [],
    body: "",
    ...overrides,
    originalRequest: makeHoppRESTResponseOriginalRequest({
      name: "Test",
      method: "GET",
      endpoint: "https://api.example.com/test",
      params: [],
      headers: [],
      auth: { authType: "inherit", authActive: true },
      body: { contentType: null, body: null },
      requestVariables: [],
    }),
  }) as HoppRESTRequestResponse

const buildColl = (
  overrides: Partial<Parameters<typeof makeCollection>[0]> = {}
) =>
  makeCollection({
    name: "Round Trip",
    requests: [],
    folders: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
    ...overrides,
  } as Parameters<typeof makeCollection>[0])

const buildReq = (
  overrides: Partial<Parameters<typeof makeRESTRequest>[0]> = {}
) =>
  makeRESTRequest({
    name: "Test",
    method: "GET",
    endpoint: "https://api.example.com/test",
    params: [],
    headers: [],
    preRequestScript: "",
    testScript: "",
    auth: { authType: "inherit", authActive: true },
    body: { contentType: null, body: null },
    requestVariables: [],
    responses: {},
    description: null,
    ...overrides,
  } as Parameters<typeof makeRESTRequest>[0])

const roundTrip = async (input: HoppCollection): Promise<HoppCollection> => {
  const { doc } = hoppCollectionToOpenAPI(input)
  const r = await convertOpenApiDocsToHopp([doc as OpenAPI.Document])()
  if (r._tag === "Left") throw new Error(r.left as string)
  return r.right[0]
}

// `HoppCollection["requests"]` is a union of REST and GQL; every fixture below
// builds REST. These accessors narrow the union so tests can read REST-only
// fields (`requestVariables`, `responses`, `method`) without per-call casts.
const restRequestsOf = (c: HoppCollection | undefined): HoppRESTRequest[] =>
  (c?.requests ?? []) as HoppRESTRequest[]

const firstReq = (c: HoppCollection): HoppRESTRequest | undefined => {
  const direct = restRequestsOf(c)[0]
  if (direct) return direct
  const inFolder = restRequestsOf(c.folders[0])[0]
  if (inFolder) return inFolder
  return restRequestsOf(c.folders[0]?.folders[0])[0]
}

// Identity fields: collection name/description, request name/description/method.
describe("round-trip — identity fields", () => {
  it("preserves collection name", async () => {
    const out = await roundTrip(buildColl({ name: "My API" }))
    expect(out.name).toBe("My API")
  })

  it("preserves collection description", async () => {
    const out = await roundTrip(buildColl({ description: "A description" }))
    expect(out.description).toBe("A description")
  })

  it("preserves request name (with spaces)", async () => {
    const out = await roundTrip(
      buildColl({ requests: [buildReq({ name: "Get Pet By ID" })] })
    )
    expect(firstReq(out)?.name).toBe("Get Pet By ID")
  })

  it("preserves request description", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [buildReq({ description: "Fetches a single pet" })],
      })
    )
    expect(firstReq(out)?.description).toBe("Fetches a single pet")
  })

  it("preserves request method", async () => {
    const out = await roundTrip(
      buildColl({ requests: [buildReq({ method: "POST" })] })
    )
    expect(firstReq(out)?.method).toBe("POST")
  })
})

// Endpoint shape: server URL parametrization, baseUrl seeding, path templates.
describe("round-trip — endpoint variants", () => {
  it("LOSSY: absolute URL gets parametrized to <<baseUrl>> + collection variable", async () => {
    // Importer seeds a `baseUrl` variable from the doc's `servers[0].url` so
    // users have one place to switch hosts. Endpoints are rewritten to use
    // the placeholder. The actual request still resolves to the original URL
    // at runtime via the variable.
    const out = await roundTrip(
      buildColl({
        requests: [buildReq({ endpoint: "https://api.example.com/pets/9704" })],
      })
    )
    expect(firstReq(out)?.endpoint).toBe("<<baseUrl>>/pets/9704")
    expect(out.variables[0]?.key).toBe("baseUrl")
    expect(out.variables[0]?.currentValue).toBe("https://api.example.com")
  })

  it("preserves leading <<var>> when collection has no value for it", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [buildReq({ endpoint: "<<unknownHost>>/pets/9704" })],
      })
    )
    expect(firstReq(out)?.endpoint).toBe("<<unknownHost>>/pets/9704")
  })

  it("LOSSY: variable name normalizes to baseUrl when value is known", async () => {
    // Original variable was `petstoreHost` with a real URL. Exporter resolves
    // to the URL; importer re-creates as `baseUrl`.
    const out = await roundTrip(
      buildColl({
        variables: [
          {
            key: "petstoreHost",
            initialValue: "https://api.petstore.com",
            currentValue: "https://api.petstore.com",
            secret: false,
          },
        ],
        requests: [buildReq({ endpoint: "<<petstoreHost>>/pets" })],
      })
    )
    expect(firstReq(out)?.endpoint).toBe("<<baseUrl>>/pets")
    expect(out.variables[0]?.key).toBe("baseUrl")
    expect(out.variables[0]?.currentValue).toBe("https://api.petstore.com")
  })

  it("preserves path template variables (under <<baseUrl>>)", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            endpoint: "https://api.example.com/users/<<id>>",
            requestVariables: [{ key: "id", value: "42", active: true }],
          }),
        ],
      })
    )
    // Server is parametrized; path keeps its template variable; the
    // requestVariable's value round-trips via the OpenAPI `example` field.
    expect(firstReq(out)?.endpoint).toBe("<<baseUrl>>/users/<<id>>")
    expect(firstReq(out)?.requestVariables[0]?.key).toBe("id")
    expect(firstReq(out)?.requestVariables[0]?.value).toBe("42")
  })
})

// Query params: keys, values, descriptions.
describe("round-trip — query params", () => {
  it("preserves query param keys", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            params: [
              { key: "q", value: "x", active: true, description: "" },
              { key: "limit", value: "10", active: true, description: "" },
            ],
          }),
        ],
      })
    )
    const keys = firstReq(out)?.params.map((p) => p.key) ?? []
    expect(keys).toContain("q")
    expect(keys).toContain("limit")
  })

  it("preserves query param values", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            params: [
              { key: "q", value: "hello", active: true, description: "" },
            ],
          }),
        ],
      })
    )
    const p = firstReq(out)?.params.find((p) => p.key === "q")
    expect(p?.value).toBe("hello")
  })

  it("preserves query param descriptions", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            params: [
              {
                key: "status",
                value: "open",
                active: true,
                description: "Filter by status",
              },
            ],
          }),
        ],
      })
    )
    const p = firstReq(out)?.params.find((p) => p.key === "status")
    expect(p?.description).toBe("Filter by status")
  })
})

// Per-request and collection-level headers.
describe("round-trip — headers", () => {
  it("preserves request header keys and values", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            headers: [
              {
                key: "X-Custom",
                value: "abc",
                active: true,
                description: "",
              },
            ],
          }),
        ],
      })
    )
    const h = firstReq(out)?.headers.find((h) => h.key === "X-Custom")
    expect(h?.value).toBe("abc")
  })

  it("collection-level headers become per-request headers on round-trip", async () => {
    // OpenAPI has no concept of doc-level headers; the converter emits them
    // as per-operation headers. On reimport they land on each request.
    const out = await roundTrip(
      buildColl({
        headers: [
          { key: "X-Global", value: "g", active: true, description: "" },
        ],
        requests: [buildReq({ headers: [] })],
      })
    )
    const h = firstReq(out)?.headers.find((h) => h.key === "X-Global")
    expect(h?.value).toBe("g")
  })
})

// Auth schemes — credentials never survive (intentional: secrets stay out
// of exported docs). Only the auth type/scheme is preserved.
describe("round-trip — auth", () => {
  it("LOSSY: basic auth — credentials are dropped (only scheme survives)", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            auth: {
              authType: "basic",
              authActive: true,
              username: "alice",
              password: "secret",
            },
          }),
        ],
      })
    )
    expect(firstReq(out)?.auth.authType).toBe("basic")
    expect((firstReq(out)?.auth as { username?: string }).username).toBe("")
    expect((firstReq(out)?.auth as { password?: string }).password).toBe("")
  })

  it("LOSSY: bearer token is dropped", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            auth: { authType: "bearer", authActive: true, token: "abc" },
          }),
        ],
      })
    )
    expect(firstReq(out)?.auth.authType).toBe("bearer")
    expect((firstReq(out)?.auth as { token?: string }).token).toBe("")
  })

  it("LOSSY: api-key value dropped (key name preserved)", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            auth: {
              authType: "api-key",
              authActive: true,
              key: "X-API-Key",
              value: "secret-value",
              addTo: "HEADERS",
            },
          }),
        ],
      })
    )
    const a = firstReq(out)?.auth as {
      authType: string
      key?: string
      value?: string
    }
    expect(a.authType).toBe("api-key")
    expect(a.key).toBe("X-API-Key")
    expect(a.value).toBe("")
  })
})

// Body shapes: JSON, multipart, urlencoded, plain text.
describe("round-trip — body", () => {
  it("preserves JSON body content", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            method: "POST",
            body: {
              contentType: "application/json",
              body: '{"name":"Buddy"}',
            },
          }),
        ],
      })
    )
    expect(firstReq(out)?.body.contentType).toBe("application/json")
  })

  it("preserves multipart/form-data field structure", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            method: "POST",
            body: {
              contentType: "multipart/form-data",
              body: [
                {
                  key: "name",
                  value: "Buddy",
                  active: true,
                  isFile: false,
                },
              ],
            },
          }),
        ],
      })
    )
    expect(firstReq(out)?.body.contentType).toBe("multipart/form-data")
  })

  it("preserves JSON body content (string)", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            method: "POST",
            body: {
              contentType: "application/json",
              body: '{"name":"Buddy"}',
            },
          }),
        ],
      })
    )
    const r = firstReq(out)
    expect(r?.body.contentType).toBe("application/json")
    if (typeof r?.body.body === "string") {
      const original = JSON.parse('{"name":"Buddy"}')
      const got = JSON.parse(r.body.body)
      expect(got).toEqual(original)
    }
  })

  it("preserves plain text body content", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            method: "POST",
            body: { contentType: "text/plain", body: "hello world" },
          }),
        ],
      })
    )
    expect(firstReq(out)?.body.contentType).toBe("text/plain")
    expect(firstReq(out)?.body.body).toBe("hello world")
  })

  it("multipart entries preserve key+isFile flag", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            method: "POST",
            body: {
              contentType: "multipart/form-data",
              body: [
                {
                  key: "name",
                  value: "Buddy",
                  active: true,
                  isFile: false,
                },
                {
                  key: "avatar",
                  value: "",
                  active: true,
                  isFile: true,
                },
              ],
            },
          }),
        ],
      })
    )
    const body = firstReq(out)?.body
    expect(body?.contentType).toBe("multipart/form-data")
    if (Array.isArray(body?.body)) {
      const name = body.body.find((e: { key: string }) => e.key === "name")
      const avatar = body.body.find((e: { key: string }) => e.key === "avatar")
      expect(name).toBeDefined()
      expect(avatar?.isFile).toBe(true)
    }
  })

  it("urlencoded body keys round-trip", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            method: "POST",
            body: {
              contentType: "application/x-www-form-urlencoded",
              body: "user=alice&pass=secret",
            },
          }),
        ],
      })
    )
    const body = firstReq(out)?.body
    expect(body?.contentType).toBe("application/x-www-form-urlencoded")
    if (typeof body?.body === "string") {
      expect(body.body).toMatch(/user/)
      expect(body.body).toMatch(/pass/)
    }
  })
})

// Saved responses on a request.
describe("round-trip — saved responses", () => {
  it("preserves response name and code", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            responses: {
              ok: buildResponse({
                name: "Success",
                code: 200,
                status: "OK",
                body: '{"ok":true}',
              }),
            },
          }),
        ],
      })
    )
    const responses = firstReq(out)?.responses ?? {}
    const r = Object.values(responses)[0] as { name?: string; code?: number }
    expect(r?.code).toBe(200)
  })

  it("preserves response status code and body for a single saved response", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            responses: {
              ok: buildResponse({
                name: "OK",
                code: 200,
                status: "OK",
                headers: [{ key: "Content-Type", value: "application/json" }],
                body: '{"ok":true}',
              }),
            },
          }),
        ],
      })
    )
    const r = firstReq(out)
    const responses = r?.responses ?? {}
    const first = Object.values(responses)[0] as {
      code?: number
      body?: string
    }
    expect(first?.code).toBe(200)
  })
})

// Folder structure: deep nesting, descriptions, multiple top-level folders.
describe("round-trip — folder hierarchy", () => {
  it("preserves a deeply nested folder", async () => {
    const out = await roundTrip(
      buildColl({
        folders: [
          buildColl({
            name: "API",
            folders: [
              buildColl({
                name: "Users",
                requests: [
                  buildReq({
                    name: "List",
                    endpoint: "https://api.example.com/users",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
    expect(out.folders[0]?.name).toBe("API")
    expect(out.folders[0]?.folders[0]?.name).toBe("Users")
    expect(restRequestsOf(out.folders[0]?.folders[0])[0]?.name).toBe("List")
  })

  it("preserves folder description", async () => {
    const out = await roundTrip(
      buildColl({
        folders: [
          buildColl({
            name: "Users",
            description: "Endpoints for managing users",
            requests: [
              buildReq({
                name: "Get",
                endpoint: "https://api.example.com/users/me",
              }),
            ],
          }),
        ],
      })
    )
    expect(out.folders[0]?.description).toBe("Endpoints for managing users")
  })

  it("preserves multiple top-level folders", async () => {
    const out = await roundTrip(
      buildColl({
        folders: [
          buildColl({
            name: "Pets",
            requests: [
              buildReq({
                name: "List",
                endpoint: "https://api.example.com/pets",
              }),
            ],
          }),
          buildColl({
            name: "Orders",
            requests: [
              buildReq({
                name: "List",
                endpoint: "https://api.example.com/orders",
              }),
            ],
          }),
        ],
      })
    )
    const names = out.folders.map((f) => f.name).sort()
    expect(names).toEqual(["Orders", "Pets"])
  })
})

// Collection-level auth: stays on the collection rather than being flattened
// to per-request copies. Per-request explicit overrides still survive.
describe("round-trip — collection-level auth structure", () => {
  it("collection-level basic auth stays on the collection (not duplicated on each request)", async () => {
    const out = await roundTrip(
      buildColl({
        auth: {
          authType: "basic",
          authActive: true,
          username: "alice",
          password: "secret",
        },
        requests: [
          buildReq({
            name: "A",
            endpoint: "https://api.example.com/a",
          }),
          buildReq({
            name: "B",
            endpoint: "https://api.example.com/b",
          }),
        ],
      })
    )
    expect(out.auth.authType).toBe("basic")
    expect(restRequestsOf(out)[0]?.auth.authType).toBe("inherit")
    expect(restRequestsOf(out)[1]?.auth.authType).toBe("inherit")
  })

  it("per-request explicit override coexists with collection-level default", async () => {
    const out = await roundTrip(
      buildColl({
        auth: {
          authType: "basic",
          authActive: true,
          username: "alice",
          password: "p",
        },
        requests: [
          buildReq({
            name: "Inherits",
            endpoint: "https://api.example.com/a",
          }),
          buildReq({
            name: "Overrides",
            endpoint: "https://api.example.com/b",
            auth: { authType: "bearer", authActive: true, token: "t" },
          }),
        ],
      })
    )
    expect(out.auth.authType).toBe("basic")
    const inheritReq = restRequestsOf(out).find((r) => r.name === "Inherits")
    const overrideReq = restRequestsOf(out).find((r) => r.name === "Overrides")
    expect(inheritReq?.auth.authType).toBe("inherit")
    expect(overrideReq?.auth.authType).toBe("bearer")
  })

  it("explicit no-auth on a request (authType=none) round-trips as none, not inherit", async () => {
    const out = await roundTrip(
      buildColl({
        auth: {
          authType: "basic",
          authActive: true,
          username: "u",
          password: "p",
        },
        requests: [
          buildReq({
            name: "Public",
            endpoint: "https://api.example.com/health",
            auth: { authType: "none", authActive: true },
          }),
        ],
      })
    )
    expect(out.auth.authType).toBe("basic")
    expect(restRequestsOf(out)[0]?.auth.authType).toBe("none")
  })

  it("collection without any auth round-trips as inherit", async () => {
    const out = await roundTrip(
      buildColl({
        auth: { authType: "inherit", authActive: true },
        requests: [buildReq({ endpoint: "https://api.example.com/a" })],
      })
    )
    expect(out.auth.authType).toBe("inherit")
    expect(restRequestsOf(out)[0]?.auth.authType).toBe("inherit")
  })
})

// Validates the exported doc against the OpenAPI 3.1 spec via SwaggerParser.
// Catches output that's structurally invalid even if our own importer is lenient.
describe("exported doc validates against OpenAPI 3.1 spec", () => {
  const validate = async (collection: HoppCollection) => {
    const { doc } = hoppCollectionToOpenAPI(collection)
    // SwaggerParser mutates input; clone first.
    const cloned = JSON.parse(JSON.stringify(doc))
    await SwaggerParser.validate(cloned)
  }

  it("a minimal collection produces a valid OpenAPI 3.1 doc", async () => {
    await expect(
      validate(
        buildColl({
          requests: [buildReq({ endpoint: "https://api.example.com/pets" })],
        })
      )
    ).resolves.not.toThrow()
  })

  it("a collection with auth + headers + body validates", async () => {
    await expect(
      validate(
        buildColl({
          requests: [
            buildReq({
              method: "POST",
              endpoint: "https://api.example.com/pets",
              headers: [
                {
                  key: "X-Custom",
                  value: "abc",
                  active: true,
                  description: "",
                },
              ],
              params: [
                {
                  key: "draft",
                  value: "true",
                  active: true,
                  description: "",
                },
              ],
              auth: {
                authType: "bearer",
                authActive: true,
                token: "tk",
              },
              body: {
                contentType: "application/json",
                body: '{"name":"Buddy"}',
              },
            }),
          ],
        })
      )
    ).resolves.not.toThrow()
  })

  it("a collection with nested folders validates", async () => {
    await expect(
      validate(
        buildColl({
          folders: [
            buildColl({
              name: "API",
              folders: [
                buildColl({
                  name: "Users",
                  requests: [
                    buildReq({
                      name: "List",
                      endpoint: "https://api.example.com/users",
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      )
    ).resolves.not.toThrow()
  })

  it("a collection that resolves a baseUrl variable validates (no <<>> in spec output)", async () => {
    await expect(
      validate(
        buildColl({
          variables: [
            {
              key: "baseUrl",
              initialValue: "https://api.example.com",
              currentValue: "https://api.example.com",
              secret: false,
            },
          ],
          requests: [buildReq({ endpoint: "<<baseUrl>>/pets" })],
        })
      )
    ).resolves.not.toThrow()
  })
})

// Active flag preservation. OpenAPI has no concept of inactive params/headers,
// so inactive entries are dropped on export and reimported as active=true.
describe("round-trip — active flag", () => {
  it("LOSSY: inactive query params are dropped on export (only active ones survive)", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            params: [
              {
                key: "kept",
                value: "1",
                active: true,
                description: "",
              },
              {
                key: "skipped",
                value: "x",
                active: false,
                description: "",
              },
            ],
          }),
        ],
      })
    )
    const keys = firstReq(out)?.params.map((p) => p.key) ?? []
    expect(keys).toContain("kept")
    expect(keys).not.toContain("skipped")
  })

  it("LOSSY: inactive headers are dropped on export", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            headers: [
              {
                key: "X-Kept",
                value: "1",
                active: true,
                description: "",
              },
              {
                key: "X-Skipped",
                value: "x",
                active: false,
                description: "",
              },
            ],
          }),
        ],
      })
    )
    const keys = firstReq(out)?.headers.map((h) => h.key) ?? []
    expect(keys).toContain("X-Kept")
    expect(keys).not.toContain("X-Skipped")
  })

  it("active flag defaults to true on import (OpenAPI has no concept of disabled params)", async () => {
    const out = await roundTrip(
      buildColl({
        requests: [
          buildReq({
            params: [{ key: "q", value: "1", active: true, description: "" }],
          }),
        ],
      })
    )
    expect(firstReq(out)?.params[0]?.active).toBe(true)
  })
})

// Combined-features fixture mimicking a real Petstore-shaped collection,
// to catch interactions that single-feature tests miss.
describe("round-trip — kitchen sink (combined features)", () => {
  it("a real-world-shaped collection survives round-trip with the expected losses", async () => {
    const original = buildColl({
      name: "Petstore",
      description: "Test API",
      variables: [
        {
          key: "baseUrl",
          initialValue: "https://api.petstore.com",
          currentValue: "https://api.petstore.com",
          secret: false,
        },
      ],
      headers: [
        {
          key: "X-Tenant",
          value: "default",
          active: true,
          description: "Tenant",
        },
      ],
      folders: [
        buildColl({
          name: "Pets",
          description: "Pet endpoints",
          requests: [
            buildReq({
              name: "Get pet by ID",
              method: "GET",
              endpoint: "<<baseUrl>>/v1/pets/<<petId>>",
              params: [
                {
                  key: "include",
                  value: "tags",
                  active: true,
                  description: "Comma-separated includes",
                },
              ],
              requestVariables: [{ key: "petId", value: "9704", active: true }],
            }),
            buildReq({
              name: "Add a new pet",
              method: "POST",
              endpoint: "<<baseUrl>>/v1/pets",
              body: {
                contentType: "application/json",
                body: '{"name":"Buddy","status":"available"}',
              },
            }),
          ],
        }),
      ],
    })

    const out = await roundTrip(original)

    expect(out.name).toBe("Petstore")
    expect(out.description).toBe("Test API")

    const petsFolder = out.folders.find((f) => f.name === "Pets")
    expect(petsFolder).toBeDefined()
    expect(petsFolder?.description).toBe("Pet endpoints")

    expect(out.variables[0]?.key).toBe("baseUrl")
    expect(out.variables[0]?.currentValue).toBe("https://api.petstore.com")

    const getReq = restRequestsOf(petsFolder).find(
      (r) => r.name === "Get pet by ID"
    )
    expect(getReq?.endpoint).toBe("<<baseUrl>>/v1/pets/<<petId>>")
    expect(getReq?.params[0]?.value).toBe("tags")
    expect(getReq?.params[0]?.description).toBe("Comma-separated includes")
    expect(getReq?.requestVariables[0]?.value).toBe("9704")

    const addReq = restRequestsOf(petsFolder).find(
      (r) => r.name === "Add a new pet"
    )
    expect(addReq?.method).toBe("POST")
    expect(addReq?.body.contentType).toBe("application/json")
  })
})

// Collection variables — only the auto-seeded baseUrl from the server URL
// survives. Other custom variables (tokens, IDs) are dropped on export.
describe("round-trip — collection variables", () => {
  it("LOSSY: collection variable definitions are dropped (only the seeded baseUrl from server URL survives)", async () => {
    const out = await roundTrip(
      buildColl({
        variables: [
          {
            key: "apiToken",
            initialValue: "tk-xxx",
            currentValue: "tk-xxx",
            secret: true,
          },
          {
            key: "tenantId",
            initialValue: "1234",
            currentValue: "1234",
            secret: false,
          },
        ],
        requests: [buildReq({ endpoint: "https://api.example.com/x" })],
      })
    )
    expect(out.variables.map((v) => v.key)).toEqual(["baseUrl"])
  })
})

// Folder hierarchy: tag splitting, marker, and importer integration.
// Pure-function tests for the segment helpers, plus integration tests that
// drive the full importer with synthetic OpenAPI fixtures.

describe("splitTagSegments", () => {
  it("splits on slash and filters empty segments", () => {
    expect(splitTagSegments("API/Users")).toEqual(["API", "Users"])
    expect(splitTagSegments("/API/Users/")).toEqual(["API", "Users"])
    expect(splitTagSegments("API//Users")).toEqual(["API", "Users"])
    expect(splitTagSegments("  API  /  Users  ")).toEqual(["API", "Users"])
    expect(splitTagSegments("Single")).toEqual(["Single"])
    expect(splitTagSegments("")).toEqual([])
  })
})

describe("hasSharedTagPathPrefix", () => {
  it("detects when one tag is a strict ancestor of another", () => {
    expect(hasSharedTagPathPrefix(["API", "API/Users"])).toBe(true)
  })

  it("detects when two tags share a non-empty segment prefix", () => {
    expect(hasSharedTagPathPrefix(["API/Users", "API/Posts"])).toBe(true)
  })

  it("returns false for unrelated single-segment tags", () => {
    expect(hasSharedTagPathPrefix(["Users", "Admin", "Reports"])).toBe(false)
  })

  it("returns false for a single tag with literal slashes (no companion)", () => {
    expect(hasSharedTagPathPrefix(["OAuth/PKCE"])).toBe(false)
    expect(hasSharedTagPathPrefix(["Admin/API"])).toBe(false)
  })

  it("returns false when two unrelated multi-segment tags don't share a prefix", () => {
    expect(hasSharedTagPathPrefix(["OAuth/PKCE", "Admin/API"])).toBe(false)
  })
})

describe("pickRequestFolderSegments", () => {
  it("returns the single literal tag when shouldSplit is false", () => {
    expect(pickRequestFolderSegments(["API/Users"], false)).toEqual([
      "API/Users",
    ])
  })

  it("picks the deepest tag among multi-tag operations", () => {
    expect(pickRequestFolderSegments(["API", "API/Users"], true)).toEqual([
      "API",
      "Users",
    ])
  })

  it("ties broken by first occurrence", () => {
    expect(pickRequestFolderSegments(["Foo/Bar", "Baz/Qux"], true)).toEqual([
      "Foo",
      "Bar",
    ])
  })

  it("returns empty for no tags", () => {
    expect(pickRequestFolderSegments([], true)).toEqual([])
    expect(pickRequestFolderSegments([], false)).toEqual([])
  })
})

// Test fixtures intentionally use permissively-typed OpenAPI documents so we
// can build minimal docs without satisfying every required field.
type DocOverrides = {
  paths: Record<string, unknown>
  info?: { title?: string; description?: string; version?: string }
  tags?: Array<{ name: string; description?: string }>
  [extension: `x-${string}`]: unknown
}

const buildOpenAPIDoc = (overrides: DocOverrides): OpenAPI.Document =>
  ({
    openapi: "3.1.0",
    info: { title: "Test", version: "1.0.0" },
    ...overrides,
  }) as unknown as OpenAPI.Document

type OpStub = {
  summary: string
  operationId: string
  tags: string[]
  responses: Record<string, { description: string }>
}

const op = (tags: string[], summary: string): OpStub => ({
  summary,
  operationId: summary.replace(/\W+/g, "_"),
  tags,
  responses: { "200": { description: "ok" } },
})

const runImport = async (doc: OpenAPI.Document) => {
  const result = await convertOpenApiDocsToHopp([doc])()
  if (result._tag === "Left") throw new Error(result.left as string)
  return result.right[0]
}

describe("convertOpenApiDocsToHopp — folder hierarchy", () => {
  it("nests folders when tags use slash convention with prefix tree", async () => {
    const doc = buildOpenAPIDoc({
      paths: {
        "/users": { get: op(["API/Users"], "List") },
        "/users/{id}": { get: op(["API/Users"], "Get") },
        "/posts": { get: op(["API/Posts"], "ListPosts") },
      },
    })
    const coll = await runImport(doc)

    expect(coll.folders).toHaveLength(1)
    expect(coll.folders[0].name).toBe("API")
    expect(coll.folders[0].folders).toHaveLength(2)
    const folderNames = coll.folders[0].folders.map((f) => f.name).sort()
    expect(folderNames).toEqual(["Posts", "Users"])
  })

  it("places multi-tag operations at the deepest tag location only (no duplication)", async () => {
    const doc = buildOpenAPIDoc({
      paths: {
        "/users/{id}": { get: op(["API", "API/Users"], "GetUser") },
      },
    })
    const coll = await runImport(doc)

    const apiFolder = coll.folders.find((f) => f.name === "API")!
    expect(apiFolder).toBeDefined()
    expect(apiFolder.requests).toHaveLength(0)
    const usersFolder = apiFolder.folders.find((f) => f.name === "Users")!
    expect(usersFolder.requests).toHaveLength(1)
    expect(usersFolder.requests[0].name).toBe("GetUser")
  })

  it("respects the explicit Hoppscotch marker even with a single nested tag", async () => {
    // Heuristic alone wouldn't split a lone "API/Users" — the marker forces it.
    const doc = buildOpenAPIDoc({
      "x-hoppscotch-folder-tags": "slash",
      paths: { "/x": { get: op(["API/Users"], "X") } },
    })
    const coll = await runImport(doc)

    expect(coll.folders).toHaveLength(1)
    expect(coll.folders[0].name).toBe("API")
    expect(coll.folders[0].folders).toHaveLength(1)
    expect(coll.folders[0].folders[0].name).toBe("Users")
    expect(coll.folders[0].folders[0].requests).toHaveLength(1)
  })

  it("keeps tags flat for a doc with literal-slash tag and no marker", async () => {
    const doc = buildOpenAPIDoc({
      paths: {
        "/auth/pkce": { get: op(["OAuth/PKCE"], "Authorize") },
      },
    })
    const coll = await runImport(doc)

    expect(coll.folders).toHaveLength(1)
    expect(coll.folders[0].name).toBe("OAuth/PKCE")
    expect(coll.folders[0].folders).toHaveLength(0)
  })

  it("seeds a baseUrl collection variable from servers[0].url and parametrizes endpoints", async () => {
    const doc = buildOpenAPIDoc({
      servers: [{ url: "https://api.petstore.com" }],
      paths: { "/v1/pets": { get: op([], "List") } },
    } as DocOverrides)
    const coll = await runImport(doc)

    expect(coll.variables).toEqual([
      {
        key: "baseUrl",
        initialValue: "https://api.petstore.com",
        currentValue: "https://api.petstore.com",
        secret: false,
      },
    ])
    expect(restRequestsOf(coll)[0]?.endpoint).toBe("<<baseUrl>>/v1/pets")
  })

  it("does not seed a baseUrl variable when the doc has no servers", async () => {
    const doc = buildOpenAPIDoc({
      paths: { "/health": { get: op([], "Health") } },
    })
    const coll = await runImport(doc)

    expect(coll.variables).toEqual([])
    expect(restRequestsOf(coll)[0]?.endpoint).toBe("<<baseUrl>>/health")
  })

  it("places untagged operations at the root", async () => {
    const doc = buildOpenAPIDoc({
      paths: { "/health": { get: op([], "Health") } },
    })
    const coll = await runImport(doc)

    expect(coll.requests).toHaveLength(1)
    expect(coll.requests[0].name).toBe("Health")
    expect(coll.folders).toHaveLength(0)
  })

  it("applies tag descriptions at the matching folder level", async () => {
    const doc = buildOpenAPIDoc({
      tags: [
        { name: "API", description: "Top-level API" },
        { name: "API/Users", description: "User endpoints" },
      ],
      paths: { "/users": { get: op(["API/Users"], "Get") } },
    })
    const coll = await runImport(doc)

    expect(coll.folders[0].name).toBe("API")
    expect(coll.folders[0].description).toBe("Top-level API")
    expect(coll.folders[0].folders[0].name).toBe("Users")
    expect(coll.folders[0].folders[0].description).toBe("User endpoints")
  })

  it("collapses normalized-equivalent tags (API//Users === API/Users)", async () => {
    const doc = buildOpenAPIDoc({
      "x-hoppscotch-folder-tags": "slash",
      tags: [
        { name: "API//Users", description: "first" },
        { name: "API/Users", description: "second" },
      ],
      paths: {
        "/a": { get: op(["API//Users"], "A") },
        "/b": { get: op(["API/Users"], "B") },
      },
    })
    const coll = await runImport(doc)

    expect(coll.folders).toHaveLength(1)
    const usersFolder = coll.folders[0].folders[0]
    expect(usersFolder.name).toBe("Users")
    expect(usersFolder.requests).toHaveLength(2)
    expect(usersFolder.description).toBe("first")
  })
})

// Export -> import round-trip specifically for folder-related concerns
// (marker emission, name preservation, leading <<var>> handling).
describe("export → import round-trip preserves folder hierarchy", () => {
  it("a single nested folder survives round-trip via the Hoppscotch marker", async () => {
    const original = buildColl({
      name: "Original",
      folders: [
        buildColl({
          name: "API",
          folders: [
            buildColl({
              name: "Users",
              requests: [
                buildReq({
                  name: "Get",
                  endpoint: "https://api.example.com/users/<<id>>",
                }),
              ],
            }),
          ],
        }),
      ],
    })

    const { doc } = hoppCollectionToOpenAPI(original)
    expect((doc as Record<string, unknown>)["x-hoppscotch-folder-tags"]).toBe(
      "slash"
    )

    const imported = await (async () => {
      const r = await convertOpenApiDocsToHopp([doc as OpenAPI.Document])()
      if (r._tag === "Left") throw new Error(r.left as string)
      return r.right[0]
    })()

    expect(imported.folders).toHaveLength(1)
    expect(imported.folders[0].name).toBe("API")
    expect(imported.folders[0].folders).toHaveLength(1)
    expect(imported.folders[0].folders[0].name).toBe("Users")
    expect(imported.folders[0].folders[0].requests).toHaveLength(1)
    expect(imported.folders[0].folders[0].requests[0].name).toBe("Get")
  })

  it("preserves spaces in request names through round-trip", async () => {
    // Regression: importer used to prefer `operationId` (sanitized, e.g.
    // `Get_Pet`) over `summary` (human-readable, e.g. `Get Pet`), so a
    // round-trip turned `Get Pet` into `Get_Pet`.
    const original = buildColl({
      requests: [
        buildReq({
          name: "Get Pet",
          endpoint: "https://api.example.com/pets/9704",
        }),
      ],
    })
    const { doc } = hoppCollectionToOpenAPI(original)

    const imported = await (async () => {
      const r = await convertOpenApiDocsToHopp([doc as OpenAPI.Document])()
      if (r._tag === "Left") throw new Error(r.left as string)
      return r.right[0]
    })()

    expect(imported.requests[0].name).toBe("Get Pet")
  })

  it("does not double-prefix endpoints that start with a Hoppscotch <<var>>", async () => {
    // Regression: `<<baseUrl>>/pets/9704` round-tripped as
    // `<<baseUrl>>/<<baseUrl>>/pets/9704` because the export side kept the
    // variable inside the path key. After the fix, the variable becomes the
    // server and the path is just `/pets/9704`.
    const original = buildColl({
      name: "Pets",
      requests: [
        buildReq({
          name: "Get pet",
          endpoint: "<<baseUrl>>/pets/9704",
        }),
      ],
    })

    const { doc } = hoppCollectionToOpenAPI(original)

    const imported = await (async () => {
      const r = await convertOpenApiDocsToHopp([doc as OpenAPI.Document])()
      if (r._tag === "Left") throw new Error(r.left as string)
      return r.right[0]
    })()

    expect(imported.requests).toHaveLength(1)
    expect(restRequestsOf(imported)[0]?.endpoint).toBe("<<baseUrl>>/pets/9704")
  })
})

// Backward compatibility: OpenAPI 3.0.x and Swagger 2.0.
// The 3.1 fixes (collection-level auth, parameter value preservation,
// multipart isFile, baseUrl seeding) were primarily exercised through 3.1
// round-trips. These tests run equivalent docs in 3.0 and 2.0 shape to
// surface any version-specific regressions.

const importDoc = async (raw: unknown) => {
  const r = await convertOpenApiDocsToHopp([raw as OpenAPI.Document])()
  if (r._tag === "Left") throw new Error(r.left as string)
  return r.right[0]
}

describe("OpenAPI 3.0.x compatibility", () => {
  it("imports a 3.0 doc with servers + components.securitySchemes", async () => {
    const doc = {
      openapi: "3.0.0",
      info: { title: "Petstore 3.0", version: "1.0.0" },
      servers: [{ url: "https://api.petstore.com" }],
      paths: {
        "/pets": {
          get: {
            summary: "List pets",
            operationId: "listPets",
            tags: ["pets"],
            parameters: [
              {
                name: "limit",
                in: "query",
                description: "Max items",
                schema: { type: "integer" },
                example: 20,
              },
            ],
            responses: { "200": { description: "ok" } },
          },
        },
      },
      components: {
        securitySchemes: {
          basicAuth: { type: "http", scheme: "basic" },
        },
      },
      security: [{ basicAuth: [] }],
    }
    const c = await importDoc(doc)
    expect(c.variables[0]?.key).toBe("baseUrl")
    expect(c.variables[0]?.currentValue).toBe("https://api.petstore.com")
    expect(c.auth.authType).toBe("basic")
    const req = c.folders[0]?.requests[0] ?? c.requests[0]
    expect(req?.auth.authType).toBe("inherit")
    const limit = (
      req as { params?: Array<{ key: string; value: string }> }
    )?.params?.find((p) => p.key === "limit")
    expect(limit?.value).toBe("20")
  })

  it("imports a 3.0 doc with operation-level security override", async () => {
    const doc = {
      openapi: "3.0.0",
      info: { title: "X", version: "1.0.0" },
      paths: {
        "/public": {
          get: {
            operationId: "publicGet",
            security: [],
            responses: { "200": { description: "ok" } },
          },
        },
      },
      components: {
        securitySchemes: {
          basicAuth: { type: "http", scheme: "basic" },
        },
      },
      security: [{ basicAuth: [] }],
    }
    const c = await importDoc(doc)
    expect(c.auth.authType).toBe("basic")
    expect(c.requests[0]?.auth.authType).toBe("none")
  })
})

describe("Swagger 2.0 compatibility", () => {
  it("seeds baseUrl from host + basePath + scheme", async () => {
    const doc = {
      swagger: "2.0",
      info: { title: "Swagger 2", version: "1.0.0" },
      host: "api.petstore.com",
      basePath: "/v2",
      schemes: ["https"],
      paths: {
        "/pets": {
          get: {
            operationId: "listPets",
            responses: { "200": { description: "ok" } },
          },
        },
      },
    }
    const c = await importDoc(doc)
    expect(c.variables[0]?.key).toBe("baseUrl")
    // Should be a fully-qualified URL — without the scheme, the variable
    // value isn't a usable URL at runtime.
    expect(c.variables[0]?.currentValue).toBe("https://api.petstore.com/v2")
    expect(c.requests[0]?.endpoint).toBe("<<baseUrl>>/pets")
  })

  it("falls back to https when schemes is missing", async () => {
    const doc = {
      swagger: "2.0",
      info: { title: "X", version: "1.0.0" },
      host: "api.example.com",
      basePath: "/v1",
      paths: {
        "/x": {
          get: {
            operationId: "x",
            responses: { "200": { description: "ok" } },
          },
        },
      },
    }
    const c = await importDoc(doc)
    expect(c.variables[0]?.currentValue).toBe("https://api.example.com/v1")
  })

  it("imports query param with default value", async () => {
    const doc = {
      swagger: "2.0",
      info: { title: "X", version: "1.0.0" },
      host: "api.example.com",
      paths: {
        "/search": {
          get: {
            operationId: "search",
            parameters: [
              {
                name: "q",
                in: "query",
                type: "string",
                default: "hello",
              },
            ],
            responses: { "200": { description: "ok" } },
          },
        },
      },
    }
    const c = await importDoc(doc)
    const params =
      (c.requests[0] as { params?: Array<{ key: string; value: string }> })
        ?.params ?? []
    const q = params.find((p) => p.key === "q")
    // V2 widely uses `default` for example values; we should preserve it.
    expect(q?.value).toBe("hello")
  })

  it("imports collection-level securityDefinitions + security", async () => {
    const doc = {
      swagger: "2.0",
      info: { title: "X", version: "1.0.0" },
      host: "api.example.com",
      paths: {
        "/things": {
          get: {
            operationId: "listThings",
            responses: { "200": { description: "ok" } },
          },
        },
      },
      securityDefinitions: {
        basicAuth: { type: "basic" },
      },
      security: [{ basicAuth: [] }],
    }
    const c = await importDoc(doc)
    expect(c.auth.authType).toBe("basic")
    expect(c.requests[0]?.auth.authType).toBe("inherit")
  })

  it("imports a multipart formData body with isFile flag", async () => {
    const doc = {
      swagger: "2.0",
      info: { title: "X", version: "1.0.0" },
      host: "api.example.com",
      paths: {
        "/upload": {
          post: {
            operationId: "upload",
            consumes: ["multipart/form-data"],
            parameters: [
              { name: "name", in: "formData", type: "string" },
              { name: "avatar", in: "formData", type: "file" },
            ],
            responses: { "200": { description: "ok" } },
          },
        },
      },
    }
    const c = await importDoc(doc)
    const body =
      (
        c.requests[0] as {
          body?: {
            contentType?: string
            body?: Array<{ key: string; isFile: boolean }>
          }
        }
      )?.body ?? {}
    expect(body.contentType).toBe("multipart/form-data")
    if (Array.isArray(body.body)) {
      const avatar = body.body.find((e) => e.key === "avatar")
      expect(avatar?.isFile).toBe(true)
    }
  })
})
