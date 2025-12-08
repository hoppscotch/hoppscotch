import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { FaradayCage } from "faraday-cage"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import { cloneDeep } from "lodash"

import { defaultModules, preRequestModule } from "~/cage-modules"
import { HoppFetchHook, SandboxPreRequestResult, TestResult } from "~/types"

export const runPreRequestScriptWithFaradayCage = (
  preRequestScript: string,
  envs: TestResult["envs"],
  request: HoppRESTRequest,
  cookies: Cookie[] | null,
  hoppFetchHook?: HoppFetchHook
): TE.TaskEither<string, SandboxPreRequestResult> => {
  return pipe(
    TE.tryCatch(
      async (): Promise<SandboxPreRequestResult> => {
        let finalEnvs = envs
        let finalRequest = request
        let finalCookies = cookies

        const cage = await FaradayCage.create()

        try {
          const captureHook: { capture?: () => void } = {}

          const result = await cage.runCode(preRequestScript, [
            ...defaultModules({
              hoppFetchHook,
            }),

            preRequestModule(
              {
                envs: cloneDeep(envs),
                request: cloneDeep(request),
                cookies: cookies ? cloneDeep(cookies) : null,
                handleSandboxResults: ({ envs, request, cookies }) => {
                  finalEnvs = envs
                  finalRequest = request
                  finalCookies = cookies
                },
              },
              captureHook
            ),
          ])

          if (captureHook.capture) {
            captureHook.capture()
          }

          if (result.type === "error") {
            throw result.err
          }

          return {
            updatedEnvs: finalEnvs,
            updatedRequest: finalRequest,
            updatedCookies: finalCookies,
          }
        } finally {
          // Don't dispose cage here - returned objects may still be accessed.
          // Rely on garbage collection for cleanup.
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
