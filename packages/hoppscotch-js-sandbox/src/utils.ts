import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"

import { parseTemplateStringE } from "@hoppscotch/data"
import { pipe } from "fp-ts/lib/function"
import {
  GlobalEnvItem,
  SelectedEnvItem,
  TestDescriptor,
  TestResult,
} from "./types"

export function preventCyclicObjects(
  obj: Record<string, any>
): E.Left<string> | E.Right<Record<string, any>> {
  let jsonString

  try {
    jsonString = JSON.stringify(obj)
  } catch (e) {
    return E.left("Stringification failed")
  }

  try {
    const parsedJson = JSON.parse(jsonString)
    return E.right(parsedJson)
  } catch (err) {
    return E.left("Parsing failed")
  }
}

export function getEnv(envName: string, envs: TestResult["envs"]) {
  return O.fromNullable(
    envs.selected.find((x: SelectedEnvItem) => x.key === envName) ??
      envs.global.find((x: GlobalEnvItem) => x.key === envName)
  )
}

export function setEnv(
  envName: string,
  envValue: string,
  envs: TestResult["envs"]
): TestResult["envs"] {
  const indexInSelected = envs.selected.findIndex(
    (x: SelectedEnvItem) => x.key === envName
  )

  // Found the match in selected
  if (indexInSelected >= 0) {
    envs.selected[indexInSelected].value = envValue

    return {
      global: envs.global,
      selected: envs.selected,
    }
  }

  const indexInGlobal = envs.global.findIndex(
    (x: GlobalEnvItem) => x.key == envName
  )

  // Found a match in globals
  if (indexInGlobal >= 0) {
    envs.global[indexInGlobal].value = envValue

    return {
      global: envs.global,
      selected: envs.selected,
    }
  }

  // Didn't find in both places, create a new variable in selected
  envs.selected.push({
    key: envName,
    value: envValue,
  })

  return {
    global: envs.global,
    selected: envs.selected,
  }
}

/**
 * Creates an Expectation object for use inside the sandbox
 * @param expectVal The expecting value of the expectation
 * @param negated Whether the expectation is negated (negative)
 * @param currTestStack The current state of the test execution stack
 * @returns Handle to the expectation object in VM
 */
export const createExpectation = (
  expectVal: any,
  negated: boolean,
  currTestStack: TestDescriptor[]
) => {
  const result: Record<string, unknown> = {}

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
    const parsedExpectVal = parseInt(expectVal)

    if (!Number.isNaN(parsedExpectVal)) {
      let assertion =
        parsedExpectVal >= rangeStart && parsedExpectVal <= rangeEnd

      if (negated) {
        assertion = !assertion
      }

      const status = assertion ? "pass" : "fail"
      const message = `Expected '${parsedExpectVal}' to${
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

/**
 * Compiles methods for use under the `pw` namespace for pre request scripts
 * @param envs The current state of the environment variables
 * @returns Object with methods in the `pw` namespace and updated environments
 */
export const getPreRequestScriptMethods = (envs: TestResult["envs"]) => {
  // The `envs` arg is supplied after deep cloning
  let currentEnvs = envs

  const envGetHandle = (key: any) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
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
      throw new Error("Expected key to be a string")
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
      throw new Error("Expected key to be a string")
    }

    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    currentEnvs = setEnv(key, value, currentEnvs)

    return undefined
  }

  const envResolveHandle = (value: any) => {
    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
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

  const pw = {
    env: {
      get: envGetHandle,
      getResolve: envGetResolveHandle,
      set: envSetHandle,
      resolve: envResolveHandle,
    },
  }

  return { pw, updatedEnvs: currentEnvs }
}

/**
 * Compiles methods for use under the `pw` namespace for post request scripts
 * @param envs The current state of the environment variables
 * @returns Object with methods in the `pw` namespace, test run stack and environments that are updated
 */
export const getTestRunnerScriptMethods = (envs: TestResult["envs"]) => {
  // The `envs` arg is supplied after deep cloning
  let currentEnvs = envs

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
      throw new Error("Expected key to be a string")
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
      throw new Error("Expected key to be a string")
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
      throw new Error("Expected key to be a string")
    }

    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    currentEnvs = setEnv(key, value, currentEnvs)

    return undefined
  }

  const envResolveHandle = (value: any) => {
    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
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

  const pw = {
    expect: expectFnHandle,
    test: testFuncHandle,
    env: {
      get: envGetHandle,
      getResolve: envGetResolveHandle,
      set: envSetHandle,
      resolve: envResolveHandle,
    },
  }

  return { pw, testRunStack, updatedEnvs: currentEnvs }
}
