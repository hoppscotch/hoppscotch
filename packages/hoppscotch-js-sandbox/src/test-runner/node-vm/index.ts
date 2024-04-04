import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { createRequire } from "module"

import type ivmT from "isolated-vm"

import { TestResponse, TestResult } from "~/types"
import { getTestRunnerScriptMethods, preventCyclicObjects } from "~/utils"

const nodeRequire = createRequire(import.meta.url)
const ivm = nodeRequire("isolated-vm")

// Function to recursively wrap functions in `ivm.Reference`
const wrapMethodsInReference = (
  obj: Record<string, unknown>
): Record<string, unknown> => {
  const wrappedObj: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      wrappedObj[key] = wrapMethodsInReference(value as Record<string, unknown>)
    } else if (typeof value === "function") {
      wrappedObj[key] = new ivm.Reference(value)
    } else {
      wrappedObj[key] = value
    }
  }

  return wrappedObj
}

export const runTestScript = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, TestResult> =>
  pipe(
    TE.tryCatch(
      async () => {
        const isolate: ivmT.Isolate = new ivm.Isolate()
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
  isolate: ivmT.Isolate,
  context: ivmT.Context
): Promise<TestResult> => {
  return new Promise((resolve, reject) => {
    // Parse response object
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return reject(`Response parsing failed: ${responseObjHandle.left}`)
    }

    const jail = context.global

    const { pw, testRunStack, updatedEnvs } = getTestRunnerScriptMethods(envs)

    const wrappedMethods = wrapMethodsInReference({
      ...pw,
      response: responseObjHandle.right,
    })
    jail.setSync("wrappedMethods", wrappedMethods, { copy: true })

    jail.setSync("atob", atob)
    jail.setSync("btoa", btoa)

    // Methods in the isolate context can't be invoked straightaway
    const finalScript = `
      const getResolvedMethods = (
        obj
      ) => {
        const result = {}
        
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
            result[key] = getResolvedMethods(value)
          } else if(value.typeof === "function") {
            result[key] = (...args) => value.applySync(null, args) 
          } else {
            result[key] = value
          }
        }
        
        return result
      }

      const pw = getResolvedMethods(wrappedMethods)

      ${testScript}
    `

    // Create a script and compile it
    const script = isolate.compileScript(finalScript)

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
