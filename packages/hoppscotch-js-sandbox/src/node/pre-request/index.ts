import * as TE from "fp-ts/lib/TaskEither"
import { RunPreRequestScriptOptions, SandboxPreRequestResult } from "~/types"

import { runPreRequestScriptWithFaradayCage } from "./experimental"
import { runPreRequestScriptWithIsolatedVm } from "./legacy"

export const runPreRequestScript = (
  preRequestScript: string,
  options: RunPreRequestScriptOptions
): TE.TaskEither<string, SandboxPreRequestResult> => {
  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request, cookies } = options as Extract<
      RunPreRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPreRequestScriptWithFaradayCage(
      preRequestScript,
      envs,
      request,
      cookies
    )
  }

  return runPreRequestScriptWithIsolatedVm(preRequestScript, envs)
}
