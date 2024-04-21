import "@relmify/jest-fp-ts"

import { runPreRequestScript } from "~/pre-request/node-vm"

describe("runPreRequestScript", () => {
  test("returns the updated environment properly", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set("bob", "newbob")
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob", secret: false },
            { key: "foo", value: "bar", secret: false },
          ],
        }
      )()
    ).resolves.toEqualRight({
      global: [],
      selected: [
        { key: "bob", value: "newbob", secret: false },
        { key: "foo", value: "bar", secret: false },
      ],
    })
  })

  test("fails if the key is not a string", () => {
    return expect(
      runPreRequestScript(
        `
          pw.env.set(10, "newbob")
        `,
        {
          global: [],
          selected: [
            { key: "bob", value: "oldbob", secret: false },
            { key: "foo", value: "bar", secret: false },
          ],
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
          global: [],
          selected: [
            { key: "bob", value: "oldbob", secret: false },
            { key: "foo", value: "bar", secret: false },
          ],
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
          global: [],
          selected: [
            { key: "bob", value: "oldbob", secret: false },
            { key: "foo", value: "bar", secret: false },
          ],
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
        { selected: [], global: [] }
      )()
    ).resolves.toEqualRight({
      global: [],
      selected: [{ key: "foo", value: "bar", secret: false }],
    })
  })

  test("creates new env variable with pw.variables.replaceIn({{$timestamp}})", () => {
    const replaceInTimestamp = runPreRequestScript(
      `
        pw.env.set("foo", pw.variables.replaceIn("{{$timestamp}}") + "")
        `,
      { global: [], selected: [] }
    )()

    expect(replaceInTimestamp).resolves.toHaveProperty(
      "right.selected[0].key",
      "foo"
    )
    expect(replaceInTimestamp).resolves.toHaveProperty(
      "right.selected[0].secret",
      false
    )
    expect(replaceInTimestamp).resolves.toHaveProperty(
      "right.selected[0].value",
      Math.floor(Date.now() / 1000) + ""
    )
  })

  test("creates new env variable with pw.variables.replaceIn({{$isoTimestamp}})", () => {
    const replaceInTimestamp = runPreRequestScript(
      `
        pw.env.set("foo", pw.variables.replaceIn("{{$isoTimestamp}}"))
        `,
      { global: [], selected: [] }
    )()
    expect(replaceInTimestamp).resolves.toBeRight()
    expect(replaceInTimestamp).resolves.toHaveProperty(
      "right.selected[0].key",
      "foo"
    )
    expect(replaceInTimestamp).resolves.toHaveProperty(
      "right.selected[0].secret",
      false
    )
  })
})
