import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import ivm from "isolated-vm"

import { TestResponse, TestResult } from "~/types"
import { getTestRunnerScriptMethods, preventCyclicObjects } from "~/utils"

export const runTestScript = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, TestResult> =>
  pipe(
    TE.tryCatch(
      async () => {
        const isolate = new ivm.Isolate()
        const context = await isolate.createContext()
        return { isolate, context }
      },
      (reason) => `Context initialization failed: ${reason}`
    ),
    TE.chain(({ isolate, context }) =>
      pipe(
        TE.tryCatch(
          async () =>
            executeScriptInContext(
              testScript,
              envs,
              response,
              isolate,
              context
            ),
          (reason) => `Script execution failed: ${reason}`
        ),
        TE.chain((result) =>
          TE.tryCatch(
            async () => {
              await isolate.dispose()
              return result
            },
            (disposeReason) => `Isolate disposal failed: ${disposeReason}`
          )
        )
      )
    )
  )
const executeScriptInContext = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  isolate: ivm.Isolate,
  context: ivm.Context
): Promise<TestResult> => {
  return new Promise((resolve, reject) => {
    // Parse response object
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return reject(`Response parsing failed: ${responseObjHandle.left}`)
    }

    const { pw, testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

    // Expose pw to the context
    context.global.set(
      "pw",
      new ivm.ExternalCopy({ ...pw, response: responseObjHandle.right })
    )
    context.global.set("atob", new ivm.ExternalCopy(globalThis.atob))
    context.global.set("btoa", new ivm.ExternalCopy(globalThis.btoa))

    // Create a script and compile it
    const script = isolate.compileScript(testScript)

    // Run the test script in the provided context
    script
      .then((script) => script.run(context))
      .then(() => {
        resolve({
          tests: testRunStack,
          envs: updatedEnvs,
        })
      })
      .catch((error: Error) => {
        reject(`Script execution failed: ${error}`)
      })
  })
}
