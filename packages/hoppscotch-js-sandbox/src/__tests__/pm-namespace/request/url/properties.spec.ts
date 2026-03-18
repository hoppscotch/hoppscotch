import { HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

const baseRequest: HoppRESTRequest = {
  v: "16",
  name: "Test Request",
  endpoint: "https://api.example.com/users#section1",
  method: "GET",
  headers: [],
  params: [],
  body: { contentType: null, body: null },
  auth: { authType: "none", authActive: false },
  preRequestScript: "",
  testScript: "",
  requestVariables: [],
  responses: {},
}

const envs = { global: [], selected: [] }

describe("pm.request.url.hash property", () => {
  test("hash getter returns fragment without leading #", () => {
    return expect(
      runPreRequestScript(
        `
        const hash = pm.request.url.hash
        console.log("Hash:", hash)
        console.log("Hash type:", typeof hash)
        console.log("Starts with #:", hash.startsWith('#'))
        console.log("Full URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Hash:", "section1"] }),
          expect.objectContaining({ args: ["Hash type:", "string"] }),
          expect.objectContaining({ args: ["Starts with #:", false] }),
          expect.objectContaining({
            args: expect.arrayContaining([
              "Full URL:",
              expect.stringContaining("#section1"),
            ]),
          }),
        ]),
      })
    )
  })

  test("hash getter returns empty string when no fragment", () => {
    const requestWithoutHash: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
    }

    return expect(
      runPreRequestScript(
        `
        const hash = pm.request.url.hash
        console.log("Hash:", hash)
        console.log("Hash is empty:", hash === '')
        console.log("Hash length:", hash.length)
        `,
        { envs, request: requestWithoutHash }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Hash:", ""] }),
          expect.objectContaining({ args: ["Hash is empty:", true] }),
          expect.objectContaining({ args: ["Hash length:", 0] }),
        ]),
      })
    )
  })

  test("hash setter adds fragment to URL", () => {
    const requestWithoutHash: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial hash:", pm.request.url.hash)
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url.hash = 'overview'

        console.log("Updated hash:", pm.request.url.hash)
        console.log("Updated URL:", pm.request.url.toString())
        console.log("URL includes #:", pm.request.url.toString().includes('#overview'))
        `,
        { envs, request: requestWithoutHash }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/users#overview",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial hash:", ""] }),
          expect.objectContaining({ args: ["Updated hash:", "overview"] }),
          expect.objectContaining({ args: ["URL includes #:", true] }),
        ]),
      })
    )
  })

  test("hash setter updates existing fragment", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial hash:", pm.request.url.hash)
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url.hash = 'newsection'

        console.log("Updated hash:", pm.request.url.hash)
        console.log("Updated URL:", pm.request.url.toString())
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/users#newsection",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial hash:", "section1"] }),
          expect.objectContaining({ args: ["Updated hash:", "newsection"] }),
          expect.objectContaining({
            args: expect.arrayContaining([
              "Updated URL:",
              expect.stringContaining("#newsection"),
            ]),
          }),
        ]),
      })
    )
  })

  test("hash setter accepts value with leading #", () => {
    const requestWithoutHash: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users",
    }

    return expect(
      runPreRequestScript(
        `
        pm.request.url.hash = '#details'

        console.log("Hash:", pm.request.url.hash)
        console.log("URL:", pm.request.url.toString())
        console.log("Hash value:", pm.request.url.hash === 'details')
        `,
        { envs, request: requestWithoutHash }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/users#details",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Hash:", "details"] }),
          expect.objectContaining({ args: ["Hash value:", true] }),
        ]),
      })
    )
  })

  test("hash setter removes fragment when set to empty string", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial hash:", pm.request.url.hash)
        console.log("Initial URL:", pm.request.url.toString())

        pm.request.url.hash = ''

        console.log("Updated hash:", pm.request.url.hash)
        console.log("Updated URL:", pm.request.url.toString())
        console.log("URL has #:", pm.request.url.toString().includes('#'))
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/users",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial hash:", "section1"] }),
          expect.objectContaining({ args: ["Updated hash:", ""] }),
          expect.objectContaining({ args: ["URL has #:", false] }),
        ]),
      })
    )
  })

  test("hash works with query parameters", () => {
    const requestWithQueryAndHash: HoppRESTRequest = {
      ...baseRequest,
      endpoint: "https://api.example.com/users?filter=active#top",
      params: [
        { key: "filter", value: "active", active: true, description: "" },
      ],
    }

    return expect(
      runPreRequestScript(
        `
        console.log("Initial URL:", pm.request.url.toString())
        console.log("Initial hash:", pm.request.url.hash)
        console.log("Query params:", pm.request.url.query.all())

        pm.request.url.hash = 'bottom'

        console.log("Updated URL:", pm.request.url.toString())
        console.log("Updated hash:", pm.request.url.hash)
        console.log("Query params unchanged:", JSON.stringify(pm.request.url.query.all()))
        `,
        { envs, request: requestWithQueryAndHash }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://api.example.com/users?filter=active#bottom",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({ args: ["Initial hash:", "top"] }),
          expect.objectContaining({ args: ["Updated hash:", "bottom"] }),
          expect.objectContaining({
            args: ["Query params:", { filter: "active" }],
          }),
        ]),
      })
    )
  })
})

describe("combined host and hash mutations", () => {
  test("host and hash can be changed independently", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("Initial URL:", pm.request.url.toString())
        console.log("Initial host:", pm.request.url.getHost())
        console.log("Initial hash:", pm.request.url.hash)

        pm.request.url.host = ['newdomain', 'com']
        console.log("After host change:", pm.request.url.toString())

        pm.request.url.hash = 'newhash'
        console.log("After hash change:", pm.request.url.toString())

        console.log("Final host:", pm.request.url.getHost())
        console.log("Final hash:", pm.request.url.hash)
        `,
        { envs, request: baseRequest }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://newdomain.com/users#newhash",
        }),
        consoleEntries: expect.arrayContaining([
          expect.objectContaining({
            args: ["Initial host:", "api.example.com"],
          }),
          expect.objectContaining({ args: ["Initial hash:", "section1"] }),
          expect.objectContaining({
            args: ["Final host:", "newdomain.com"],
          }),
          expect.objectContaining({ args: ["Final hash:", "newhash"] }),
        ]),
      })
    )
  })
})
