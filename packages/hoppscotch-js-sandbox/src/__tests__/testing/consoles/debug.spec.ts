import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { execPreRequestScript } from "../../../preRequest"
import { Artifacts } from "../../../apis/artifact"
import { Envs } from "../../../apis/env"
import { HoppConsole } from "../../../apis/console"
import "@relmify/jest-fp-ts"

const DEFAULT_ENV = {
  global: [],
  selected: [],
}

const func = (script: string, envs: Envs, artifacts: Artifacts) =>
  pipe(
    execPreRequestScript(script, envs, artifacts),
    TE.map((x) => x.consoles)
  )

describe("console.debug", () => {
  test("provides console data correctly.", () => {
    return expect(
      func(
        `
        env.set("ENV","ENV_VALUE")
        const data = env.get("ENV")
        const obj = {
          a:1,
          b:2
        }

        console.debug("Obj:", obj)
        console.debug("Data:", data)

        console.debug()
        `,
        DEFAULT_ENV,
        {}
      )()
    ).resolves.toEqualRight(<Array<HoppConsole>>[
      {
        lineNumber: 9,
        data: ["Obj:", { a: 1, b: 2 }],
        type: "debug",
      },
      {
        lineNumber: 10,
        data: ["Data:", "ENV_VALUE"],
        type: "debug",
      },
      {
        lineNumber: 12,
        data: [],
        type: "debug",
      },
    ])
  })
})
