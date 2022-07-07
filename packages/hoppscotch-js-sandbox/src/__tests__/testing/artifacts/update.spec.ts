import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
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
) =>
  pipe(
    execPreRequestScript(script, envs, artifacts),
    TE.map((x) => x.artifacts)
  )

describe("pw.artifact.update", () => {
  test("updates artifact for existing key", () => {
    return expect(
      func(
        `
          pw.artifact.update("a", "updated_c")
        `,
        DEFAULT_ENV,
        { a: "c" }
      )()
    ).resolves.toEqualRight(expect.objectContaining({ a: "updated_c" }))
  })

  test("error if artifact key doesn't exist", () => {
    return expect(
      func(
        `
          pw.artifact.update("a", "b")
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("error if the key is not string", () => {
    return expect(
      func(
        `
          pw.artifact.update(1, "b")
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("error if the value is not string", () => {
    return expect(
      func(
        `
          pw.artifact.update("a", 2)
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })
})
