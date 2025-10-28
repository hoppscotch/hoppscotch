import { HoppRESTAuth, HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://example.com/api/users?filter=active&sort=name",
  method: "GET",
  headers: [
    {
      key: "Content-Type",
      value: "application/json",
      active: true,
      description: "",
    },
    {
      key: "Authorization",
      value: "Bearer token123",
      active: true,
      description: "",
    },
  ],
  params: [
    { key: "filter", value: "active", active: true, description: "" },
    { key: "sort", value: "name", active: true, description: "" },
  ],
  body: { contentType: null, body: null },
  auth: { authType: "none", authActive: false },
  preRequestScript: "",
  testScript: "",
  requestVariables: [],
  responses: {},
}

const envs = { global: [], selected: [] }

describe("pm.request URL property mutations", () => {
  test("pm.request.url.protocol mutation changes protocol from https to http", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial protocol:", pm.request.url.protocol)
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url.protocol = 'http'

        console.log("Updated protocol:", pm.request.url.protocol)
        console.log("Updated URL:", pm.request.url.toString())
        console.log("hopp.request.url:", hopp.request.url)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("http://example.com"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial protocol:", "https"] }),
          expect.objectContaining({ args: ["Updated protocol:", "http"] }),
          expect.objectContaining({
            args: expect.arrayContaining([
              "Updated URL:",
              expect.stringContaining("http://"),
            ]),
          }),
        ]),
      })
    )
  })

  test("pm.request.url.host mutation changes hostname", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial host:", pm.request.url.host)
        console.log("Initial hostname:", pm.request.url.host.join('.'))

        pm.request.url.host = ['api', 'newdomain', 'com']

        console.log("Updated host:", pm.request.url.host)
        console.log("Updated hostname:", pm.request.url.host.join('.'))
        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("api.newdomain.com"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial host:", ["example", "com"]],
          }),
          expect.objectContaining({
            args: ["Updated host:", ["api", "newdomain", "com"]],
          }),
          expect.objectContaining({
            args: ["Updated hostname:", "api.newdomain.com"],
          }),
        ]),
      })
    )
  })

  test("pm.request.url.path mutation changes URL path", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial path:", pm.request.url.path)

        pm.request.url.path = ['v2', 'posts', '123']

        console.log("Updated path:", pm.request.url.path)
        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("/v2/posts/123"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial path:", ["api", "users"]],
          }),
          expect.objectContaining({
            args: ["Updated path:", ["v2", "posts", "123"]],
          }),
        ]),
      })
    )
  })

  test("pm.request.url.port mutation changes port", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial port:", pm.request.url.port)

        pm.request.url.port = '8080'

        console.log("Updated port:", pm.request.url.port)
        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining(":8080"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial port:", "443"] }),
          expect.objectContaining({ args: ["Updated port:", "8080"] }),
        ]),
      })
    )
  })

  test("multiple URL property mutations are applied sequentially", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url.protocol = 'http'
        console.log("After protocol:", pm.request.url.toString())

        pm.request.url.host = ['api', 'test', 'com']
        console.log("After host:", pm.request.url.toString())

        pm.request.url.path = ['v3', 'data']
        console.log("After path:", pm.request.url.toString())

        pm.request.url.port = '3000'
        console.log("Final URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "http://api.test.com:3000/v3/data?filter=active&sort=name",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: expect.arrayContaining([
              "Final URL:",
              "http://api.test.com:3000/v3/data?filter=active&sort=name",
            ]),
          }),
        ]),
      })
    )
  })

  test("pm.request.url.toString() returns dynamically updated URL", () => {
    return expect(
      runPreRequestScript(
        `
        const url1 = pm.request.url.toString()
        console.log("URL before mutation:", url1)

        pm.request.url.protocol = 'http'
        pm.request.url.path = ['updated']

        const url2 = pm.request.url.toString()
        console.log("URL after mutation:", url2)

        console.log("URLs are different:", url1 !== url2)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "URL before mutation:",
              "https://example.com/api/users?filter=active&sort=name",
            ],
          }),
          expect.objectContaining({
            args: [
              "URL after mutation:",
              "http://example.com/updated?filter=active&sort=name",
            ],
          }),
          expect.objectContaining({
            args: ["URLs are different:", true],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query methods", () => {
  test("pm.request.url.query.add() adds new query parameter", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial query params:", pm.request.url.query.all())

        pm.request.url.query.add({ key: 'limit', value: '10' })

        console.log("Updated query params:", pm.request.url.query.all())
        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("limit=10"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial query params:", { filter: "active", sort: "name" }],
          }),
          expect.objectContaining({
            args: [
              "Updated query params:",
              { filter: "active", sort: "name", limit: "10" },
            ],
          }),
        ]),
      })
    )
  })

  test("pm.request.url.query.add() with empty value", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.add({ key: 'flag' })

        console.log("Query params:", pm.request.url.query.all())
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("flag="),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Query params:",
              { filter: "active", sort: "name", flag: "" },
            ],
          }),
        ]),
      })
    )
  })

  test("pm.request.url.query.remove() removes existing query parameter", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial query params:", pm.request.url.query.all())

        pm.request.url.query.remove('filter')

        console.log("Updated query params:", pm.request.url.query.all())
        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://example.com/api/users?sort=name",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Updated query params:", { sort: "name" }],
          }),
        ]),
      })
    )
  })

  test("pm.request.url.query.remove() handles non-existent parameter gracefully", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial query params:", pm.request.url.query.all())

        pm.request.url.query.remove('nonexistent')

        console.log("Updated query params:", pm.request.url.query.all())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: baseRequest.endpoint,
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Updated query params:", { filter: "active", sort: "name" }],
          }),
        ]),
      })
    )
  })

  test("pm.request.url.query.all() returns all query parameters as object", () => {
    return expect(
      runPreRequestScript(
        `
        const allParams = pm.request.url.query.all()
        console.log("All params:", allParams)
        console.log("Filter param:", allParams.filter)
        console.log("Sort param:", allParams.sort)
        console.log("Param count:", Object.keys(allParams).length)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["All params:", { filter: "active", sort: "name" }],
          }),
          expect.objectContaining({
            args: ["Filter param:", "active"],
          }),
          expect.objectContaining({
            args: ["Sort param:", "name"],
          }),
          expect.objectContaining({
            args: ["Param count:", 2],
          }),
        ]),
      })
    )
  })

  test("multiple query mutations work correctly", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial:", pm.request.url.query.all())

        pm.request.url.query.add({ key: 'page', value: '1' })
        console.log("After add:", pm.request.url.query.all())

        pm.request.url.query.add({ key: 'limit', value: '20' })
        console.log("After second add:", pm.request.url.query.all())

        pm.request.url.query.remove('sort')
        console.log("After remove:", pm.request.url.query.all())

        console.log("Final URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint:
            "https://example.com/api/users?filter=active&page=1&limit=20",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "After remove:",
              { filter: "active", page: "1", limit: "20" },
            ],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url string assignment", () => {
  test("pm.request.url string assignment replaces entire URL", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url = "http://newapi.example.com:8080/v2/posts?id=5"

        console.log("Updated URL:", pm.request.url.toString())
        console.log("Updated protocol:", pm.request.url.protocol)
        console.log("Updated host:", pm.request.url.host)
        console.log("Updated path:", pm.request.url.path)
        console.log("Updated query:", pm.request.url.query.all())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "http://newapi.example.com:8080/v2/posts?id=5",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Updated protocol:", "http"] }),
          expect.objectContaining({
            args: ["Updated host:", ["newapi", "example", "com"]],
          }),
          expect.objectContaining({ args: ["Updated path:", ["v2", "posts"]] }),
          expect.objectContaining({ args: ["Updated query:", { id: "5" }] }),
        ]),
      })
    )
  })

  test("pm.request.url string assignment followed by property mutations", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url = "https://api.example.com/users"
        console.log("After string assignment:", pm.request.url.toString())

        pm.request.url.path = ['posts', '42']
        console.log("After path mutation:", pm.request.url.toString())

        pm.request.url.query.add({ key: 'include', value: 'comments' })
        console.log("Final URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/posts/42?include=comments",
        }),
      })
    )
  })
})

describe("pm.request method mutations", () => {
  test("pm.request.method mutation changes HTTP method", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial method:", pm.request.method)

        pm.request.method = 'POST'

        console.log("Updated method:", pm.request.method)
        console.log("hopp.request.method:", hopp.request.method)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          method: "POST",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial method:", "GET"] }),
          expect.objectContaining({ args: ["Updated method:", "POST"] }),
          expect.objectContaining({ args: ["hopp.request.method:", "POST"] }),
        ]),
      })
    )
  })

  test("pm.request.method preserves case (matches Postman)", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.method = 'put'
        console.log("Method (lowercase input):", pm.request.method)

        pm.request.method = 'DeLeTe'
        console.log("Method (mixed case input):", pm.request.method)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          method: "DeLeTe",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Method (lowercase input):", "put"],
          }),
          expect.objectContaining({
            args: ["Method (mixed case input):", "DeLeTe"],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.headers mutations", () => {
  test("pm.request.headers.add() adds new header", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial X-Custom-Header:", pm.request.headers.get("X-Custom-Header"))

        pm.request.headers.add({ key: 'X-Custom-Header', value: 'custom-value' })

        console.log("Updated X-Custom-Header:", pm.request.headers.get("X-Custom-Header"))
        console.log("Has X-Custom-Header:", pm.request.headers.has("X-Custom-Header"))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({
              key: "X-Custom-Header",
              value: "custom-value",
            }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial X-Custom-Header:", null] }),
          expect.objectContaining({
            args: ["Updated X-Custom-Header:", "custom-value"],
          }),
          expect.objectContaining({ args: ["Has X-Custom-Header:", true] }),
        ]),
      })
    )
  })

  test("pm.request.headers.upsert() updates existing header", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial Content-Type:", pm.request.headers.get("Content-Type"))

        pm.request.headers.upsert({ key: 'Content-Type', value: 'application/xml' })

        console.log("Updated Content-Type:", pm.request.headers.get("Content-Type"))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({
              key: "Content-Type",
              value: "application/xml",
            }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial Content-Type:", "application/json"],
          }),
          expect.objectContaining({
            args: ["Updated Content-Type:", "application/xml"],
          }),
        ]),
      })
    )
  })

  test("pm.request.headers.upsert() adds header if not exists", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial X-New-Header:", pm.request.headers.get("X-New-Header"))

        pm.request.headers.upsert({ key: 'X-New-Header', value: 'new-value' })

        console.log("Updated X-New-Header:", pm.request.headers.get("X-New-Header"))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({
              key: "X-New-Header",
              value: "new-value",
            }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial X-New-Header:", null] }),
          expect.objectContaining({
            args: ["Updated X-New-Header:", "new-value"],
          }),
        ]),
      })
    )
  })

  test("pm.request.headers.remove() removes header", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial Authorization:", pm.request.headers.get("Authorization"))
        console.log("Initial has Authorization:", pm.request.headers.has("Authorization"))

        pm.request.headers.remove("Authorization")

        console.log("Updated Authorization:", pm.request.headers.get("Authorization"))
        console.log("Updated has Authorization:", pm.request.headers.has("Authorization"))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.not.arrayContaining([
            expect.objectContaining({ key: "Authorization" }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial Authorization:", "Bearer token123"],
          }),
          expect.objectContaining({
            args: ["Initial has Authorization:", true],
          }),
          expect.objectContaining({ args: ["Updated Authorization:", null] }),
          expect.objectContaining({
            args: ["Updated has Authorization:", false],
          }),
        ]),
      })
    )
  })

  test("multiple header mutations work correctly", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.add({ key: 'X-Header-1', value: 'value1' })
        pm.request.headers.add({ key: 'X-Header-2', value: 'value2' })
        console.log("After adds - X-Header-1:", pm.request.headers.get("X-Header-1"))
        console.log("After adds - X-Header-2:", pm.request.headers.get("X-Header-2"))

        pm.request.headers.upsert({ key: 'X-Header-1', value: 'updated-value1' })
        console.log("After upsert - X-Header-1:", pm.request.headers.get("X-Header-1"))

        pm.request.headers.remove('X-Header-2')
        console.log("After remove - X-Header-2:", pm.request.headers.get("X-Header-2"))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({
              key: "X-Header-1",
              value: "updated-value1",
            }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["After upsert - X-Header-1:", "updated-value1"],
          }),
          expect.objectContaining({
            args: ["After remove - X-Header-2:", null],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.body mutations", () => {
  test("pm.request.body.update() changes request body with Postman format", () => {
    const requestWithBody: HoppRESTRequest = {
      ...baseRequest,
      body: {
        contentType: "application/json",
        body: '{"name": "John"}',
      },
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial body:", pm.request.body)

        pm.request.body.update({
          mode: 'raw',
          raw: '{"name": "Jane", "age": 30}',
          options: { raw: { language: 'json' } }
        })

        console.log("Updated body:", pm.request.body)
        console.log("hopp.request.body:", hopp.request.body)
        `,
        { envs, request: requestWithBody }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: {
            contentType: "application/json",
            body: '{"name": "Jane", "age": 30}',
          },
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: expect.arrayContaining([
              "Initial body:",
              expect.objectContaining({ contentType: "application/json" }),
            ]),
          }),
          expect.objectContaining({
            args: expect.arrayContaining([
              "Updated body:",
              expect.objectContaining({
                contentType: "application/json",
                body: '{"name": "Jane", "age": 30}',
              }),
            ]),
          }),
        ]),
      })
    )
  })

  test("pm.request.body.update() with string directly", () => {
    const requestWithBody: HoppRESTRequest = {
      ...baseRequest,
      body: {
        contentType: "application/json",
        body: '{"data": "original"}',
      },
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial body:", pm.request.body)

        pm.request.body.update('plain text body')

        console.log("Updated body:", pm.request.body)
        console.log("Content-Type:", pm.request.body.contentType)
        `,
        { envs, request: requestWithBody }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: {
            contentType: "text/plain",
            body: "plain text body",
          },
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Content-Type:", "text/plain"] }),
        ]),
      })
    )
  })
})

describe("pm.request.auth mutations", () => {
  test("pm.request.auth setter changes authentication", () => {
    const newAuth: HoppRESTAuth = {
      authType: "bearer",
      token: "new-bearer-token-xyz",
      authActive: true,
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial auth type:", pm.request.auth.authType)

        pm.request.auth = ${JSON.stringify(newAuth)}

        console.log("Updated auth type:", pm.request.auth.authType)
        console.log("Updated auth token:", pm.request.auth.token)
        console.log("hopp.request.auth:", hopp.request.auth)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: newAuth,
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial auth type:", "none"] }),
          expect.objectContaining({ args: ["Updated auth type:", "bearer"] }),
          expect.objectContaining({
            args: ["Updated auth token:", "new-bearer-token-xyz"],
          }),
        ]),
      })
    )
  })

  test("pm.request.auth setter replaces entire auth object", () => {
    const requestWithAuth: HoppRESTRequest = {
      ...baseRequest,
      auth: {
        authType: "bearer",
        token: "original-token",
        authActive: true,
      },
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial auth:", pm.request.auth)

        pm.request.auth = {
          authType: 'basic',
          username: 'user',
          password: 'pass',
          authActive: true
        }

        console.log("Updated auth:", pm.request.auth)
        console.log("Auth type changed:", pm.request.auth.authType)
        `,
        { envs, request: requestWithAuth }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: expect.objectContaining({
            authType: "basic",
            username: "user",
            password: "pass",
          }),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Auth type changed:", "basic"] }),
        ]),
      })
    )
  })

  test("pm.request.auth can be set to null to disable auth", () => {
    const requestWithAuth: HoppRESTRequest = {
      ...baseRequest,
      auth: {
        authType: "bearer",
        token: "some-token",
        authActive: true,
      },
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial auth active:", pm.request.auth.authActive)
        console.log("Initial auth type:", pm.request.auth.authType)

        pm.request.auth = null

        console.log("Updated auth active:", pm.request.auth.authActive)
        console.log("Updated auth type:", pm.request.auth.authType)
        `,
        { envs, request: requestWithAuth }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: {
            authType: "none",
            authActive: false,
          },
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial auth active:", true] }),
          expect.objectContaining({ args: ["Updated auth active:", false] }),
          expect.objectContaining({ args: ["Updated auth type:", "none"] }),
        ]),
      })
    )
  })
})

describe("pm.request combined mutations", () => {
  test("multiple different mutation types work together", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("=== Initial State ===")
        console.log("URL:", pm.request.url.toString())
        console.log("Method:", pm.request.method)
        console.log("Content-Type:", pm.request.headers.get("Content-Type"))

        // Change URL
        pm.request.url = "https://api.example.com/v2/data"
        pm.request.url.protocol = 'http'
        pm.request.url.query.add({ key: 'page', value: '1' })

        // Change method
        pm.request.method = 'POST'

        // Change headers
        pm.request.headers.upsert({ key: 'Content-Type', value: 'application/xml' })
        pm.request.headers.add({ key: 'X-API-Key', value: 'secret123' })

        console.log("=== Final State ===")
        console.log("URL:", pm.request.url.toString())
        console.log("Method:", pm.request.method)
        console.log("Content-Type:", pm.request.headers.get("Content-Type"))
        console.log("X-API-Key:", pm.request.headers.get("X-API-Key"))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "http://api.example.com/v2/data?page=1",
          method: "POST",
          headers: expect.arrayContaining([
            expect.objectContaining({
              key: "Content-Type",
              value: "application/xml",
            }),
            expect.objectContaining({ key: "X-API-Key", value: "secret123" }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["URL:", "http://api.example.com/v2/data?page=1"],
          }),
          expect.objectContaining({ args: ["Method:", "POST"] }),
          expect.objectContaining({
            args: ["Content-Type:", "application/xml"],
          }),
          expect.objectContaining({ args: ["X-API-Key:", "secret123"] }),
        ]),
      })
    )
  })

  test("mutations persist across multiple reads", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.protocol = 'http'
        const url1 = pm.request.url.toString()

        pm.request.url.path = ['updated', 'path']
        const url2 = pm.request.url.toString()

        pm.request.url.query.add({ key: 'test', value: 'value' })
        const url3 = pm.request.url.toString()

        console.log("URL after 1st mutation:", url1)
        console.log("URL after 2nd mutation:", url2)
        console.log("URL after 3rd mutation:", url3)
        console.log("Current URL:", pm.request.url.toString())
        console.log("hopp.request.url:", hopp.request.url)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: expect.arrayContaining([
              "URL after 1st mutation:",
              expect.stringContaining("http://"),
            ]),
          }),
          expect.objectContaining({
            args: expect.arrayContaining([
              "URL after 2nd mutation:",
              expect.stringContaining("/updated/path"),
            ]),
          }),
          expect.objectContaining({
            args: expect.arrayContaining([
              "URL after 3rd mutation:",
              expect.stringContaining("test=value"),
            ]),
          }),
        ]),
      })
    )
  })
})
