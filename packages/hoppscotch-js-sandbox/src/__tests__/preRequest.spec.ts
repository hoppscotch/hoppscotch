import { execPreRequestScript } from "../preRequest"
import "@relmify/jest-fp-ts"

describe("execPreRequestScript", () => {
  test("returns the updated envirionment properly", () => {
    return expect(
      execPreRequestScript(
        `
          env.set("bob", "newbob")
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        },
        {}
      )()
    ).resolves.toEqualRight({
      envs: {
        global: [],
        selected: [
          { key: "bob", value: "newbob" },
          { key: "foo", value: "bar" },
        ],
      },
      artifacts: {},
      consoles: [],
    })
  })

  test("fails if the key is not a string", () => {
    return expect(
      execPreRequestScript(
        `
          env.set(10, "newbob")
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        },
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("fails if the value is not a string", () => {
    return expect(
      execPreRequestScript(
        `
          env.set("bob", 10)
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        },
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("fails for invalid syntax", () => {
    return expect(
      execPreRequestScript(
        `
          env.set("bob",
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        },
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("creates new env variable if doesn't exist", () => {
    return expect(
      execPreRequestScript(
        `
          env.set("foo", "bar")
        `,
        { selected: [], global: [] },
        {}
      )()
    ).resolves.toEqualRight({
      envs: {
        global: [],
        selected: [{ key: "foo", value: "bar" }],
      },
      artifacts: {},
      consoles: [],
    })
  })
})
