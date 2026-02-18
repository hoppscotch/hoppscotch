import { describe, expect, it } from "vitest"
import {
  makeRESTRequest,
  getDefaultRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { hoppCollectionToOpenAPI } from "../openapi"

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
    ...overrides,
  })
}

function buildRequest(
  overrides: Partial<Parameters<typeof makeRESTRequest>[0]> = {}
) {
  const base = getDefaultRESTRequest()
  return makeRESTRequest({
    ...base,
    ...overrides,
  })
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

      expect(doc.paths["/users"]).toBeDefined()
      expect(doc.paths["/users"]!.get).toBeDefined()
      expect(doc.paths["/users"]!.get!.summary).toBe("Get Users")
      expect(doc.paths["/users"]!.get!.operationId).toBe("Get_Users")
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
      expect(doc.paths["/api/test"]).toBeDefined()
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

      expect(doc.paths["/users/{id}"]).toBeDefined()
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
      const params = doc.paths["/users/{id}/posts/{postId}"]!.get!
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
      const params = doc.paths["/users/{id}"]!.get!.parameters as any[]

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

      expect(doc.paths["/users"]!.get!.operationId).toBe("Get_Users")
      expect(doc.paths["/users"]!.post!.operationId).toBe("Get_Users_2")
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

      expect(doc.paths["/users"]!.get!.operationId).toBe("get_users")
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

      expect(doc.paths["/users"]!.get).toBeDefined()
      expect(doc.paths["/users"]!.post).toBeDefined()
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

      expect(doc.paths["/users"]!.get!.description).toBe("Fetches all users")
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
              { key: "q", value: "test", active: true },
              { key: "inactive", value: "skip", active: false },
            ],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths["/search"]!.get!.parameters as any[]

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
            headers: [{ key: "X-Custom", value: "val", active: true }],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths["/test"]!.get!.parameters as any[]

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
      const params = doc.paths["/users/{id}"]!.get!.parameters as any[]

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
            params: [{ key: "skip", value: "me", active: false }],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)

      expect(doc.paths["/test"]!.get!.parameters).toBeUndefined()
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
      const reqBody = doc.paths["/users"]!.post!.requestBody as any

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
      const reqBody = doc.paths["/test"]!.post!.requestBody as any

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
      const schema = (doc.paths["/upload"]!.post!.requestBody as any).content[
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
      const schema = (doc.paths["/login"]!.post!.requestBody as any).content[
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
      const reqBody = doc.paths["/text"]!.post!.requestBody as any

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

      expect(doc.paths["/test"]!.get!.requestBody).toBeUndefined()
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
      expect(doc.paths["/test"]!.get!.security).toEqual([{ basicAuth: [] }])
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
      expect(doc.paths["/test"]!.get!.security).toEqual([
        { oauth2: ["profile", "email"] },
      ])
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
      expect(doc.paths["/test"]!.get!.security).toEqual([{ jwtAuth: [] }])
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
      expect(doc.paths["/test"]!.get!.security).toBeUndefined()
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
      const params = doc.paths["/test"]!.get!.parameters as any[]

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
            headers: [{ key: "x-custom", value: "request-val", active: true }],
          }),
        ],
      })
      const { doc } = hoppCollectionToOpenAPI(collection)
      const params = doc.paths["/test"]!.get!.parameters as any[]

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
      expect(doc.paths["/users"]!.get!.tags).toEqual(["Users"])
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
      expect(doc.paths["/users"]!.get!.tags).toEqual(["API/Users"])
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

      expect(doc.paths["/health"]!.get!.tags).toBeUndefined()
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

      expect(doc.paths["/test"]!.get!.responses).toEqual({
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
      const resp = doc.paths["/test"]!.get!.responses["200"] as any

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
  })
})
