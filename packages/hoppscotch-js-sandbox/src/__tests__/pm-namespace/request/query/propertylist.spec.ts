import { HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://api.example.com/users?filter=active&sort=name&page=1",
  method: "GET",
  headers: [],
  params: [
    { key: "filter", value: "active", active: true, description: "" },
    { key: "sort", value: "name", active: true, description: "" },
    { key: "page", value: "1", active: true, description: "" },
  ],
  body: { contentType: null, body: null },
  auth: { authType: "none", authActive: false },
  preRequestScript: "",
  testScript: "",
  requestVariables: [],
  responses: {},
}

const envs = { global: [], selected: [] }

describe("pm.request.url.query.get()", () => {
  test("returns value for existing parameter", () => {
    return expect(
      runPreRequestScript(
        `
        const filterValue = pm.request.url.query.get('filter')
        const sortValue = pm.request.url.query.get('sort')

        console.log("Filter value:", filterValue)
        console.log("Sort value:", sortValue)
        console.log("Filter type:", typeof filterValue)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Filter value:", "active"] }),
          expect.objectContaining({ args: ["Sort value:", "name"] }),
          expect.objectContaining({ args: ["Filter type:", "string"] }),
        ]),
      })
    )
  })

  test("returns null for non-existent parameter", () => {
    return expect(
      runPreRequestScript(
        `
        const value = pm.request.url.query.get('nonexistent')

        console.log("Non-existent value:", value)
        console.log("Is null:", value === null)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Non-existent value:", null] }),
          expect.objectContaining({ args: ["Is null:", true] }),
        ]),
      })
    )
  })

  test("updates after parameter is added", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial limit:", pm.request.url.query.get('limit'))

        pm.request.url.query.add({ key: 'limit', value: '20' })

        console.log("Updated limit:", pm.request.url.query.get('limit'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial limit:", null] }),
          expect.objectContaining({ args: ["Updated limit:", "20"] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.has()", () => {
  test("returns true for existing parameters", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Has filter:", pm.request.url.query.has('filter'))
        console.log("Has sort:", pm.request.url.query.has('sort'))
        console.log("Has page:", pm.request.url.query.has('page'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has filter:", true] }),
          expect.objectContaining({ args: ["Has sort:", true] }),
          expect.objectContaining({ args: ["Has page:", true] }),
        ]),
      })
    )
  })

  test("returns false for non-existent parameters", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Has limit:", pm.request.url.query.has('limit'))
        console.log("Has offset:", pm.request.url.query.has('offset'))
        console.log("Has nonexistent:", pm.request.url.query.has('nonexistent'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has limit:", false] }),
          expect.objectContaining({ args: ["Has offset:", false] }),
          expect.objectContaining({ args: ["Has nonexistent:", false] }),
        ]),
      })
    )
  })

  test("updates after parameters are modified", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Has status (before):", pm.request.url.query.has('status'))

        pm.request.url.query.add({ key: 'status', value: 'published' })

        console.log("Has status (after add):", pm.request.url.query.has('status'))

        pm.request.url.query.remove('status')

        console.log("Has status (after remove):", pm.request.url.query.has('status'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has status (before):", false] }),
          expect.objectContaining({ args: ["Has status (after add):", true] }),
          expect.objectContaining({
            args: ["Has status (after remove):", false],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.upsert()", () => {
  test("adds new parameter when it doesn't exist", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Has limit (before):", pm.request.url.query.has('limit'))

        pm.request.url.query.upsert({ key: 'limit', value: '50' })

        console.log("Has limit (after):", pm.request.url.query.has('limit'))
        console.log("Limit value:", pm.request.url.query.get('limit'))
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("limit=50"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Has limit (before):", false] }),
          expect.objectContaining({ args: ["Has limit (after):", true] }),
          expect.objectContaining({ args: ["Limit value:", "50"] }),
        ]),
      })
    )
  })

  test("updates existing parameter", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial filter:", pm.request.url.query.get('filter'))

        pm.request.url.query.upsert({ key: 'filter', value: 'inactive' })

        console.log("Updated filter:", pm.request.url.query.get('filter'))
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: expect.stringContaining("filter=inactive"),
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial filter:", "active"] }),
          expect.objectContaining({ args: ["Updated filter:", "inactive"] }),
        ]),
      })
    )
  })

  test("handles empty value", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.upsert({ key: 'flag' })

        console.log("Flag value:", pm.request.url.query.get('flag'))
        console.log("Flag exists:", pm.request.url.query.has('flag'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Flag value:", ""] }),
          expect.objectContaining({ args: ["Flag exists:", true] }),
        ]),
      })
    )
  })

  test("throws error for missing key", () => {
    return expect(
      runPreRequestScript(
        `
        try {
          pm.request.url.query.upsert({ value: 'test' })
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
              expect.stringContaining("must have a 'key' property"),
            ]),
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.clear()", () => {
  test("removes all query parameters", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Params before:", pm.request.url.query.all())
        console.log("Count before:", pm.request.url.query.count())

        pm.request.url.query.clear()

        console.log("Params after:", pm.request.url.query.all())
        console.log("Count after:", pm.request.url.query.count())
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/users",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Params before:",
              { filter: "active", sort: "name", page: "1" },
            ],
          }),
          expect.objectContaining({ args: ["Count before:", 3] }),
          expect.objectContaining({ args: ["Params after:", {}] }),
          expect.objectContaining({ args: ["Count after:", 0] }),
        ]),
      })
    )
  })

  test("allows adding parameters after clearing", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.clear()
        console.log("After clear:", pm.request.url.query.all())

        pm.request.url.query.add({ key: 'new', value: 'param' })
        console.log("After add:", pm.request.url.query.all())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["After clear:", {}] }),
          expect.objectContaining({ args: ["After add:", { new: "param" }] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.each()", () => {
  test("iterates over all parameters", () => {
    return expect(
      runPreRequestScript(
        `
        const keys = []
        const values = []

        pm.request.url.query.each((param) => {
          keys.push(param.key)
          values.push(param.value)
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
            args: ["Keys:", ["filter", "sort", "page"]],
          }),
          expect.objectContaining({
            args: ["Values:", ["active", "name", "1"]],
          }),
          expect.objectContaining({ args: ["Count:", 3] }),
        ]),
      })
    )
  })

  test("callback receives correct parameter object", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.each((param) => {
          console.log("Key:", param.key)
          console.log("Value:", param.value)
          return // Check only first param
        })
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Key:", "filter"] }),
          expect.objectContaining({ args: ["Value:", "active"] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.map()", () => {
  test("transforms parameters and returns new array", () => {
    return expect(
      runPreRequestScript(
        `
        const mapped = pm.request.url.query.map((param) => {
          return param.key.toUpperCase() + '=' + param.value
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
            args: ["Mapped:", ["FILTER=active", "SORT=name", "PAGE=1"]],
          }),
          expect.objectContaining({ args: ["Array length:", 3] }),
          expect.objectContaining({ args: ["First item:", "FILTER=active"] }),
        ]),
      })
    )
  })

  test("does not modify original parameters", () => {
    return expect(
      runPreRequestScript(
        `
        const originalParams = pm.request.url.query.all()

        const mapped = pm.request.url.query.map((param) => {
          return { modified: param.key }
        })

        const afterParams = pm.request.url.query.all()

        console.log("Original:", originalParams)
        console.log("Mapped:", mapped)
        console.log("After:", afterParams)
        console.log("Params unchanged:", JSON.stringify(originalParams) === JSON.stringify(afterParams))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Original:", { filter: "active", sort: "name", page: "1" }],
          }),
          expect.objectContaining({
            args: ["After:", { filter: "active", sort: "name", page: "1" }],
          }),
          expect.objectContaining({ args: ["Params unchanged:", true] }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.filter()", () => {
  test("filters parameters based on condition", () => {
    return expect(
      runPreRequestScript(
        `
        const filtered = pm.request.url.query.filter((param) => {
          return param.key.includes('sort') || param.key.includes('page')
        })

        console.log("Filtered:", filtered)
        console.log("Count:", filtered.length)
        console.log("Keys:", filtered.map(p => p.key))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count:", 2] }),
          expect.objectContaining({ args: ["Keys:", ["sort", "page"]] }),
        ]),
      })
    )
  })

  test("returns empty array when no matches", () => {
    return expect(
      runPreRequestScript(
        `
        const filtered = pm.request.url.query.filter((param) => {
          return param.key === 'nonexistent'
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
})

describe("pm.request.url.query.count()", () => {
  test("returns correct count of parameters", () => {
    return expect(
      runPreRequestScript(
        `
        const count = pm.request.url.query.count()

        console.log("Count:", count)
        console.log("Type:", typeof count)
        console.log("Matches all():", count === Object.keys(pm.request.url.query.all()).length)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Count:", 3] }),
          expect.objectContaining({ args: ["Type:", "number"] }),
          expect.objectContaining({ args: ["Matches all():", true] }),
        ]),
      })
    )
  })

  test("updates after parameters are added or removed", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial count:", pm.request.url.query.count())

        pm.request.url.query.add({ key: 'limit', value: '20' })
        console.log("After add:", pm.request.url.query.count())

        pm.request.url.query.remove('filter')
        console.log("After remove:", pm.request.url.query.count())

        pm.request.url.query.clear()
        console.log("After clear:", pm.request.url.query.count())
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
})

describe("pm.request.url.query.idx()", () => {
  test("returns parameter at specific index", () => {
    return expect(
      runPreRequestScript(
        `
        const first = pm.request.url.query.idx(0)
        const second = pm.request.url.query.idx(1)
        const third = pm.request.url.query.idx(2)

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
            args: ["First:", { key: "filter", value: "active" }],
          }),
          expect.objectContaining({
            args: ["Second:", { key: "sort", value: "name" }],
          }),
          expect.objectContaining({
            args: ["Third:", { key: "page", value: "1" }],
          }),
        ]),
      })
    )
  })

  test("returns null for out-of-bounds index", () => {
    return expect(
      runPreRequestScript(
        `
        const param = pm.request.url.query.idx(999)

        console.log("Out of bounds:", param)
        console.log("Is null:", param === null)
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
        const param = pm.request.url.query.idx(-1)

        console.log("Negative index:", param)
        console.log("Is null:", param === null)
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
})

describe("pm.request.url.query.toObject()", () => {
  test("returns parameters as object (alias for all())", () => {
    return expect(
      runPreRequestScript(
        `
        const obj = pm.request.url.query.toObject()
        const all = pm.request.url.query.all()

        console.log("toObject:", obj)
        console.log("all:", all)
        console.log("Are equal:", JSON.stringify(obj) === JSON.stringify(all))
        console.log("Type:", typeof obj)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["toObject:", { filter: "active", sort: "name", page: "1" }],
          }),
          expect.objectContaining({
            args: ["all:", { filter: "active", sort: "name", page: "1" }],
          }),
          expect.objectContaining({ args: ["Are equal:", true] }),
          expect.objectContaining({ args: ["Type:", "object"] }),
        ]),
      })
    )
  })
})

describe("duplicate query parameter handling", () => {
  test("handles duplicate parameter keys by converting to array", () => {
    const requestWithDuplicates: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users?tag=js&tag=ts&tag=go",
      params: [
        { key: "tag", value: "js", active: true, description: "" },
        { key: "tag", value: "ts", active: true, description: "" },
        { key: "tag", value: "go", active: true, description: "" },
      ],
    }

    return expect(
      runPreRequestScript(
        `
        const params = pm.request.url.query.all()

        console.log("Params:", params)
        console.log("Tag value:", params.tag)
        console.log("Is array:", Array.isArray(params.tag))
        console.log("Array length:", params.tag.length)
        console.log("All values:", params.tag)
        `,
        { envs, request: requestWithDuplicates }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Tag value:", ["js", "ts", "go"]] }),
          expect.objectContaining({ args: ["Is array:", true] }),
          expect.objectContaining({ args: ["Array length:", 3] }),
          expect.objectContaining({
            args: ["All values:", ["js", "ts", "go"]],
          }),
        ]),
      })
    )
  })

  test("handles mixed duplicate and unique parameters", () => {
    const requestWithMixed: HoppRESTRequest = {
      ...baseRequest,
      endpoint:
        "https://api.example.com/users?filter=active&tag=js&tag=ts&sort=name",
      params: [
        { key: "filter", value: "active", active: true, description: "" },
        { key: "tag", value: "js", active: true, description: "" },
        { key: "tag", value: "ts", active: true, description: "" },
        { key: "sort", value: "name", active: true, description: "" },
      ],
    }

    return expect(
      runPreRequestScript(
        `
        const params = pm.request.url.query.all()

        console.log("All params:", params)
        console.log("filter is string:", typeof params.filter === 'string')
        console.log("tag is array:", Array.isArray(params.tag))
        console.log("sort is string:", typeof params.sort === 'string')
        `,
        { envs, request: requestWithMixed }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All params:",
              { filter: "active", tag: ["js", "ts"], sort: "name" },
            ],
          }),
          expect.objectContaining({ args: ["filter is string:", true] }),
          expect.objectContaining({ args: ["tag is array:", true] }),
          expect.objectContaining({ args: ["sort is string:", true] }),
        ]),
      })
    )
  })

  test("get() returns first value for duplicate keys", () => {
    const requestWithDuplicates: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users?tag=first&tag=second",
      params: [
        { key: "tag", value: "first", active: true, description: "" },
        { key: "tag", value: "second", active: true, description: "" },
      ],
    }

    return expect(
      runPreRequestScript(
        `
        const value = pm.request.url.query.get('tag')

        console.log("get() value:", value)
        console.log("Is first value:", value === 'first')
        console.log("all() value:", pm.request.url.query.all().tag)
        `,
        { envs, request: requestWithDuplicates }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["get() value:", "first"] }),
          expect.objectContaining({ args: ["Is first value:", true] }),
          expect.objectContaining({
            args: ["all() value:", ["first", "second"]],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.find()", () => {
  test("finds parameter by predicate function", () => {
    return expect(
      runPreRequestScript(
        `
        const result = pm.request.url.query.find((param) => param.key === 'sort')

        console.log("Found param:", result)
        console.log("Param key:", result.key)
        console.log("Param value:", result.value)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "Found param:",
              expect.objectContaining({ key: "sort", value: "name" }),
            ],
          }),
          expect.objectContaining({ args: ["Param key:", "sort"] }),
          expect.objectContaining({ args: ["Param value:", "name"] }),
        ]),
      })
    )
  })

  test("finds parameter by key string", () => {
    return expect(
      runPreRequestScript(
        `
        const result = pm.request.url.query.find('filter')

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
              expect.objectContaining({ key: "filter", value: "active" }),
            ],
          }),
          expect.objectContaining({ args: ["Value:", "active"] }),
        ]),
      })
    )
  })

  test("returns null when parameter not found", () => {
    return expect(
      runPreRequestScript(
        `
        const result = pm.request.url.query.find('nonexistent')

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

describe("pm.request.url.query.indexOf()", () => {
  test("returns index of parameter by key", () => {
    return expect(
      runPreRequestScript(
        `
        const idx1 = pm.request.url.query.indexOf('filter')
        const idx2 = pm.request.url.query.indexOf('sort')
        const idx3 = pm.request.url.query.indexOf('page')

        console.log("Index of filter:", idx1)
        console.log("Index of sort:", idx2)
        console.log("Index of page:", idx3)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Index of filter:", 0] }),
          expect.objectContaining({ args: ["Index of sort:", 1] }),
          expect.objectContaining({ args: ["Index of page:", 2] }),
        ]),
      })
    )
  })

  test("returns index of parameter by object", () => {
    return expect(
      runPreRequestScript(
        `
        const idx = pm.request.url.query.indexOf({ key: 'sort' })

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

  test("returns -1 when parameter not found", () => {
    return expect(
      runPreRequestScript(
        `
        const idx = pm.request.url.query.indexOf('nonexistent')

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

describe("pm.request.url.query.insert()", () => {
  test("inserts parameter before specified key", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.insert({ key: 'limit', value: '10' }, 'page')

        const allParams = pm.request.url.query.map((p) => p.key)
        console.log("All params:", allParams)
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["All params:", ["filter", "sort", "limit", "page"]],
          }),
          expect.objectContaining({
            args: [
              "URL:",
              "https://api.example.com/users?filter=active&sort=name&limit=10&page=1",
            ],
          }),
        ]),
      })
    )
  })

  test("appends parameter if 'before' key not found", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.insert({ key: 'limit', value: '10' }, 'nonexistent')

        const allParams = pm.request.url.query.map((p) => p.key)
        console.log("All params:", allParams)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["All params:", ["filter", "sort", "page", "limit"]],
          }),
        ]),
      })
    )
  })

  test("appends parameter when no 'before' specified", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.insert({ key: 'limit', value: '10' })

        const allParams = pm.request.url.query.map((p) => p.key)
        console.log("All params:", allParams)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["All params:", ["filter", "sort", "page", "limit"]],
          }),
        ]),
      })
    )
  })

  test("throws error when item has no key", () => {
    return expect(
      runPreRequestScript(
        `
        try {
          pm.request.url.query.insert({ value: '10' })
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
            args: ["Error caught:", "Query param must have a 'key' property"],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.append()", () => {
  test("moves existing parameter to end", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.append({ key: 'filter', value: 'updated' })

        const allParams = pm.request.url.query.map((p) => p.key)
        const filterValue = pm.request.url.query.get('filter')

        console.log("All params:", allParams)
        console.log("Filter value:", filterValue)
        console.log("URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["All params:", ["sort", "page", "filter"]],
          }),
          expect.objectContaining({ args: ["Filter value:", "updated"] }),
          expect.objectContaining({
            args: [
              "URL:",
              "https://api.example.com/users?sort=name&page=1&filter=updated",
            ],
          }),
        ]),
      })
    )
  })

  test("adds new parameter at end", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.append({ key: 'limit', value: '10' })

        const allParams = pm.request.url.query.map((p) => p.key)
        console.log("All params:", allParams)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["All params:", ["filter", "sort", "page", "limit"]],
          }),
        ]),
      })
    )
  })

  test("throws error when item has no key", () => {
    return expect(
      runPreRequestScript(
        `
        try {
          pm.request.url.query.append({ value: '10' })
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
            args: ["Error caught:", "Query param must have a 'key' property"],
          }),
        ]),
      })
    )
  })
})

describe("pm.request.url.query.assimilate()", () => {
  test("updates existing parameters and adds new ones from array", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.assimilate([
          { key: 'filter', value: 'updated' },
          { key: 'limit', value: '20' }
        ])

        const allParams = pm.request.url.query.all()
        console.log("Filter:", allParams.filter)
        console.log("Sort:", allParams.sort)
        console.log("Limit:", allParams.limit)
        console.log("Count:", pm.request.url.query.count())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Filter:", "updated"] }),
          expect.objectContaining({ args: ["Sort:", "name"] }),
          expect.objectContaining({ args: ["Limit:", "20"] }),
          expect.objectContaining({ args: ["Count:", 4] }),
        ]),
      })
    )
  })

  test("updates existing parameters and adds new ones from object", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.assimilate({
          filter: 'inactive',
          limit: '50'
        })

        const allParams = pm.request.url.query.all()
        console.log("All params:", allParams)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All params:",
              expect.objectContaining({
                filter: "inactive",
                sort: "name",
                page: "1",
                limit: "50",
              }),
            ],
          }),
        ]),
      })
    )
  })

  test("prunes parameters not in source when prune=true", () => {
    return expect(
      runPreRequestScript(
        `
        pm.request.url.query.assimilate(
          { filter: 'active', limit: '10' },
          true
        )

        const allParams = pm.request.url.query.all()
        const count = pm.request.url.query.count()

        console.log("All params:", allParams)
        console.log("Count:", count)
        console.log("Has sort:", pm.request.url.query.has('sort'))
        console.log("Has page:", pm.request.url.query.has('page'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: [
              "All params:",
              expect.objectContaining({ filter: "active", limit: "10" }),
            ],
          }),
          expect.objectContaining({ args: ["Count:", 2] }),
          expect.objectContaining({ args: ["Has sort:", false] }),
          expect.objectContaining({ args: ["Has page:", false] }),
        ]),
      })
    )
  })

  test("throws error for invalid source", () => {
    return expect(
      runPreRequestScript(
        `
        try {
          pm.request.url.query.assimilate("invalid")
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
            args: ["Error caught:", "Source must be an array or object"],
          }),
        ]),
      })
    )
  })
})
