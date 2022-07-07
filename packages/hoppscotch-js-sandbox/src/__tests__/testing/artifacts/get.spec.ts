import { TestScriptReport } from "../../../test-runner"
import { execPreRequestScript } from "../../../preRequest"
import { Artifacts } from "../../../apis/artifact"
import "@relmify/jest-fp-ts"

const DEFAULT_ENV = {
  global: [],
  selected: [],
}

const func = (
  script: string,
  envs: TestScriptReport["envs"],
  artifacts: Artifacts
) => execPreRequestScript(script, envs, artifacts)

describe("pw.artifact.get", () => {
  test("returns the correct value for an existing artifact", () => {
    return expect(
      func(
        `
          const data = pw.artifact.get("a")
          pw.env.set("a", data)
      `,
        DEFAULT_ENV,
        { a: "b" }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        artifacts: { a: "b" },
        envs: { global: [], selected: [{ key: "a", value: "b" }] },
      })
    )
  })

  test("returns undefined for an key that is not present in existing artifacts", () => {
    return expect(
      func(
        `
          const data = pw.artifact.get("a")

          if(data === undefined) {
            pw.artifact.create("a", "undefined")
          }
      `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        artifacts: { a: "undefined" },
      })
    )
  })

  test("error if the key is not a string", () => {
    return expect(
      func(
        `
          const data = pw.artifact.get(5)
      `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })
})
