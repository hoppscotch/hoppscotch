/**
 * Web worker based implementation
 */

import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/lib/function"
import { cloneDeep } from "lodash-es"

import { TestDescriptor, TestResponse, TestResult } from "../../types"
import { getEnv, preventCyclicObjects, setEnv } from "../../utils"
import { createExpectation } from "../node-vm"

const executeScriptInContextForWeb = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
) => {
  try {
    let currentEnvs = cloneDeep(envs)

    const testRunStack: TestDescriptor[] = [
      { descriptor: "root", expectResults: [], children: [] },
    ]

    // Create a function from the script using the Function constructor
    const scriptFunction = new Function(
      "pw",
      "marshalObject",
      "cloneDeep",
      "testRunStack",
      "envs",
      "response",
      `${testScript}`
    )

    const testFuncHandle = (descriptor: string, testFunc: () => void) => {
      testRunStack.push({
        descriptor,
        expectResults: [],
        children: [],
      })

      testFunc()

      const child = testRunStack.pop() as TestDescriptor
      testRunStack[testRunStack.length - 1].children.push(child)
    }

    const expectFnHandle = (expectVal: any) =>
      createExpectation(expectVal, false, testRunStack)

    const envGetHandle = (key: any) => {
      if (typeof key !== "string") {
        return TE.left("Expected key to be a string")
      }

      const result = pipe(
        getEnv(key, currentEnvs),
        O.match(
          () => undefined,
          ({ value }) => String(value)
        )
      )

      return result
    }

    const envGetResolveHandle = (key: any) => {
      if (typeof key !== "string") {
        return TE.left("Expected key to be a string")
      }

      const result = pipe(
        getEnv(key, currentEnvs),
        E.fromOption(() => "INVALID_KEY" as const),

        E.map(({ value }) =>
          pipe(
            parseTemplateStringE(value, [...envs.selected, ...envs.global]),
            // If the recursive resolution failed, return the unresolved value
            E.getOrElse(() => value)
          )
        ),
        E.map((x) => String(x)),

        E.getOrElseW(() => undefined)
      )

      return result
    }

    const envSetHandle = (key: any, value: any) => {
      if (typeof key !== "string") {
        return TE.left("Expected key to be a string")
      }

      if (typeof value !== "string") {
        return TE.left("Expected value to be a string")
      }

      currentEnvs = setEnv(key, value, currentEnvs)

      return undefined
    }

    const envResolveHandle = (value: any) => {
      if (typeof value !== "string") {
        return TE.left("Expected value to be a string")
      }

      const result = pipe(
        parseTemplateStringE(value, [
          ...currentEnvs.selected,
          ...currentEnvs.global,
        ]),
        E.getOrElse(() => value)
      )

      return String(result)
    }

    // Marshal response object
    const responseObjHandle = preventCyclicObjects(response)
    if (E.isLeft(responseObjHandle)) {
      return TE.left(`Response marshalling failed: ${responseObjHandle.left}`)
    }

    const pw = {
      response: responseObjHandle.right,
      expect: expectFnHandle,
      test: testFuncHandle,
      env: {
        get: envGetHandle,
        getResolve: envGetResolveHandle,
        set: envSetHandle,
        resolve: envResolveHandle,
      },
    }

    // Expose pw and other dependencies to the script
    scriptFunction(
      pw,
      preventCyclicObjects,
      cloneDeep,
      testRunStack,
      currentEnvs,
      response
    )

    return TE.right({
      tests: testRunStack[0],
      envs: currentEnvs,
    })
  } catch (error) {
    return TE.left(`Script execution failed: ${(error as Error).message}`)
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { messageId, testScript, envs, response } = event.data

  const result = await executeScriptInContextForWeb(
    testScript,
    envs,
    response
  )()

  // Post the result back to the main thread
  self.postMessage({ messageId, result })
})
