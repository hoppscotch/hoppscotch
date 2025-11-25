import { HoppRESTRequest, getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://api.example.com/users",
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
    {
      key: "X-API-Version",
      value: "v1",
      active: true,
      description: "",
    },
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

describe("pm.request.headers.each()", () => {
  test("iterates over all headers", () => {
    return expect(
      runPreRequestScript(
        `
        const keys = []
        const values = []

        pm.request.headers.each((header) => {
          keys.push(header.key)
          values.push(header.value)
        })

        console.log("Keys:", keys)
        console.log("Values:", values)
        console.log("Count:", keys.length)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Keys:", ["Content-Type", "Authorization", "X-API-Version"]],
          }),
          expect.objectContaining({
            args: ["Values:", ["application/json", "Bearer token123", "v1"]],
          }),
          expect.objectContaining({ args: ["Count:", 3] }),
        ]),
      })
    )
  })

  test("callback receives complete header object", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.each((header) => {
          console.log("Key:", header.key)
          console.log("Value:", header.value)
          console.log("Has active:", 'active' in header)
          return // Check only first header
        })
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Key:", "Content-Type"] }),
          expect.objectContaining({ args: ["Value:", "application/json"] }),
          expect.objectContaining({ args: ["Has active:", true] }),
        ]),
      })
    )
  })

  test("updates after headers are modified", () => {
    return expect(
      runPreRequestScript(
        `
        let count1 = 0
        pm.request.headers.each(() => { count1++ })
        console.log("Initial count:", count1)

        pm.request.headers.add({ key: 'X-Custom', value: 'custom-value' })

        let count2 = 0
        pm.request.headers.each(() => { count2++ })
        console.log("Count after add:", count2)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial count:", 3] }),
          expect.objectContaining({ args: ["Count after add:", 4] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.map()", () => {
  test("transforms headers and returns new array", () => {
    return expect(
      runPreRequestScript(
        `
        const mapped = pm.request.headers.map((header) => {
          return header.key.toLowerCase() + ': ' + header.value
        })

        console.log("Mapped:", mapped)
        console.log("Array length:", mapped.length)
        console.log("First item:", mapped[0])
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Mapped:",
              [
                "content-type: application/json",
                "authorization: Bearer token123",
                "x-api-version: v1",
              ],
            ],
          }),
          expect.objectContaining({ args: ["Array length:", 3] }),
          expect.objectContaining({
            args: ["First item:", "content-type: application/json"],
          }),
        ]),
      })
    )
  })

  test("does not modify original headers", () => {
    return expect(
      runPreRequestScript(
        `
        const originalCount = pm.request.headers.count()

        const mapped = pm.request.headers.map((header) => {
          return { modified: header.key }
        })

        const afterCount = pm.request.headers.count()

        console.log("Original count:", originalCount)
        console.log("Mapped length:", mapped.length)
        console.log("After count:", afterCount)
        console.log("Headers unchanged:", originalCount === afterCount)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Original count:", 3] }),
          expect.objectContaining({ args: ["Mapped length:", 3] }),
          expect.objectContaining({ args: ["After count:", 3] }),
          expect.objectContaining({ args: ["Headers unchanged:", true] }),
        ]),
      })
    )
  })

  test("returns array with custom objects", () => {
    return expect(
      runPreRequestScript(
        `
        const customHeaders = pm.request.headers.map((header) => ({
          name: header.key,
          val: header.value,
          length: header.value.length
        }))

        console.log("First custom:", customHeaders[0])
        console.log("Has name:", 'name' in customHeaders[0])
        console.log("Has val:", 'val' in customHeaders[0])
        console.log("Has length:", 'length' in customHeaders[0])
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "First custom:",
              { name: "Content-Type", val: "application/json", length: 16 },
            ],
          }),
          expect.objectContaining({ args: ["Has name:", true] }),
          expect.objectContaining({ args: ["Has val:", true] }),
          expect.objectContaining({ args: ["Has length:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.filter()", () => {
  test("filters headers based on condition", () => {
    return expect(
      runPreRequestScript(
        `
        const filtered = pm.request.headers.filter((header) => {
          return header.key.startsWith('X-')
        })

        console.log("Filtered:", filtered)
        console.log("Count:", filtered.length)
        console.log("Keys:", filtered.map(h => h.key))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count:", 1] }),
          expect.objectContaining({ args: ["Keys:", ["X-API-Version"]] }),
        ]),
      })
    )
  })

  test("filters by value content", () => {
    return expect(
      runPreRequestScript(
        `
        const filtered = pm.request.headers.filter((header) => {
          return header.value.includes('Bearer')
        })

        console.log("Filtered count:", filtered.length)
        console.log("Header key:", filtered[0].key)
        console.log("Header value:", filtered[0].value)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Filtered count:", 1] }),
          expect.objectContaining({ args: ["Header key:", "Authorization"] }),
          expect.objectContaining({
            args: ["Header value:", "Bearer token123"],
          }),
        ]),
      })
    )
  })

  test("returns empty array when no matches", () => {
    return expect(
      runPreRequestScript(
        `
        const filtered = pm.request.headers.filter((header) => {
          return header.key === 'NonExistent'
        })

        console.log("Filtered:", filtered)
        console.log("Is array:", Array.isArray(filtered))
        console.log("Length:", filtered.length)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Filtered:", []] }),
          expect.objectContaining({ args: ["Is array:", true] }),
          expect.objectContaining({ args: ["Length:", 0] }),
        ]),
      })
    )
  })

  test("returns all headers when condition always true", () => {
    return expect(
      runPreRequestScript(
        `
        const filtered = pm.request.headers.filter((header) => {
          return true
        })

        console.log("Count:", filtered.length)
        console.log("Equals total:", filtered.length === pm.request.headers.count())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count:", 3] }),
          expect.objectContaining({ args: ["Equals total:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.count()", () => {
  test("returns correct count of headers", () => {
    return expect(
      runPreRequestScript(
        `
        const count = pm.request.headers.count()

        console.log("Count:", count)
        console.log("Type:", typeof count)

        let manualCount = 0
        pm.request.headers.each(() => { manualCount++ })
        console.log("Manual count:", manualCount)
        console.log("Counts match:", count === manualCount)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count:", 3] }),
          expect.objectContaining({ args: ["Type:", "number"] }),
          expect.objectContaining({ args: ["Manual count:", 3] }),
          expect.objectContaining({ args: ["Counts match:", true] }),
        ]),
      })
    )
  })

  test("updates after headers are added or removed", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial count:", pm.request.headers.count())

        pm.request.headers.add({ key: 'X-New-Header', value: 'value' })
        console.log("After add:", pm.request.headers.count())

        pm.request.headers.remove('Content-Type')
        console.log("After remove:", pm.request.headers.count())

        pm.request.headers.clear()
        console.log("After clear:", pm.request.headers.count())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial count:", 3] }),
          expect.objectContaining({ args: ["After add:", 4] }),
          expect.objectContaining({ args: ["After remove:", 3] }),
          expect.objectContaining({ args: ["After clear:", 0] }),
        ]),
      })
    )
  })

  test("returns 0 for empty headers", () => {
    const requestWithoutHeaders: HoppRESTRequest = {
      ...baseRequest,
      headers: [],
    }

    return expect(
      runPreRequestScript(
        `
        const count = pm.request.headers.count()

        console.log("Count:", count)
        console.log("Is zero:", count === 0)
        `,
        { envs, request: requestWithoutHeaders }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count:", 0] }),
          expect.objectContaining({ args: ["Is zero:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.idx()", () => {
  test("returns header at specific index", () => {
    return expect(
      runPreRequestScript(
        `
        const first = pm.request.headers.idx(0)
        const second = pm.request.headers.idx(1)
        const third = pm.request.headers.idx(2)

        console.log("First:", first)
        console.log("Second:", second)
        console.log("Third:", third)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "First:",
              {
                key: "Content-Type",
                value: "application/json",
                active: true,
                description: "",
              },
            ],
          }),
          expect.objectContaining({
            args: [
              "Second:",
              {
                key: "Authorization",
                value: "Bearer token123",
                active: true,
                description: "",
              },
            ],
          }),
          expect.objectContaining({
            args: [
              "Third:",
              {
                key: "X-API-Version",
                value: "v1",
                active: true,
                description: "",
              },
            ],
          }),
        ]),
      })
    )
  })

  test("returns null for out-of-bounds index", () => {
    return expect(
      runPreRequestScript(
        `
        const header = pm.request.headers.idx(999)

        console.log("Out of bounds:", header)
        console.log("Is null:", header === null)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Out of bounds:", null] }),
          expect.objectContaining({ args: ["Is null:", true] }),
        ]),
      })
    )
  })

  test("returns null for negative index", () => {
    return expect(
      runPreRequestScript(
        `
        const header = pm.request.headers.idx(-1)

        console.log("Negative index:", header)
        console.log("Is null:", header === null)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Negative index:", null] }),
          expect.objectContaining({ args: ["Is null:", true] }),
        ]),
      })
    )
  })

  test("can access header properties via idx", () => {
    return expect(
      runPreRequestScript(
        `
        const header = pm.request.headers.idx(0)

        console.log("Key:", header.key)
        console.log("Value:", header.value)
        console.log("Active:", header.active)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Key:", "Content-Type"] }),
          expect.objectContaining({ args: ["Value:", "application/json"] }),
          expect.objectContaining({ args: ["Active:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.clear()", () => {
  test("removes all headers", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Count before:", pm.request.headers.count())
        console.log("Headers before:", pm.request.headers.toObject())

        pm.request.headers.clear()

        console.log("Count after:", pm.request.headers.count())
        console.log("Headers after:", pm.request.headers.toObject())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [],
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count before:", 3] }),
          expect.objectContaining({ args: ["Count after:", 0] }),
          expect.objectContaining({ args: ["Headers after:", {}] }),
        ]),
      })
    )
  })

  test("allows adding headers after clearing", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.clear()
        console.log("After clear:", pm.request.headers.count())

        pm.request.headers.add({ key: 'X-New', value: 'value' })
        console.log("After add:", pm.request.headers.count())
        console.log("Headers:", pm.request.headers.toObject())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["After clear:", 0] }),
          expect.objectContaining({ args: ["After add:", 1] }),
          expect.objectContaining({ args: ["Headers:", { "X-New": "value" }] }),
        ]),
      })
    )
  })

  test("clear followed by get returns null", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Before clear - Content-Type:", pm.request.headers.get('Content-Type'))

        pm.request.headers.clear()

        console.log("After clear - Content-Type:", pm.request.headers.get('Content-Type'))
        console.log("After clear - has Content-Type:", pm.request.headers.has('Content-Type'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Before clear - Content-Type:", "application/json"],
          }),
          expect.objectContaining({
            args: ["After clear - Content-Type:", null],
          }),
          expect.objectContaining({
            args: ["After clear - has Content-Type:", false],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.toObject()", () => {
  test("returns headers as key-value object", () => {
    return expect(
      runPreRequestScript(
        `
        const obj = pm.request.headers.toObject()

        console.log("Headers object:", obj)
        console.log("Type:", typeof obj)
        console.log("Content-Type:", obj['Content-Type'])
        console.log("Authorization:", obj['Authorization'])
        console.log("X-API-Version:", obj['X-API-Version'])
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Headers object:",
              {
                "Content-Type": "application/json",
                Authorization: "Bearer token123",
                "X-API-Version": "v1",
              },
            ],
          }),
          expect.objectContaining({ args: ["Type:", "object"] }),
          expect.objectContaining({
            args: ["Content-Type:", "application/json"],
          }),
          expect.objectContaining({
            args: ["Authorization:", "Bearer token123"],
          }),
          expect.objectContaining({ args: ["X-API-Version:", "v1"] }),
        ]),
      })
    )
  })

  test("matches all() method", () => {
    return expect(
      runPreRequestScript(
        `
        const toObjectResult = pm.request.headers.toObject()
        const allResult = pm.request.headers.all()

        console.log("toObject:", toObjectResult)
        console.log("all:", allResult)
        console.log("Are equal:", JSON.stringify(toObjectResult) === JSON.stringify(allResult))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Are equal:", true] }),
        ]),
      })
    )
  })

  test("returns empty object for empty headers", () => {
    const requestWithoutHeaders: HoppRESTRequest = {
      ...baseRequest,
      headers: [],
    }

    return expect(
      runPreRequestScript(
        `
        const obj = pm.request.headers.toObject()

        console.log("Headers object:", obj)
        console.log("Keys count:", Object.keys(obj).length)
        console.log("Is empty:", Object.keys(obj).length === 0)
        `,
        { envs, request: requestWithoutHeaders }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Headers object:", {}] }),
          expect.objectContaining({ args: ["Keys count:", 0] }),
          expect.objectContaining({ args: ["Is empty:", true] }),
        ]),
      })
    )
  })

  test("updates dynamically after mutations", () => {
    return expect(
      runPreRequestScript(
        `
        const before = pm.request.headers.toObject()
        console.log("Before:", before)

        pm.request.headers.add({ key: 'X-Custom', value: 'test' })

        const after = pm.request.headers.toObject()
        console.log("After:", after)
        console.log("Has X-Custom:", 'X-Custom' in after)
        console.log("X-Custom value:", after['X-Custom'])
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has X-Custom:", true] }),
          expect.objectContaining({ args: ["X-Custom value:", "test"] }),
        ]),
      })
    )
  })
})

describe("combined headers PropertyList operations", () => {
  test("chaining multiple PropertyList methods", () => {
    return expect(
      runPreRequestScript(
        `
        const filteredAndMapped = pm.request.headers
          .filter(h => h.key.startsWith('X-') || h.key === 'Content-Type')
          .map(h => ({ name: h.key, length: h.value.length }))

        console.log("Result:", filteredAndMapped)
        console.log("Count:", filteredAndMapped.length)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Result:",
              [
                { name: "Content-Type", length: 16 },
                { name: "X-API-Version", length: 2 },
              ],
            ],
          }),
          expect.objectContaining({ args: ["Count:", 2] }),
        ]),
      })
    )
  })

  test("using each to build custom structure", () => {
    return expect(
      runPreRequestScript(
        `
        const headerMap = new Map()

        pm.request.headers.each((header) => {
          headerMap.set(header.key.toLowerCase(), header.value.toUpperCase())
        })

        console.log("Map size:", headerMap.size)
        console.log("content-type:", headerMap.get('content-type'))
        console.log("authorization:", headerMap.get('authorization'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Map size:", 3] }),
          expect.objectContaining({
            args: ["content-type:", "APPLICATION/JSON"],
          }),
          expect.objectContaining({
            args: ["authorization:", "BEARER TOKEN123"],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.headers.remove() - case insensitive", () => {
  const envs: TestResult["envs"] = {
    global: [],
    selected: [],
  }

  const baseRequest: HoppRESTRequest = {
    ...getDefaultRESTRequest(),
    name: "Test",
    method: "GET",
    endpoint: "https://example.com/api",
    headers: [
      { key: "Content-Type", value: "application/json", active: true },
      { key: "Authorization", value: "Bearer token123", active: true },
      { key: "X-Custom-Header", value: "custom-value", active: true },
    ],
  }

  test("removes header with exact case match", () => {
    return expect(
      runPreRequestScript(
        `
        const hasContentType = pm.request.headers.has("Content-Type")
        pm.request.headers.remove("Content-Type")
        const afterRemove = pm.request.headers.has("Content-Type")

        console.log("Has before:", hasContentType)
        console.log("Has after:", afterRemove)
        console.log("Count after:", pm.request.headers.count())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.not.arrayContaining([
            expect.objectContaining({ key: "Content-Type" }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has before:", true] }),
          expect.objectContaining({ args: ["Has after:", false] }),
          expect.objectContaining({ args: ["Count after:", 2] }),
        ]),
      })
    )
  })

  test("removes header with different case (lowercase)", () => {
    return expect(
      runPreRequestScript(
        `
        const hasAuth = pm.request.headers.has("Authorization")
        // Remove with lowercase - should be case-insensitive
        pm.request.headers.remove("authorization")
        const afterRemove = pm.request.headers.has("Authorization")

        console.log("Has before:", hasAuth)
        console.log("Has after:", afterRemove)
        console.log("Count after:", pm.request.headers.count())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.not.arrayContaining([
            expect.objectContaining({
              key: expect.stringMatching(/^authorization$/i),
            }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has before:", true] }),
          expect.objectContaining({ args: ["Has after:", false] }),
          expect.objectContaining({ args: ["Count after:", 2] }),
        ]),
      })
    )
  })

  test("removes header with different case (UPPERCASE)", () => {
    return expect(
      runPreRequestScript(
        `
        const hasCustom = pm.request.headers.has("X-Custom-Header")
        // Remove with uppercase - should be case-insensitive
        pm.request.headers.remove("X-CUSTOM-HEADER")
        const afterRemove = pm.request.headers.has("X-Custom-Header")

        console.log("Has before:", hasCustom)
        console.log("Has after:", afterRemove)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.not.arrayContaining([
            expect.objectContaining({
              key: expect.stringMatching(/^x-custom-header$/i),
            }),
          ]),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has before:", true] }),
          expect.objectContaining({ args: ["Has after:", false] }),
        ]),
      })
    )
  })

  test("multiple remove operations with mixed case", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.headers.remove("Content-Type")
        pm.request.headers.remove("authorization")  // lowercase

        const hasContentType = pm.request.headers.has("Content-Type")
        const hasAuth = pm.request.headers.has("Authorization")
        const hasCustom = pm.request.headers.has("X-Custom-Header")

        console.log("Final count:", pm.request.headers.count())
        console.log("Has Content-Type:", hasContentType)
        console.log("Has Authorization:", hasAuth)
        console.log("Has Custom:", hasCustom)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [
            { key: "X-Custom-Header", value: "custom-value", active: true },
          ],
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Final count:", 1] }),
          expect.objectContaining({ args: ["Has Content-Type:", false] }),
          expect.objectContaining({ args: ["Has Authorization:", false] }),
          expect.objectContaining({ args: ["Has Custom:", true] }),
        ]),
      })
    )
  })
})
