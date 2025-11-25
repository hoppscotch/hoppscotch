import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { FaradayCage } from "faraday-cage"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"

import { defaultModules, preRequestModule } from "~/cage-modules"
import { SandboxPreRequestResult, TestResult } from "~/types"

export const runPreRequestScriptWithFaradayCage = (
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null
): TE.TaskEither<string, SandboxPreRequestResult> => {
  return pipe(
    TE.tryCatch(
      async (): Promise<SandboxPreRequestResult> => {
        let finalEnvs = envs
        let finalRequest = request
        let finalCookies = cookies

        const cage = await FaradayCage.create()

        const result = await cage.runCode(preRequestScript, [
          ...defaultModules(),

          preRequestModule({
            envs: cloneDeep(envs),
            request: cloneDeep(request),
            cookies: cookies ? cloneDeep(cookies) : null,
            handleSandboxResults: ({ envs, request, cookies }) => {
              finalEnvs = envs
              finalRequest = request
              finalCookies = cookies
            },
          }),
        ])

        if (result.type === "error") {
          throw result.err
        }

        return {
          updatedEnvs: finalEnvs,
          updatedRequest: finalRequest,
          updatedCookies: finalCookies,
        }
      },
      (error) => {
        if (error !== null && typeof error === "object" && "message" in error) {
          const reason = `${"name" in error ? error.name : ""}: ${error.message}`
          return `Script execution failed: ${reason}`
        }

        return `Script execution failed: ${String(error)}`
      }
    )
  )
}
