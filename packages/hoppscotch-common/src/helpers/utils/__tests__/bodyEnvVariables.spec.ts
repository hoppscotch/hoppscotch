import { describe, expect, test } from "vitest"
import { Environment, parseBodyEnvVariables } from "@hoppscotch/data"

// `getFinalBodyFromRequest` resolves request bodies through
// `parseBodyEnvVariables`, keeping missing vars as literal `<<key>>`
const vars: Environment["variables"] = [
  {
    key: "host",
    initialValue: "example.com",
    currentValue: "example.com",
    secret: false,
  },
]

describe("parseBodyEnvVariables", () => {
  test("resolves known variables when the body also references a missing one", () => {
    expect(
      parseBodyEnvVariables(
        '{"url": "https://<<host>>", "note": "<<notDefined>>"}',
        vars
      )
    ).toBe('{"url": "https://example.com", "note": "<<notDefined>>"}')
  })

  test("resolves nested variables next to a missing one", () => {
    expect(
      parseBodyEnvVariables("<<url>> <<notDefined>>", [
        ...vars,
        {
          key: "url",
          initialValue: "https://<<host>>/v1",
          currentValue: "https://<<host>>/v1",
          secret: false,
        },
      ])
    ).toBe("https://example.com/v1 <<notDefined>>")
  })

  test("returns the body unchanged when variables reference each other in a loop", () => {
    const loopVars: Environment["variables"] = [
      { key: "a", initialValue: "<<b>>", currentValue: "<<b>>", secret: false },
      { key: "b", initialValue: "<<a>>", currentValue: "<<a>>", secret: false },
    ]

    expect(parseBodyEnvVariables("<<a>> <<host>>", loopVars)).toBe(
      "<<a>> <<host>>"
    )
  })
})
