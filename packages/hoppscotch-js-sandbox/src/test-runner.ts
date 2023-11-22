import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import cloneDeep from "lodash/cloneDeep"
import { createContext, runInContext, runInNewContext } from "vm"

import { getEnv, preventCyclicObjects, setEnv } from "./utils"

/**
 * The response object structure exposed to the test script
 */
export type TestResponse = {
  /** Status Code of the response */
  status: number
  /** List of headers returned */
  headers: { key: string; value: string }[]
  /**
   * Body of the response, this will be the JSON object if it is a JSON content type, else body string
   */
  body: string | object
}

/**
 * The result of an expectation statement
 */
type ExpectResult = { status: "pass" | "fail" | "error"; message: string } // The expectation failed (fail) or errored (error)

/**
 * An object defining the result of the execution of a
 * test block
 */
export type TestDescriptor = {
  /**
   * The name of the test block
   */
  descriptor: string

  /**
   * Expectation results of the test block
   */
  expectResults: ExpectResult[]

  /**
   * Children test blocks (test blocks inside the test block)
   */
  children: TestDescriptor[]
}

/**
 * Defines the result of a test script execution
 */
export type TestResult = {
  tests: TestDescriptor[]
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  }
}

/**
 * Creates an Expectation object for use inside the sandbox
 * @param context The VM context
 * @param expectVal The expecting value of the expectation
 * @param negated Whether the expectation is negated (negative)
 * @param currTestStack The current state of the test execution stack
 * @returns Handle to the expectation object in VM
 */
const createExpectation = (
  expectVal: any,
  negated: boolean,
  currTestStack: TestDescriptor[]
) => {
  const result = runInNewContext("({})", {})

  const toBeFn = (expectedVal: any) => {
    let assertion = expectVal === expectedVal

    if (negated) {
      assertion = !assertion
    }

    const status = assertion ? "pass" : "fail"
    const message = `Expected '${expectVal}' to${
      negated ? " not" : ""
    } be '${expectedVal}'`

    currTestStack[currTestStack.length - 1].expectResults.push({
      status,
      message,
    })

    return undefined
  }

  const toBeLevelXxx = (
    level: string,
    rangeStart: number,
    rangeEnd: number
  ) => {
    if (typeof expectVal === "number" && !Number.isNaN(expectVal)) {
      let assertion = expectVal >= rangeStart && expectVal <= rangeEnd

      if (negated) {
        assertion = !assertion
      }

      const status = assertion ? "pass" : "fail"
      const message = `Expected '${expectVal}' to${
        negated ? " not" : ""
      } be ${level}-level status`

      currTestStack[currTestStack.length - 1].expectResults.push({
        status,
        message,
      })
    } else {
      const message = `Expected ${level}-level status but could not parse value '${expectVal}'`
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })
    }

    return undefined
  }

  const toBeLevel2xx = () => toBeLevelXxx("200", 200, 299)
  const toBeLevel3xx = () => toBeLevelXxx("300", 300, 399)
  const toBeLevel4xx = () => toBeLevelXxx("400", 400, 499)
  const toBeLevel5xx = () => toBeLevelXxx("500", 500, 599)

  const toBeType = (expectedType: any) => {
    if (
      [
        "string",
        "boolean",
        "number",
        "object",
        "undefined",
        "bigint",
        "symbol",
        "function",
      ].includes(expectedType)
    ) {
      let assertion = typeof expectVal === expectedType

      if (negated) {
        assertion = !assertion
      }

      const status = assertion ? "pass" : "fail"
      const message = `Expected '${expectVal}' to${
        negated ? " not" : ""
      } be type '${expectedType}'`

      currTestStack[currTestStack.length - 1].expectResults.push({
        status,
        message,
      })
    } else {
      const message =
        'Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"'
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })
    }

    return undefined
  }

  const toHaveLength = (expectedLength: any) => {
    if (!(Array.isArray(expectVal) || typeof expectVal === "string")) {
      const message =
        "Expected toHaveLength to be called for an array or string"
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })

      return undefined
    }

    if (typeof expectedLength === "number" && !Number.isNaN(expectedLength)) {
      let assertion = expectVal.length === expectedLength

      if (negated) {
        assertion = !assertion
      }

      const status = assertion ? "pass" : "fail"
      const message = `Expected the array to${
        negated ? " not" : ""
      } be of length '${expectedLength}'`

      currTestStack[currTestStack.length - 1].expectResults.push({
        status,
        message,
      })
    } else {
      const message = "Argument for toHaveLength should be a number"
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })
    }

    return undefined
  }

  const toInclude = (needle: any) => {
    if (!(Array.isArray(expectVal) || typeof expectVal === "string")) {
      const message = "Expected toInclude to be called for an array or string"
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })
      return undefined
    }

    if (needle === null) {
      const message = "Argument for toInclude should not be null"
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })
      return undefined
    }

    if (needle === undefined) {
      const message = "Argument for toInclude should not be undefined"
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message,
      })
      return undefined
    }

    let assertion = expectVal.includes(needle)

    if (negated) {
      assertion = !assertion
    }

    const expectValPretty = JSON.stringify(expectVal)
    const needlePretty = JSON.stringify(needle)
    const status = assertion ? "pass" : "fail"
    const message = `Expected ${expectValPretty} to${
      negated ? " not" : ""
    } include ${needlePretty}`

    currTestStack[currTestStack.length - 1].expectResults.push({
      status,
      message,
    })
    return undefined
  }

  result.toBe = toBeFn
  result.toBeLevel2xx = toBeLevel2xx
  result.toBeLevel3xx = toBeLevel3xx
  result.toBeLevel4xx = toBeLevel4xx
  result.toBeLevel5xx = toBeLevel5xx
  result.toBeType = toBeType
  result.toHaveLength = toHaveLength
  result.toInclude = toInclude

  Object.defineProperties(result, {
    not: {
      get: () => createExpectation(expectVal, !negated, currTestStack),
    },
  })

  return result
}

export const execTestScript = (
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
        () => executeScriptInContext(testScript, envs, response, context),
        (reason) => `Script execution failed: ${JSON.stringify(reason)}`
      )
    )
  )

const executeScriptInContext = (
  testScript: string,
  envs: TestResult["envs"],
  response: TestResponse,
  context: any
): Promise<TestResult> => {
  return new Promise((resolve, reject) => {
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
