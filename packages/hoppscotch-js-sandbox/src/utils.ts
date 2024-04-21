import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/lib/function"
import { cloneDeep } from "lodash-es"

import {
  GlobalEnvItem,
  SelectedEnvItem,
  TestDescriptor,
  TestResult,
} from "./types"

const getEnv = (envName: string, envs: TestResult["envs"]) => {
  return O.fromNullable(
    envs.selected.find((x: SelectedEnvItem) => x.key === envName) ??
      envs.global.find((x: GlobalEnvItem) => x.key === envName)
  )
}

const findEnvIndex = (
  envName: string,
  envList: SelectedEnvItem[] | GlobalEnvItem[]
): number => {
  return envList.findIndex(
    (envItem: SelectedEnvItem) => envItem.key === envName
  )
}

const setEnv = (
  envName: string,
  envValue: string,
  envs: TestResult["envs"]
): TestResult["envs"] => {
  const { global, selected } = envs

  const indexInSelected = findEnvIndex(envName, selected)
  const indexInGlobal = findEnvIndex(envName, global)

  if (indexInSelected >= 0) {
    const selectedEnv = selected[indexInSelected]
    if ("value" in selectedEnv) {
      selectedEnv.value = envValue
    }
  } else if (indexInGlobal >= 0) {
    if ("value" in global[indexInGlobal]) {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;(global[indexInGlobal] as { value: string }).value = envValue
    }
  } else {
    selected.push({
      key: envName,
      value: envValue,
      secret: false,
    })
  }

  return {
    global,
    selected,
  }
}

const unsetEnv = (
  envName: string,
  envs: TestResult["envs"]
): TestResult["envs"] => {
  const { global, selected } = envs

  const indexInSelected = findEnvIndex(envName, selected)
  const indexInGlobal = findEnvIndex(envName, global)

  if (indexInSelected >= 0) {
    selected.splice(indexInSelected, 1)
  } else if (indexInGlobal >= 0) {
    global.splice(indexInGlobal, 1)
  }

  return {
    global,
    selected,
  }
}

const getUUIDV4 = () => {
  if (!window.crypto) {
    throw new Error("Function $guid and $randomUUID is not supported in this version")
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  )
}

// Compiles shared scripting API methods for use in both pre and post request scripts
const getSharedMethods = (envs: TestResult["envs"]) => {
  let updatedEnvs = envs

  const envGetFn = (key: any) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    const result = pipe(
      getEnv(key, updatedEnvs),
      O.fold(
        () => undefined,
        (env) => String(env.value)
      )
    )

    return result
  }

  const envGetResolveFn = (key: any) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    const result = pipe(
      getEnv(key, updatedEnvs),
      E.fromOption(() => "INVALID_KEY" as const),

      E.map((e) =>
        pipe(
          parseTemplateStringE(e.value, [
            ...updatedEnvs.selected,
            ...updatedEnvs.global,
          ]), // If the recursive resolution failed, return the unresolved value
          E.getOrElse(() => e.value)
        )
      ),
      E.map((x) => String(x)),

      E.getOrElseW(() => undefined)
    )

    return result
  }

  const envSetFn = (key: any, value: any) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    updatedEnvs = setEnv(key, value, updatedEnvs)

    return undefined
  }

  const envUnsetFn = (key: any) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    updatedEnvs = unsetEnv(key, updatedEnvs)

    return undefined
  }

  const envResolveFn = (value: any) => {
    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    const result = pipe(
      parseTemplateStringE(value, [
        ...updatedEnvs.selected,
        ...updatedEnvs.global,
      ]),
      E.getOrElse(() => value)
    )

    return String(result)
  }

  const variablesReplaceInFn = (value: any) => {
    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    value = value.replace(/^{{\s*/g, "").replace(/\s*}}/g, "")

    const variables = {
      $guid: () => getUUIDV4(),
      $timestamp: () => Math.floor(Date.now() / 1000),
      $isoTimestamp: () => new Date().toISOString(),
      $randomUUID: () => getUUIDV4(),
    }

    return (variables as any)[value]()
  }

  return {
    methods: {
      env: {
        get: envGetFn,
        getResolve: envGetResolveFn,
        set: envSetFn,
        unset: envUnsetFn,
        resolve: envResolveFn,
      },
      variables: {
        replaceIn: variablesReplaceInFn,
      },
    },
    updatedEnvs,
  }
}

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

/**
 * Creates an Expectation object for use inside the sandbox
 * @param expectVal The expecting value of the expectation
 * @param negated Whether the expectation is negated (negative)
 * @param currTestStack The current state of the test execution stack
 * @returns Object with the expectation methods
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

  const toBeLevel2xxFn = () => toBeLevelXxx("200", 200, 299)
  const toBeLevel3xxFn = () => toBeLevelXxx("300", 300, 399)
  const toBeLevel4xxFn = () => toBeLevelXxx("400", 400, 499)
  const toBeLevel5xxFn = () => toBeLevelXxx("500", 500, 599)

  const toBeTypeFn = (expectedType: any) => {
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

  const toHaveLengthFn = (expectedLength: any) => {
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

  const toIncludeFn = (needle: any) => {
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
  result.toBeLevel2xx = toBeLevel2xxFn
  result.toBeLevel3xx = toBeLevel3xxFn
  result.toBeLevel4xx = toBeLevel4xxFn
  result.toBeLevel5xx = toBeLevel5xxFn
  result.toBeType = toBeTypeFn
  result.toHaveLength = toHaveLengthFn
  result.toInclude = toIncludeFn

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
 * @returns Object with methods in the `pw` namespace
 */
export const getPreRequestScriptMethods = (envs: TestResult["envs"]) => {
  const { methods, updatedEnvs } = getSharedMethods(cloneDeep(envs))
  return { pw: methods, updatedEnvs }
}

/**
 * Compiles methods for use under the `pw` namespace for post request scripts
 * @param envs The current state of the environment variables
 * @returns Object with methods in the `pw` namespace and test run stack
 */
export const getTestRunnerScriptMethods = (envs: TestResult["envs"]) => {
  const testRunStack: TestDescriptor[] = [
    { descriptor: "root", expectResults: [], children: [] },
  ]

  const testFn = (descriptor: string, testFunc: () => void) => {
    testRunStack.push({
      descriptor,
      expectResults: [],
      children: [],
    })

    testFunc()

    const child = testRunStack.pop() as TestDescriptor
    testRunStack[testRunStack.length - 1].children.push(child)
  }

  const expectFn = (expectVal: any) =>
    createExpectation(expectVal, false, testRunStack)

  const { methods, updatedEnvs } = getSharedMethods(cloneDeep(envs))

  const pw = {
    ...methods,
    expect: expectFn,
    test: testFn,
  }

  return { pw, testRunStack, updatedEnvs }
}
