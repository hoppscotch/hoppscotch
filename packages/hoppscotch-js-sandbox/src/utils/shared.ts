import {
  Cookie,
  CookieSchema,
  HoppRESTRequest,
  parseTemplateStringE,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/lib/function"
import { cloneDeep } from "lodash-es"

import {
  Expectation,
  TestDescriptor,
  TestResult,
  SandboxValue,
  SandboxEnvironmentVariable,
  SandboxEnvs,
} from "../types"
import { UNDEFINED_MARKER, NULL_MARKER } from "~/constants/sandbox-markers"

export type EnvSource = "active" | "global" | "all"
export type EnvAPIOptions = {
  fallbackToNull?: boolean
  source: EnvSource
}

const getEnv = (
  envName: string,
  envs: SandboxEnvs,
  options = { source: "all" }
) => {
  if (options.source === "active") {
    return O.fromNullable(
      envs.selected.find((x: SandboxEnvironmentVariable) => x.key === envName)
    )
  }

  if (options.source === "global") {
    return O.fromNullable(
      envs.global.find((x: SandboxEnvironmentVariable) => x.key === envName)
    )
  }

  return O.fromNullable(
    envs.selected.find((x: SandboxEnvironmentVariable) => x.key === envName) ??
      envs.global.find((x: SandboxEnvironmentVariable) => x.key === envName)
  )
}

const findEnvIndex = (
  envName: string,
  envList: SandboxEnvironmentVariable[]
): number => {
  return envList.findIndex(
    (envItem: SandboxEnvironmentVariable) => envItem.key === envName
  )
}

const setEnv = (
  envName: string,
  envValue: SandboxValue,
  envs: SandboxEnvs,
  options: { setInitialValue?: boolean; source: EnvSource } = {
    setInitialValue: false,
    source: "all",
  }
): SandboxEnvs => {
  const { global, selected } = envs

  const indexInSelected = findEnvIndex(envName, selected)
  const indexInGlobal = findEnvIndex(envName, global)

  if (["all", "active"].includes(options.source) && indexInSelected >= 0) {
    const selectedEnv = selected[indexInSelected]
    const targetProperty = options.setInitialValue
      ? "initialValue"
      : "currentValue"

    selectedEnv[targetProperty] = envValue
  } else if (["all", "global"].includes(options.source) && indexInGlobal >= 0) {
    const globalEnv = global[indexInGlobal]
    const targetProperty = options.setInitialValue
      ? "initialValue"
      : "currentValue"

    globalEnv[targetProperty] = envValue
  } else if (["all", "active"].includes(options.source)) {
    selected.push({
      key: envName,
      currentValue: envValue,
      initialValue: envValue,
      secret: false,
    })
  } else if (["all", "global"].includes(options.source)) {
    global.push({
      key: envName,
      currentValue: envValue,
      initialValue: envValue,
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
  envs: SandboxEnvs,
  options = { source: "all" }
): SandboxEnvs => {
  const { global, selected } = envs

  const indexInSelected = findEnvIndex(envName, selected)
  const indexInGlobal = findEnvIndex(envName, global)

  if (["all", "active"].includes(options.source) && indexInSelected >= 0) {
    selected.splice(indexInSelected, 1)
  } else if (["all", "global"].includes(options.source) && indexInGlobal >= 0) {
    global.splice(indexInGlobal, 1)
  }

  return {
    global,
    selected,
  }
}

/**
 * Compiles shared scripting API methods (scoped to environments) for use in both pre and post request scripts
 * Experimental sandbox version - Returns methods organized by namespace (`pw` and `hopp`)
 */
export function getSharedEnvMethods(
  envs: TestResult["envs"],
  isHoppNamespace: true
): {
  methods: {
    pw: {
      get: (key: string, options?: EnvAPIOptions) => string | null | undefined
      getResolve: (
        key: string,
        options?: EnvAPIOptions
      ) => string | null | undefined
      set: (key: string, value: string, options?: EnvAPIOptions) => void
      unset: (key: string, options?: EnvAPIOptions) => void
      resolve: (key: string) => string
    }
    hopp: {
      set: (key: string, value: string, options?: EnvAPIOptions) => void
      delete: (key: string, options?: EnvAPIOptions) => void
      reset: (key: string, options?: EnvAPIOptions) => void
      getInitialRaw: (key: string, options?: EnvAPIOptions) => string | null
      setInitial: (key: string, value: string, options?: EnvAPIOptions) => void
    }
  }
  pmSetAny: (key: string, value: SandboxValue, options?: EnvAPIOptions) => void
  updatedEnvs: SandboxEnvs
}

/**
 * Legacy sandbox version - Methods pre-wrapped in `env` for direct `pw` namespace assignment
 * (Experimental sandbox powered by `faraday-cage` handles this wrapping via bootstrap code)
 */
export function getSharedEnvMethods(
  envs: TestResult["envs"],
  isHoppNamespace?: false
): {
  methods: {
    env: {
      get: (key: string, options?: EnvAPIOptions) => string | null | undefined
      getResolve: (
        key: string,
        options?: EnvAPIOptions
      ) => string | null | undefined
      set: (key: string, value: string, options?: EnvAPIOptions) => void
      unset: (key: string, options?: EnvAPIOptions) => void
      resolve: (key: string) => string
    }
  }
  updatedEnvs: SandboxEnvs
}

export function getSharedEnvMethods(
  envs: TestResult["envs"],
  isHoppNamespace = false
): unknown {
  /**
   * Type assertion explanation:
   *
   * The `envs` parameter is typed as `TestResult["envs"]` (with string values) for external API
   * compatibility, but at runtime it contains `SandboxValue` types during script execution.
   *
   * Data flow:
   * 1. Entry: External caller passes envs with string values
   *    { global: [{ key: "count", currentValue: "5", initialValue: "0" }], selected: [] }
   *
   * 2. Execution: Scripts mutate with complex types (PM namespace compatibility)
   *    pm.environment.set("users", [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])
   *    pm.environment.set("config", { debug: true, maxRetries: 3 })
   *    // Now: currentValue is an array/object, not a string!
   *
   * 3. Exit: getUpdatedEnvs() serializes back to strings via JSON.stringify()
   *    { global: [{ key: "users", currentValue: "[{...}]", initialValue: "[]" }], ... }
   *
   * The `satisfies` check acknowledges that during execution (steps 1-3), the runtime type is
   * SandboxEnvs, even though the declared type is TestResult["envs"] for API boundary compatibility.
   */
  let updatedEnvs = envs satisfies SandboxEnvs

  const envGetFn = (
    key: unknown,
    options: EnvAPIOptions = { fallbackToNull: false, source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    const result = pipe(
      getEnv(key, updatedEnvs, options),
      O.fold(
        () => (options.fallbackToNull ? null : undefined),
        (env) => {
          // Get the value to use (currentValue or fallback to initialValue)
          // Treat undefined, empty string, and null as "empty" and fallback to initialValue
          const valueToUse =
            env.currentValue !== undefined &&
            env.currentValue !== "" &&
            env.currentValue !== null
              ? env.currentValue
              : env.initialValue

          // Convert markers back to their actual types for script execution
          // This ensures null/undefined values are properly represented in scripts
          if (valueToUse === UNDEFINED_MARKER) {
            return undefined
          }
          if (valueToUse === NULL_MARKER) {
            return null
          }

          // Preserve complex types (arrays, objects) for PM namespace compatibility
          return valueToUse
        }
      )
    )

    return result
  }

  const envGetResolveFn = (
    key: unknown,
    options: EnvAPIOptions = { fallbackToNull: false, source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    const shouldIncludeSelected = ["all", "active"].includes(options.source)
    const shouldIncludeGlobal = ["all", "global"].includes(options.source)

    const envVars = [
      ...(shouldIncludeSelected ? updatedEnvs.selected : []),
      ...(shouldIncludeGlobal ? updatedEnvs.global : []),
    ]

    const result = pipe(
      getEnv(key, updatedEnvs, options),
      E.fromOption(() => "INVALID_KEY" as const),

      E.map((e) => {
        // Get the value to use (currentValue or fallback to initialValue)
        // Treat undefined, empty string, and null as "empty" and fallback to initialValue
        const valueToUse =
          e.currentValue !== undefined &&
          e.currentValue !== "" &&
          e.currentValue !== null
            ? e.currentValue
            : e.initialValue

        // Convert markers back to their actual types
        if (valueToUse === UNDEFINED_MARKER) {
          return undefined
        }
        if (valueToUse === NULL_MARKER) {
          return null
        }

        // Only resolve templates for string values
        // Non-string values (arrays, objects, etc.) are returned as-is for PM namespace compatibility
        if (typeof valueToUse !== "string") {
          return valueToUse
        }

        // For string values, resolve templates
        return pipe(
          parseTemplateStringE(valueToUse, envVars),
          // If the recursive resolution failed, return the unresolved value
          E.getOrElse(() => valueToUse)
        )
      }),

      E.getOrElseW(() => (options.fallbackToNull ? null : undefined))
    )

    return result
  }

  const envSetFn = (
    key: unknown,
    value: unknown,
    options: EnvAPIOptions = { source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    updatedEnvs = setEnv(key, value, updatedEnvs, options)

    return undefined
  }

  // PM namespace-specific setter that accepts any type (for Postman compatibility)
  const envSetAnyFn = (
    key: unknown,
    value: SandboxValue, // Intentionally SandboxValue for PM namespace type preservation
    options: EnvAPIOptions = { source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    // PM namespace preserves ALL types (arrays, objects, primitives, null, undefined)
    updatedEnvs = setEnv(key, value, updatedEnvs, options)

    return undefined
  }

  const envUnsetFn = (
    key: unknown,
    options: EnvAPIOptions = { source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    updatedEnvs = unsetEnv(key, updatedEnvs, options)

    return undefined
  }

  const envResolveFn = (value: unknown) => {
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

  // Methods exclusive to the `hopp` namespace
  const envResetFn = (
    key: string,
    options: EnvAPIOptions = { source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    // Always read from the live, mutated state. `updatedEnvs` is reassigned by setters,
    // while `envs` may point to an older object (stale snapshot) even if arrays were mutated.
    // Using `updatedEnvs` here avoids subtle drift if future changes replace arrays immutably.
    const { global, selected } = updatedEnvs

    const indexInSelected = findEnvIndex(key, selected)
    const indexInGlobal = findEnvIndex(key, global)

    if (["all", "active"].includes(options.source) && indexInSelected >= 0) {
      const selectedEnv = selected[indexInSelected]

      if ("currentValue" in selectedEnv) {
        selectedEnv.currentValue = selectedEnv.initialValue
      }
    } else if (
      ["all", "global"].includes(options.source) &&
      indexInGlobal >= 0
    ) {
      if ("currentValue" in global[indexInGlobal]) {
        global[indexInGlobal].currentValue = global[indexInGlobal].initialValue
      }
    }
  }

  const envGetInitialRawFn = (
    key: unknown,
    options: EnvAPIOptions = { source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    const result = pipe(
      getEnv(key, updatedEnvs, options),
      O.fold(
        () => undefined,
        (env) => {
          const initialValue = env.initialValue

          // Convert markers back to their actual types
          if (initialValue === UNDEFINED_MARKER) {
            return undefined
          }
          if (initialValue === NULL_MARKER) {
            return null
          }

          return initialValue // Return as-is (PM namespace preserves types)
        }
      )
    )

    return result ?? null
  }

  const envSetInitialFn = (
    key: string,
    value: string,
    options: EnvAPIOptions = { source: "all" }
  ) => {
    if (typeof key !== "string") {
      throw new Error("Expected key to be a string")
    }

    if (typeof value !== "string") {
      throw new Error("Expected value to be a string")
    }

    updatedEnvs = setEnv(key, value, updatedEnvs, {
      setInitialValue: true,
      source: options.source,
    })

    return undefined
  }

  // Experimental scripting sandbox (Both `pw` and `hopp` namespaces)
  if (isHoppNamespace) {
    return {
      methods: {
        pw: {
          get: envGetFn,
          getResolve: envGetResolveFn,
          set: envSetFn,
          unset: envUnsetFn,
          resolve: envResolveFn,
        },
        hopp: {
          set: envSetFn,
          delete: envUnsetFn,
          reset: envResetFn,
          getInitialRaw: envGetInitialRawFn,
          setInitial: envSetInitialFn,
        },
      },
      // Expose PM-specific setter that accepts any type
      pmSetAny: envSetAnyFn,
      updatedEnvs,
    }
  }

  // Legacy scripting sandbox (Only `pw` namespace)
  return {
    methods: {
      env: {
        get: envGetFn,
        getResolve: envGetResolveFn,
        set: envSetFn,
        unset: envUnsetFn,
        resolve: envResolveFn,
      },
    },
    updatedEnvs,
  }
}

export const getSharedCookieMethods = (cookies: Cookie[] | null) => {
  // Incoming `cookies` specified as `null` indicates unsupported platform
  const cookiesSupported = cookies !== null
  let updatedCookies: Cookie[] = cookies ?? []

  const throwIfCookiesUnsupported = () => {
    if (cookies === null) {
      throw new Error(
        "Cookies are not supported in the current platform and are exclusive to the Desktop App."
      )
    }
  }

  const cookieGetFn = (domain: unknown, name: unknown): Cookie | null => {
    throwIfCookiesUnsupported()

    if (typeof domain !== "string" || typeof name !== "string") {
      throw new Error("Expected domain and cookieName to be strings")
    }

    return (
      updatedCookies.find((c) => c.domain === domain && c.name === name) ?? null
    )
  }

  const cookieSetFn = (domain: string, cookie: Cookie): void => {
    throwIfCookiesUnsupported()

    if (typeof domain !== "string") {
      throw new Error("Expected domain to be a string")
    }

    const result = CookieSchema.safeParse(cookie)

    if (!result.success) {
      throw new Error("Invalid cookie")
    }

    updatedCookies = updatedCookies.filter(
      (c) => !(c.domain === domain && c.name === cookie.name)
    )
    updatedCookies.push(cookie)
  }

  const cookieHasFn = (domain: string, name: string): boolean => {
    throwIfCookiesUnsupported()

    if (typeof domain !== "string" || typeof name !== "string") {
      throw new Error("Expected domain and cookieName to be strings")
    }
    return updatedCookies.some((c) => c.domain === domain && c.name === name)
  }

  const cookieGetAllFn = (domain: string): Cookie[] => {
    throwIfCookiesUnsupported()

    if (typeof domain !== "string") {
      throw new Error("Expected domain to be a string")
    }
    return updatedCookies.filter((c) => c.domain === domain)
  }

  const cookieDeleteFn = (domain: string, name: string): void => {
    throwIfCookiesUnsupported()

    if (typeof domain !== "string" || typeof name !== "string") {
      throw new Error("Expected domain and cookieName to be strings")
    }
    updatedCookies = updatedCookies.filter(
      (c) => !(c.domain === domain && c.name === name)
    )
  }

  const cookieClearFn = (domain: string): void => {
    throwIfCookiesUnsupported()

    if (typeof domain !== "string") {
      throw new Error("Expected domain to be a string")
    }
    updatedCookies = updatedCookies.filter((c) => c.domain !== domain)
  }

  return {
    methods: {
      get: cookieGetFn,
      set: cookieSetFn,
      has: cookieHasFn,
      getAll: cookieGetAllFn,
      delete: cookieDeleteFn,
      clear: cookieClearFn,
    },
    // Use a function so we always read the latest `updatedCookies` (not a stale snapshot)
    getUpdatedCookies: () =>
      cookiesSupported ? cloneDeep(updatedCookies) : null,
  }
}

const getResolvedExpectValue = (expectVal: SandboxValue) => {
  if (typeof expectVal !== "string") {
    return expectVal
  }

  try {
    const parsedExpectVal = JSON.parse(expectVal)

    // Supplying non-primitive values is not permitted in the `isStringifiedWithinIsolate` property indicates that the object was stringified before executing the script from the isolate context
    // This is done to ensure a JSON string supplied as the "expectVal" is not parsed and preserved as is
    if (typeof parsedExpectVal === "object") {
      if (parsedExpectVal.isStringifiedWithinIsolate !== true) {
        return expectVal
      }

      // For an array, the contents are stored in the `arr` property
      if (Array.isArray(parsedExpectVal.arr)) {
        return parsedExpectVal.arr
      }

      delete parsedExpectVal.isStringifiedWithinIsolate
      return parsedExpectVal
    }

    return expectVal
  } catch (_) {
    return expectVal
  }
}

export function preventCyclicObjects<T extends object = Record<string, any>>(
  obj: T
): E.Left<string> | E.Right<T> {
  let jsonString

  try {
    jsonString = JSON.stringify(obj)
  } catch (_) {
    return E.left("Stringification failed")
  }

  try {
    const parsedJson = JSON.parse(jsonString)
    return E.right(parsedJson)
  } catch (_) {
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
  expectVal: SandboxValue,
  negated: boolean,
  currTestStack: TestDescriptor[],
  getCurrentTestContext?: () => TestDescriptor | null
): Expectation => {
  // Non-primitive values supplied are stringified in the isolate context
  const resolvedExpectVal = getResolvedExpectValue(expectVal)

  // Helper to get current test descriptor (prefers context over stack)
  const getCurrentTest = (): TestDescriptor | null => {
    // Prefer explicit test context, but fallback to stack for top-level expectations
    return (
      getCurrentTestContext?.() ||
      (currTestStack.length > 0
        ? currTestStack[currTestStack.length - 1]
        : null)
    )
  }

  const toBeFn = (expectedVal: SandboxValue) => {
    let assertion = resolvedExpectVal === expectedVal

    if (negated) {
      assertion = !assertion
    }

    const status = assertion ? "pass" : "fail"
    const message = `Expected '${resolvedExpectVal}' to${
      negated ? " not" : ""
    } be '${expectedVal}'`

    const targetTest = getCurrentTest()
    if (!targetTest) return undefined

    targetTest.expectResults.push({
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
    const parsedExpectVal = parseInt(resolvedExpectVal)

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

      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status,
        message,
      })
    } else {
      const message = `Expected ${level}-level status but could not parse value '${resolvedExpectVal}'`
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
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

  const toBeTypeFn = (expectedType: SandboxValue) => {
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
      let assertion = typeof resolvedExpectVal === expectedType

      if (negated) {
        assertion = !assertion
      }

      const status = assertion ? "pass" : "fail"
      const message = `Expected '${resolvedExpectVal}' to${
        negated ? " not" : ""
      } be type '${expectedType}'`

      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status,
        message,
      })
    } else {
      const message =
        'Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"'
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status: "error",
        message,
      })
    }

    return undefined
  }

  const toHaveLengthFn = (expectedLength: SandboxValue) => {
    if (
      !(
        Array.isArray(resolvedExpectVal) ||
        typeof resolvedExpectVal === "string"
      )
    ) {
      const message =
        "Expected toHaveLength to be called for an array or string"
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status: "error",
        message,
      })

      return undefined
    }

    if (typeof expectedLength === "number" && !Number.isNaN(expectedLength)) {
      let assertion = resolvedExpectVal.length === expectedLength

      if (negated) {
        assertion = !assertion
      }

      const status = assertion ? "pass" : "fail"
      const message = `Expected the array to${
        negated ? " not" : ""
      } be of length '${expectedLength}'`

      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status,
        message,
      })
    } else {
      const message = "Argument for toHaveLength should be a number"
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status: "error",
        message,
      })
    }

    return undefined
  }

  const toIncludeFn = (needle: SandboxValue) => {
    if (
      !(
        Array.isArray(resolvedExpectVal) ||
        typeof resolvedExpectVal === "string"
      )
    ) {
      const message = "Expected toInclude to be called for an array or string"
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status: "error",
        message,
      })
      return undefined
    }

    if (needle === null) {
      const message = "Argument for toInclude should not be null"
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status: "error",
        message,
      })
      return undefined
    }

    if (needle === undefined) {
      const message = "Argument for toInclude should not be undefined"
      const targetTest = getCurrentTest()
      if (!targetTest) return undefined
      targetTest.expectResults.push({
        status: "error",
        message,
      })
      return undefined
    }

    let assertion = resolvedExpectVal.includes(needle)

    if (negated) {
      assertion = !assertion
    }

    const expectValPretty = JSON.stringify(resolvedExpectVal)
    const needlePretty = JSON.stringify(needle)
    const status = assertion ? "pass" : "fail"
    const message = `Expected ${expectValPretty} to${
      negated ? " not" : ""
    } include ${needlePretty}`

    const targetTest = getCurrentTest()
    if (!targetTest) return undefined
    targetTest.expectResults.push({
      status,
      message,
    })
    return undefined
  }

  const result = {
    toBe: toBeFn,
    toBeLevel2xx: toBeLevel2xxFn,
    toBeLevel3xx: toBeLevel3xxFn,
    toBeLevel4xx: toBeLevel4xxFn,
    toBeLevel5xx: toBeLevel5xxFn,
    toBeType: toBeTypeFn,
    toHaveLength: toHaveLengthFn,
    toInclude: toIncludeFn,
  } as Expectation

  Object.defineProperties(result, {
    not: {
      get: () =>
        createExpectation(
          expectVal,
          !negated,
          currTestStack,
          getCurrentTestContext
        ),
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
  const { methods, updatedEnvs } = getSharedEnvMethods(cloneDeep(envs))
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

  const expectFn = (expectVal: unknown) =>
    createExpectation(expectVal, false, testRunStack)

  const { methods, updatedEnvs } = getSharedEnvMethods(cloneDeep(envs))

  const pw = {
    ...methods,
    expect: expectFn,
    test: testFn,
  }

  return { pw, testRunStack, updatedEnvs }
}

/**
 * Compiles shared scripting API properties (scoped to requests) for use in both pre and post request scripts
 * Extracts shared properties from a request object
 * @param request The request object to extract shared properties from
 * @param getUpdatedRequest Optional function to get the updated request (for pre-request mutations)
 * @returns An object containing the shared properties of the request
 */
export const getSharedRequestProps = (
  request: HoppRESTRequest,
  getUpdatedRequest?: () => HoppRESTRequest
) => {
  return {
    get url() {
      // For pre-request scripts, read from updated request to see mutations
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.endpoint
    },
    get method() {
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.method
    },
    get params() {
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.params
    },
    get headers() {
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.headers
    },
    get body() {
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.body
    },
    get auth() {
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.auth
    },
    get requestVariables() {
      const currentRequest = getUpdatedRequest ? getUpdatedRequest() : request
      return currentRequest.requestVariables
    },
  }
}
