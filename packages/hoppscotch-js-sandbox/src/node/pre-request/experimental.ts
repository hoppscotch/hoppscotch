import { HoppRESTRequest } from "@hoppscotch/data"
import { FaradayCage } from "faraday-cage"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"

import { defaultModules, pwPreRequestModule } from "~/cage-modules"
import { SandboxPreRequestResult, TestResult } from "~/types"

export const runPreRequestScriptWithFaradayCage = (
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
): TE.TaskEither<string, SandboxPreRequestResult> => {
  return pipe(
    TE.tryCatch(
      async (): Promise<SandboxPreRequestResult> => {
        let finalEnvs = envs
        let finalRequest = request

        const cage = await FaradayCage.create()

        const result = await cage.runCode(preRequestScript, [
          ...defaultModules(),

          pwPreRequestModule({
            envs: cloneDeep(envs),
            request,
            handleSandboxResults: ({ envs, request }) => {
              finalEnvs = envs
              finalRequest = request
            },
          }),
        ])

        if (result.type === "error") {
          throw result.err
        }

        return {
          updatedEnvs: finalEnvs,
          updatedRequest: finalRequest,
        }
      },
      (error) => {
        if (error !== null && typeof error === "object" && "message" in error) {
          const reason = `${"name" in error ? error.name : ""}: ${error.message}`
          return `Script execution failed: ${reason}`
        }

        return `Script execution failed: ${String(error)}`
      },
    ),
  )
}
