import { HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint:
    "https://api.example.com:8080/v1/users/profile?filter=active&sort=name",
  method: "GET",
  headers: [
    {
      key: "Content-Type",
      value: "application/json",
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

describe("pm.request.url.getHost()", () => {
  test("returns hostname as a string", () => {
    return expect(
      runPreRequestScript(
        `
        const host = pm.request.url.getHost()
        console.log("Host:", host)
        console.log("Host type:", typeof host)
        console.log("Is string:", typeof host === 'string')
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Host:", "api.example.com"] }),
          expect.objectContaining({ args: ["Host type:", "string"] }),
          expect.objectContaining({ args: ["Is string:", true] }),
        ]),
      })
    )
  })

  test("updates after host mutation", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial host:", pm.request.url.getHost())

        pm.request.url.host = ['newapi', 'test', 'com']

        console.log("Updated host:", pm.request.url.getHost())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial host:", "api.example.com"],
          }),
          expect.objectContaining({
            args: ["Updated host:", "newapi.test.com"],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.getPath()", () => {
  test("returns path as string with leading slash", () => {
    return expect(
      runPreRequestScript(
        `
        const path = pm.request.url.getPath()
        console.log("Path:", path)
        console.log("Starts with slash:", path.startsWith('/'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Path:", "/v1/users/profile"] }),
          expect.objectContaining({ args: ["Starts with slash:", true] }),
        ]),
      })
    )
  })

  test("returns '/' for empty path", () => {
    const requestWithoutPath: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com",
    }

    return expect(
      runPreRequestScript(
        `
        const path = pm.request.url.getPath()
        console.log("Path:", path)
        console.log("Is root:", path === '/')
        `,
        { envs, request: requestWithoutPath }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Path:", "/"] }),
          expect.objectContaining({ args: ["Is root:", true] }),
        ]),
      })
    )
  })

  test("updates after path mutation", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial path:", pm.request.url.getPath())

        pm.request.url.path = ['api', 'v2', 'posts']

        console.log("Updated path:", pm.request.url.getPath())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial path:", "/v1/users/profile"],
          }),
          expect.objectContaining({ args: ["Updated path:", "/api/v2/posts"] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.getPathWithQuery()", () => {
  test("returns path with query string", () => {
    return expect(
      runPreRequestScript(
        `
        const pathWithQuery = pm.request.url.getPathWithQuery()
        console.log("Path with query:", pathWithQuery)
        console.log("Includes path:", pathWithQuery.includes('/v1/users/profile'))
        console.log("Includes query:", pathWithQuery.includes('filter=active'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Path with query:",
              "/v1/users/profile?filter=active&sort=name",
            ],
          }),
          expect.objectContaining({ args: ["Includes path:", true] }),
          expect.objectContaining({ args: ["Includes query:", true] }),
        ]),
      })
    )
  })

  test("returns only path when no query parameters", () => {
    const requestWithoutQuery: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
      params: [],
    }

    return expect(
      runPreRequestScript(
        `
        const pathWithQuery = pm.request.url.getPathWithQuery()
        console.log("Path with query:", pathWithQuery)
        console.log("Has question mark:", pathWithQuery.includes('?'))
        `,
        { envs, request: requestWithoutQuery }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Path with query:", "/users"] }),
          expect.objectContaining({ args: ["Has question mark:", false] }),
        ]),
      })
    )
  })

  test("updates after query mutation", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial:", pm.request.url.getPathWithQuery())

        pm.request.url.query.add({ key: 'page', value: '5' })

        console.log("Updated:", pm.request.url.getPathWithQuery())
        console.log("Includes new param:", pm.request.url.getPathWithQuery().includes('page=5'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial:", "/v1/users/profile?filter=active&sort=name"],
          }),
          expect.objectContaining({
            args: [
              "Updated:",
              "/v1/users/profile?filter=active&sort=name&page=5",
            ],
          }),
          expect.objectContaining({ args: ["Includes new param:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.getQueryString()", () => {
  test("returns query string without leading question mark", () => {
    return expect(
      runPreRequestScript(
        `
        const queryString = pm.request.url.getQueryString()
        console.log("Query string:", queryString)
        console.log("Starts with question mark:", queryString.startsWith('?'))
        console.log("Contains filter:", queryString.includes('filter=active'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Query string:", "filter=active&sort=name"],
          }),
          expect.objectContaining({
            args: ["Starts with question mark:", false],
          }),
          expect.objectContaining({ args: ["Contains filter:", true] }),
        ]),
      })
    )
  })

  test("returns empty string when no query parameters", () => {
    const requestWithoutQuery: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
      params: [],
    }

    return expect(
      runPreRequestScript(
        `
        const queryString = pm.request.url.getQueryString()
        console.log("Query string:", queryString)
        console.log("Is empty:", queryString === '')
        console.log("Length:", queryString.length)
        `,
        { envs, request: requestWithoutQuery }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Query string:", ""] }),
          expect.objectContaining({ args: ["Is empty:", true] }),
          expect.objectContaining({ args: ["Length:", 0] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.getRemote()", () => {
  test("includes port when not standard (443/80)", () => {
    return expect(
      runPreRequestScript(
        `
        const remote = pm.request.url.getRemote()
        console.log("Remote:", remote)
        console.log("Includes port:", remote.includes(':8080'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Remote:", "api.example.com:8080"],
          }),
          expect.objectContaining({ args: ["Includes port:", true] }),
        ]),
      })
    )
  })

  test("excludes standard HTTPS port (443) by default", () => {
    const requestWithStandardPort: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
    }

    return expect(
      runPreRequestScript(
        `
        const remote = pm.request.url.getRemote()
        console.log("Remote:", remote)
        console.log("Has port in string:", remote.includes(':'))
        `,
        { envs, request: requestWithStandardPort }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Remote:", "api.example.com"] }),
          expect.objectContaining({ args: ["Has port in string:", false] }),
        ]),
      })
    )
  })

  test("forces port display when forcePort is true", () => {
    const requestWithStandardPort: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
    }

    return expect(
      runPreRequestScript(
        `
        const remote = pm.request.url.getRemote(true)
        console.log("Remote with forced port:", remote)
        console.log("Has port in string:", remote.includes(':443'))
        `,
        { envs, request: requestWithStandardPort }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Remote with forced port:", "api.example.com:443"],
          }),
          expect.objectContaining({ args: ["Has port in string:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.update()", () => {
  test("updates entire URL from string", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url.update('http://newapi.test.com:3000/v2/posts?id=123')

        console.log("Updated URL:", pm.request.url.toString())
        console.log("Protocol:", pm.request.url.protocol)
        console.log("Host:", pm.request.url.getHost())
        console.log("Port:", pm.request.url.port)
        console.log("Path:", pm.request.url.getPath())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "http://newapi.test.com:3000/v2/posts?id=123",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Protocol:", "http"] }),
          expect.objectContaining({ args: ["Host:", "newapi.test.com"] }),
          expect.objectContaining({ args: ["Port:", "3000"] }),
          expect.objectContaining({ args: ["Path:", "/v2/posts"] }),
        ]),
      })
    )
  })

  test("accepts object with toString() method", () => {
    return expect(
      runPreRequestScript(
        `
        const urlObj = {
          toString: () => 'https://custom.api.com/endpoint'
        }

        pm.request.url.update(urlObj)

        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://custom.api.com/endpoint",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Updated URL:", "https://custom.api.com/endpoint"],
          }),
        ]),
      })
    )
  })

  test("throws error for invalid input", () => {
    return expect(
      runPreRequestScript(
        `
        try {
          pm.request.url.update(12345)
          console.log("Should not reach here")
        } catch (error) {
          console.log("Error caught:", error.message)
        }
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: expect.arrayContaining([
              "Error caught:",
              expect.stringContaining("URL update requires"),
            ]),
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.addQueryParams()", () => {
  test("adds multiple query parameters", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial params:", pm.request.url.query.all())

        pm.request.url.addQueryParams([
          { key: 'page', value: '1' },
          { key: 'limit', value: '20' }
        ])

        console.log("Updated params:", pm.request.url.query.all())
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("page=1&limit=20"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Updated params:",
              { filter: "active", sort: "name", page: "1", limit: "20" },
            ],
          }),
        ]),
      })
    )
  })

  test("handles empty value parameters", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.addQueryParams([
          { key: 'flag' },
          { key: 'emptyValue', value: '' }
        ])

        console.log("Params:", pm.request.url.query.all())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Params:",
              { filter: "active", sort: "name", flag: "", emptyValue: "" },
            ],
          }),
        ]),
      })
    )
  })

  test("throws error for non-array input", () => {
    return expect(
      runPreRequestScript(
        `
        try {
          pm.request.url.addQueryParams({ key: 'test', value: '123' })
          console.log("Should not reach here")
        } catch (error) {
          console.log("Error caught:", error.message)
        }
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: expect.arrayContaining([
              "Error caught:",
              expect.stringContaining("requires an array"),
            ]),
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.removeQueryParams()", () => {
  test("removes single query parameter by name", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial params:", pm.request.url.query.all())

        pm.request.url.removeQueryParams('filter')

        console.log("Updated params:", pm.request.url.query.all())
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com:8080/v1/users/profile?sort=name",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Updated params:", { sort: "name" }],
          }),
        ]),
      })
    )
  })

  test("removes multiple query parameters by array", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial params:", pm.request.url.query.all())

        pm.request.url.removeQueryParams(['filter', 'sort'])

        console.log("Updated params:", pm.request.url.query.all())
        console.log("Params object is empty:", Object.keys(pm.request.url.query.all()).length === 0)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com:8080/v1/users/profile",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Updated params:", {}],
          }),
          expect.objectContaining({
            args: ["Params object is empty:", true],
          }),
        ]),
      })
    )
  })

  test("handles non-existent parameter names gracefully", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial params:", pm.request.url.query.all())

        pm.request.url.removeQueryParams(['nonexistent', 'alsoNotThere'])

        console.log("Updated params:", pm.request.url.query.all())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial params:", { filter: "active", sort: "name" }],
          }),
          expect.objectContaining({
            args: ["Updated params:", { filter: "active", sort: "name" }],
          }),
        ]),
      })
    )
  })
})
