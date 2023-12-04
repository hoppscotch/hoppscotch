import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"

import { createContext, runInContext } from "vm"

import { TestDescriptor, TestResponse, TestResult } from "../../types"
import {
  createExpectation,
  getEnv,
  preventCyclicObjects,
  setEnv,
} from "../../utils"

/**
 * Node VM based implementation
 */

export const execTestScriptForNode = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse
): TE.TaskEither<string, TestResult> =>
  pipe(
    TE.tryCatch(
      async () => {
        return createContext()
      },
      (reason) => `Context initialization failed: ${reason}`
    ),
    TE.chain((context) =>
      TE.tryCatch(
        () =>
          executeScriptInContextForNode(testScript, envs, response, context),
        (reason) => `Script execution failed: ${JSON.stringify(reason)}`
      )
    )
  )

const executeScriptInContextForNode = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  context: any
): Promise<TestResult> => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    try {
      let currentEnvs = cloneDeep(envs)

      const testRunStack: TestDescriptor[] = [
        { descriptor: "root", expectResults: [], children: [] },
      ]

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
          return reject({
            error: "Expected key to be a string",
          })
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
          return reject({
            error: "Expected key to be a string",
          })
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
          return reject({
            error: "Expected key to be a string",
          })
        }

        if (typeof value !== "string") {
          return reject({
            error: "Expected value to be a string",
          })
        }

        currentEnvs = setEnv(key, value, currentEnvs)

        return undefined
      }

      const envResolveHandle = (value: any) => {
        if (typeof value !== "string") {
          return reject({
            error: "Expected value to be a string",
          })
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

      // Parse response object
      const responseObjHandle = preventCyclicObjects(response)
      if (E.isLeft(responseObjHandle)) {
        return TE.left(`Response parsing failed: ${responseObjHandle.left}`)
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

      // Expose pw to the context
      context.pw = pw
      context.console = console

      // Run the test script in the provided context
      runInContext(testScript, context)

      resolve({
        tests: testRunStack,
        envs: currentEnvs,
      })
    } catch (error) {
      reject({ error: `Script execution failed: ${(error as Error).message}` })
    }
  })
}
