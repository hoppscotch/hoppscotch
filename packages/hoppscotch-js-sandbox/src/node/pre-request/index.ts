import * as TE from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/function"
import { RunPreRequestScriptOptions, SandboxPreRequestResult } from "~/types"

import { runPreRequestScriptWithFaradayCage } from "./experimental"

export const runPreRequestScript = (
  preRequestScript: string,
  options: RunPreRequestScriptOptions
): TE.TaskEither<string, SandboxPreRequestResult> => {
  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request, cookies, hoppFetchHook } = options as Extract<
      RunPreRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPreRequestScriptWithFaradayCage(
      preRequestScript,
      envs,
      request,
      cookies,
      hoppFetchHook
    )
  }

  // Dynamically import legacy runner to avoid loading isolated-vm unless needed
  return pipe(
    TE.tryCatch(
      async () => {
        const { runPreRequestScriptWithIsolatedVm } = await import("./legacy")
        return runPreRequestScriptWithIsolatedVm(preRequestScript, envs)
      },
      (error) => `Legacy sandbox execution failed: ${error}`
    ),
    TE.chain((taskEither) => taskEither)
  )
}
