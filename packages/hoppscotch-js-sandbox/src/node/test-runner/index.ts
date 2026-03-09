import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { RunPostRequestScriptOptions, TestResponse, TestResult } from "~/types"
import { preventCyclicObjects } from "~/utils/shared"
import { runPostRequestScriptWithFaradayCage } from "./experimental"

// Future TODO: Update return type to be based on `SandboxTestResult` (unified with the web implementation)
// No involvement of cookies in the CLI context currently
export const runTestScript = (
  testScript: string,
  options: RunPostRequestScriptOptions
): TE.TaskEither<string, TestResult> => {
  // Pre-parse the script to catch syntax errors before execution
  // Use AsyncFunction to support top-level await (required for hopp.fetch, etc.)
  try {
    // eslint-disable-next-line no-new-func
    const AsyncFunction = Object.getPrototypeOf(
      async function () {}
    ).constructor
    new (AsyncFunction as any)(testScript)
  } catch (e) {
    const err = e as Error
    const reason = `${"name" in err ? (err as any).name : "SyntaxError"}: ${err.message}`
    return TE.left(`Script execution failed: ${reason}`)
  }

  const responseObjHandle = preventCyclicObjects<TestResponse>(options.response)

  if (E.isLeft(responseObjHandle)) {
    return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
  }

  const resolvedResponse = responseObjHandle.right
  const { envs, experimentalScriptingSandbox = true } = options

  if (experimentalScriptingSandbox) {
    const { request, hoppFetchHook } = options as Extract<
      RunPostRequestScriptOptions,
      { experimentalScriptingSandbox: true }
    >

    return runPostRequestScriptWithFaradayCage(
      testScript,
      envs,
      request,
      resolvedResponse,
      hoppFetchHook
    )
  }

  // Dynamically import legacy runner to avoid loading isolated-vm unless needed
  return pipe(
    TE.tryCatch(
      async () => {
        const { runPostRequestScriptWithIsolatedVm } = await import("./legacy")
        return runPostRequestScriptWithIsolatedVm(
          testScript,
          envs,
          resolvedResponse
        )
      },
      (error) => `Legacy sandbox execution failed: ${error}`
    ),
    TE.chain((taskEither) => taskEither)
  )
}
