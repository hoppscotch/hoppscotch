import { execPreRequestScript } from "../preRequest"
import "@relmify/jest-fp-ts"

describe("execPreRequestScript", () => {
  test("returns the updated envirionment properly", () => {
    return expect(
      execPreRequestScript(
        `
          pw.env.set("bob", "newbob")
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        }
      )()
    ).resolves.toEqualRight({
      global: [],
      selected: [
        { key: "bob", value: "newbob" },
        { key: "foo", value: "bar" },
      ],
    })
  })

  test("fails if the key is not a string", () => {
    return expect(
      execPreRequestScript(
        `
          pw.env.set(10, "newbob")
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("fails if the value is not a string", () => {
    return expect(
      execPreRequestScript(
        `
          pw.env.set("bob", 10)
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("fails for invalid syntax", () => {
    return expect(
      execPreRequestScript(
        `
          pw.env.set("bob",
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob" },
            { key: "foo", value: "bar" },
          ],
        }
      )()
    ).resolves.toBeLeft()
  })

  test("creates new env variable if doesn't exist", () => {
    return expect(
      execPreRequestScript(
        `
          pw.env.set("foo", "bar")
        `,
        { selected: [], global: [] }
      )()
    ).resolves.toEqualRight({
      global: [],
      selected: [{ key: "foo", value: "bar" }],
    })
  })
})
