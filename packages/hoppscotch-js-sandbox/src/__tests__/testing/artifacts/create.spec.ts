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

describe("pw.artifact.create", () => {
  test("creates new artifact key correctly", () => {
    return expect(
      func(
        `
          pw.artifact.create("a", "c")
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        a: "c",
      })
    )
  })

  test("doesn't override existing artifact key", () => {
    return expect(
      func(
        `
          pw.artifact.create("a", "b")
        `,
        DEFAULT_ENV,
        { a: "c" }
      )()
    ).resolves.toEqualRight(
      expect.objectContaining({
        a: "c",
      })
    )
  })

  test("error if key is not string", () => {
    return expect(
      func(
        `
          pw.artifact.create(5, "c")
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("error if value is not string", () => {
    return expect(
      func(
        `
          pw.artifact.create("a", 5)
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })

  test("error if both keys and values are not string", () => {
    return expect(
      func(
        `
          pw.artifact.create(5, 5)
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toBeLeft()
  })
})
