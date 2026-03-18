import { HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://api.example.com/users",
  method: "POST",
  headers: [
    { key: "Content-Type", value: "application/json", active: true },
    { key: "Authorization", value: "Bearer token123", active: true },
    { key: "X-Custom-Header", value: "custom-value", active: true },
  ],
  params: [],
  body: { contentType: null, body: null },
  auth: { authType: "none", authActive: false },
  preRequestScript: "",
  testScript: "",
  requestVariables: [],
  responses: {},
}

const envs = { global: [], selected: [] }

describe("pm.request.headers.find()", () => {
  test("finds header by predicate function", () => {
    return expect(
      runPreRequestScript(
        `
        const result = pm.request.headers.find((header) => header.key === 'Authorization')

        console.log("Found header:", result)
        console.log("Header key:", result.key)
        console.log("Header value:", result.value)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Found header:",
              expect.objectContaining({
                key: "Authorization",
                value: "Bearer token123",
              }),
            ],
          }),
          expect.objectContaining({ args: ["Header key:", "Authorization"] }),
          expect.objectContaining({
            args: ["Header value:", "Bearer token123"],
          }),
        ]),
      })
    )
  })

  test("finds header by key string (case-insensitive)", () => {
    return expect(
      runPreRequestScript(
        `
        const result = pm.request.headers.find('content-type')

        console.log("Found by string:", result)
        console.log("Value:", result.value)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Found by string:",
              expect.objectContaining({
                key: "Content-Type",
                value: "application/json",
              }),
            ],
          }),
          expect.objectContaining({ args: ["Value:", "application/json"] }),
        ]),
      })
    )
  })

  test("returns null when header not found", () => {
    return expect(
      runPreRequestScript(
        `
        const result = pm.request.headers.find('Nonexistent-Header')

        console.log("Result:", result)
        console.log("Is null:", result === null)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Result:", null] }),
          expect.objectContaining({ args: ["Is null:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.indexOf()", () => {
  test("returns index of header by key (case-insensitive)", () => {
    return expect(
      runPreRequestScript(
        `
        const idx1 = pm.request.headers.indexOf('content-type')
        const idx2 = pm.request.headers.indexOf('AUTHORIZATION')
        const idx3 = pm.request.headers.indexOf('X-Custom-Header')

        console.log("Index of content-type:", idx1)
        console.log("Index of AUTHORIZATION:", idx2)
        console.log("Index of X-Custom-Header:", idx3)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Index of content-type:", 0] }),
          expect.objectContaining({ args: ["Index of AUTHORIZATION:", 1] }),
          expect.objectContaining({ args: ["Index of X-Custom-Header:", 2] }),
        ]),
      })
    )
  })

  test("returns index of header by object (case-insensitive)", () => {
    return expect(
      runPreRequestScript(
        `
        const idx = pm.request.headers.indexOf({ key: 'authorization' })

        console.log("Index:", idx)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Index:", 1] }),
        ]),
      })
    )
  })

  test("returns -1 when header not found", () => {
    return expect(
      runPreRequestScript(
        `
        const idx = pm.request.headers.indexOf('Nonexistent')

        console.log("Index:", idx)
        console.log("Is -1:", idx === -1)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Index:", -1] }),
          expect.objectContaining({ args: ["Is -1:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.insert()", () => {
  test("inserts header before specified key", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.insert({ key: 'X-API-Key', value: 'secret123' }, 'Authorization')

        const allHeaders = pm.request.headers.map((h) => h.key)
        console.log("All headers:", allHeaders)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              ["Content-Type", "X-API-Key", "Authorization", "X-Custom-Header"],
            ],
          }),
        ]),
      })
    )
  })

  test("appends header if 'before' key not found", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.insert({ key: 'X-New-Header', value: 'new' }, 'NonExistent')

        const allHeaders = pm.request.headers.map((h) => h.key)
        console.log("All headers:", allHeaders)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              [
                "Content-Type",
                "Authorization",
                "X-Custom-Header",
                "X-New-Header",
              ],
            ],
          }),
        ]),
      })
    )
  })

  test("appends header when no 'before' specified", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.insert({ key: 'X-Added-Header', value: 'added' })

        const allHeaders = pm.request.headers.map((h) => h.key)
        console.log("All headers:", allHeaders)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              [
                "Content-Type",
                "Authorization",
                "X-Custom-Header",
                "X-Added-Header",
              ],
            ],
          }),
        ]),
      })
    )
  })

  test("throws error when item has no key", async () => {
    const result = await runPreRequestScript(
      `pm.request.headers.insert({ value: 'test' })`,
      {
        envs,
        request: baseRequest,
        cookies: null,
        experimentalScriptingSandbox: true,
      }
    )

    expect(result).toEqualLeft(
      expect.stringContaining("Header must have a 'key' property")
    )
  })
})

describe("pm.request.headers.append()", () => {
  test("moves existing header to end", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.append({ key: 'Content-Type', value: 'application/xml' })

        const allHeaders = pm.request.headers.map((h) => h.key)
        const contentType = pm.request.headers.get('Content-Type')

        console.log("All headers:", allHeaders)
        console.log("Content-Type value:", contentType)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              ["Authorization", "X-Custom-Header", "Content-Type"],
            ],
          }),
          expect.objectContaining({
            args: ["Content-Type value:", "application/xml"],
          }),
        ]),
      })
    )
  })

  test("adds new header at end", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.append({ key: 'X-New-Header', value: 'new-value' })

        const allHeaders = pm.request.headers.map((h) => h.key)
        console.log("All headers:", allHeaders)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              [
                "Content-Type",
                "Authorization",
                "X-Custom-Header",
                "X-New-Header",
              ],
            ],
          }),
        ]),
      })
    )
  })

  test("throws error when item has no key", async () => {
    const result = await runPreRequestScript(
      `pm.request.headers.append({ value: 'test' })`,
      {
        envs,
        request: baseRequest,
        cookies: null,
        experimentalScriptingSandbox: true,
      }
    )

    expect(result).toEqualLeft(
      expect.stringContaining("Header must have a 'key' property")
    )
  })
})

describe("pm.request.headers.assimilate()", () => {
  test("updates existing headers and adds new ones from array", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.assimilate([
          { key: 'Content-Type', value: 'text/plain' },
          { key: 'X-API-Key', value: 'key123' }
        ])

        const allHeaders = pm.request.headers.all()
        console.log("Content-Type:", allHeaders['Content-Type'])
        console.log("Authorization:", allHeaders['Authorization'])
        console.log("X-API-Key:", allHeaders['X-API-Key'])
        console.log("Count:", pm.request.headers.count())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Content-Type:", "text/plain"] }),
          expect.objectContaining({
            args: ["Authorization:", "Bearer token123"],
          }),
          expect.objectContaining({ args: ["X-API-Key:", "key123"] }),
          expect.objectContaining({ args: ["Count:", 4] }),
        ]),
      })
    )
  })

  test("updates existing headers and adds new ones from object", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.assimilate({
          'Content-Type': 'application/xml',
          'X-New-Header': 'new-value'
        })

        const allHeaders = pm.request.headers.all()
        console.log("All headers:", allHeaders)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              expect.objectContaining({
                "Content-Type": "application/xml",
                Authorization: "Bearer token123",
                "X-Custom-Header": "custom-value",
                "X-New-Header": "new-value",
              }),
            ],
          }),
        ]),
      })
    )
  })

  test("prunes headers not in source when prune=true", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.assimilate(
          {
            'Content-Type': 'application/json',
            'X-API-Key': 'key123'
          },
          true
        )

        const allHeaders = pm.request.headers.all()
        const count = pm.request.headers.count()

        console.log("All headers:", allHeaders)
        console.log("Count:", count)
        console.log("Has Authorization:", pm.request.headers.has('Authorization'))
        console.log("Has X-Custom-Header:", pm.request.headers.has('X-Custom-Header'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All headers:",
              expect.objectContaining({
                "Content-Type": "application/json",
                "X-API-Key": "key123",
              }),
            ],
          }),
          expect.objectContaining({ args: ["Count:", 2] }),
          expect.objectContaining({ args: ["Has Authorization:", false] }),
          expect.objectContaining({
            args: ["Has X-Custom-Header:", false],
          }),
        ]),
      })
    )
  })

  test("throws error for invalid source", async () => {
    const result = await runPreRequestScript(
      `pm.request.headers.assimilate("invalid")`,
      {
        envs,
        request: baseRequest,
        cookies: null,
        experimentalScriptingSandbox: true,
      }
    )

    expect(result).toEqualLeft(
      expect.stringContaining("Source must be an array or object")
    )
  })
})
