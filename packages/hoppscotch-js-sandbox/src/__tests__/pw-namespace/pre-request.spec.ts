import { describe, expect, test } from "vitest"

import { getDefaultRESTRequest } from "@hoppscotch/data"
import { runPreRequestScript } from "~/node"

const DEFAULT_REQUEST = getDefaultRESTRequest()

describe("runPreRequestScript", () => {
  test("returns the updated environment properly", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set("bob", "newbob")
        `,
        {
          envs: {
            global: [],
            selected: [
              {
                key: "bob",
                currentValue: "oldbob",
                initialValue: "oldbob",
                secret: false,
              },
              {
                key: "foo",
                currentValue: "bar",
                initialValue: "bar",
                secret: false,
              },
            ],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toEqualRight({
      updatedEnvs: {
        global: [],
        selected: [
          {
            key: "bob",
            currentValue: "newbob",
            initialValue: "oldbob",
            secret: false,
          },
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
      },
      updatedRequest: DEFAULT_REQUEST,
      updatedCookies: null,
    })
  })

  test("fails if the key is not a string", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set(10, "newbob")
        `,
        {
          envs: {
            global: [],
            selected: [
              {
                key: "bob",
                currentValue: "oldbob",
                initialValue: "oldbob",
                secret: false,
              },
              {
                key: "foo",
                currentValue: "bar",
                initialValue: "bar",
                secret: false,
              },
            ],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toBeLeft()
  })

  test("fails if the value is not a string", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set("bob", 10)
        `,
        {
          envs: {
            global: [],
            selected: [
              {
                key: "bob",
                currentValue: "oldbob",
                initialValue: "oldbob",
                secret: false,
              },
              {
                key: "foo",
                currentValue: "bar",
                initialValue: "bar",
                secret: false,
              },
            ],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toBeLeft()
  })

  test("fails for invalid syntax", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set("bob",
        `,
        {
          envs: {
            global: [],
            selected: [
              {
                key: "bob",
                currentValue: "oldbob",
                initialValue: "oldbob",
                secret: false,
              },
              {
                key: "foo",
                currentValue: "bar",
                initialValue: "bar",
                secret: false,
              },
            ],
          },
          request: DEFAULT_REQUEST,
        }
      )()
    ).resolves.toBeLeft()
  })

  test("creates new env variable if doesn't exist", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set("foo", "bar")
        `,
        { envs: { global: [], selected: [] }, request: DEFAULT_REQUEST }
      )()
    ).resolves.toEqualRight({
      updatedEnvs: {
        global: [],
        selected: [
          {
            key: "foo",
            currentValue: "bar",
            initialValue: "bar",
            secret: false,
          },
        ],
      },
      updatedRequest: DEFAULT_REQUEST,
      updatedCookies: null,
    })
  })
})
