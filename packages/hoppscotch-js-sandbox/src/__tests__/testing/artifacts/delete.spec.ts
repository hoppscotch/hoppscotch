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

describe("pw.artifact.delete", () => {
  test("deletes from artifact for given key", () => {
    return expect(
      func(
        `
          pw.artifact.delete("a")
        `,
        DEFAULT_ENV,
        { a: "c", b: "d" }
      )()
    ).resolves.toEqualRight(expect.objectContaining({ b: "d" }))
  })

  test("error if artifact key is not string", () => {
    return expect(
      func(
        `
          pw.artifact.delete(5)
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("error if artifact key doesn't exists", () => {
    return expect(
      func(
        `
          pw.artifact.delete("a")
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })
})
