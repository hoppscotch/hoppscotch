import * as chai from "chai"
import { TestDescriptor, SandboxValue } from "../types"

/**
 * Creates a Chai expectation that records results to the test stack
 * This integrates actual Chai.js with Hoppscotch's test reporting system
 *
 * Returns a serializable proxy object that can cross the sandbox boundary
 */
export function createChaiExpectation(
  value: SandboxValue,
  testStack: TestDescriptor[]
) {
  // Create the actual Chai assertion
  const assertion = chai.expect(value)

  // Create a serializable proxy that can cross the sandbox boundary
  return createSerializableProxy(assertion, value, testStack, {})
}

/**
 * Creates a serializable proxy object that mimics Chai's API
 * This can cross the sandbox boundary unlike the actual Chai assertion object
 */
function createSerializableProxy(
  assertion: any, // Chai assertion object - dynamic API, must be any
  originalValue: SandboxValue,
  testStack: TestDescriptor[],
  flags: SandboxValue
): any {
  // Returns dynamic proxy with Chai-like API
  const proxy: any = {} // Dynamic proxy object with Chai-like methods

  // Helper to create assertion methods
  const createMethod = (methodName: string) => {
    return (...args: SandboxValue[]) => {
      try {
        // Call the actual Chai method
        const result = assertion[methodName](...args)

        // Record success
        recordResult(
          testStack,
          true,
          buildMessage(assertion, methodName, args, originalValue, false)
        )

        // If result is a Chai assertion, return a new serializable proxy
        if (result && typeof result === "object" && result.__flags) {
          return createSerializableProxy(
            result,
            result._obj,
            testStack,
            result.__flags
          )
        }

        return result
      } catch (error: any) {
        // Record failure but DON'T throw - allow test to continue
        recordResult(testStack, false, extractErrorMessage(error))
        // Return a proxy to allow chaining even after failure
        return createSerializableProxy(
          assertion,
          originalValue,
          testStack,
          flags
        )
      }
    }
  }

  // Helper to create assertion getter properties (these perform assertions when accessed)
  const createAssertionGetter = (propName: string) => {
    return () => {
      try {
        // Access the property which triggers the assertion
        void assertion[propName]

        // Record success
        recordResult(
          testStack,
          true,
          buildMessage(assertion, propName, [], originalValue, false)
        )

        // Return undefined (assertion getters don't return values)
        return undefined
      } catch (error: any) {
        // Record failure but DON'T throw - allow test to continue
        recordResult(testStack, false, extractErrorMessage(error))
        // Return undefined to allow test to continue
        return undefined
      }
    }
  }

  // Helper to create language chain getters (these just return new assertions)
  const createChainGetter = (propName: string) => {
    return () => {
      // Access the property on the Chai assertion
      const value = assertion[propName]
      // Return a new serializable proxy
      if (value && typeof value === "object" && value.__flags) {
        return createSerializableProxy(
          value,
          value._obj || originalValue,
          testStack,
          value.__flags
        )
      }
      return value
    }
  }

  // Add all Chai assertion methods (functions)
  const methods = [
    "equal",
    "equals",
    "eq",
    "eql",
    "include",
    "includes",
    "contain",
    "contains",
    "a",
    "an",
    "instanceof",
    "instanceOf",
    "property",
    "ownProperty",
    "ownPropertyDescriptor",
    "lengthOf",
    "length",
    "match",
    "matches",
    "string",
    "keys",
    "key",
    "throw",
    "throws",
    "Throw",
    "respondTo",
    "respondsTo",
    "satisfy",
    "satisfies",
    "closeTo",
    "approximately",
    "members",
    "oneOf",
    "change",
    "changes",
    "increase",
    "increases",
    "decrease",
    "decreases",
    "by",
    "above",
    "gt",
    "greaterThan",
    "least",
    "gte",
    "below",
    "lt",
    "lessThan",
    "most",
    "lte",
    "within",
  ]

  // Add all methods to the proxy
  methods.forEach((method) => {
    proxy[method] = createMethod(method)
  })

  // Add assertion getters (these perform assertions when accessed)
  const assertionGetters = [
    "ok",
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "exist",
    "empty",
    "arguments",
    "Arguments",
    "finite",
    "extensible",
    "sealed",
    "frozen",
  ]

  assertionGetters.forEach((getter) => {
    Object.defineProperty(proxy, getter, {
      get: createAssertionGetter(getter),
      enumerable: false, // Don't enumerate to avoid serialization issues
      configurable: true,
    })
  })

  // Add language chains as getters (these just return new assertions)
  const chains = [
    "to",
    "be",
    "been",
    "is",
    "that",
    "which",
    "and",
    "has",
    "have",
    "with",
    "at",
    "of",
    "same",
    "but",
    "does",
    "not",
    "deep",
    "nested",
    "own",
    "ordered",
    "any",
    "all",
    "itself",
  ]

  chains.forEach((chain) => {
    Object.defineProperty(proxy, chain, {
      get: createChainGetter(chain),
      enumerable: false, // Don't enumerate to avoid serialization issues
      configurable: true,
    })
  })

  return proxy
}

/**
 * Records an assertion result to the test stack
 */
function recordResult(
  testStack: TestDescriptor[],
  passed: boolean,
  message: string
) {
  if (testStack.length === 0) return

  const currentTest = testStack[testStack.length - 1]
  currentTest.expectResults.push({
    status: passed ? "pass" : "fail",
    message,
  })
}

/**
 * Builds a message for an assertion
 * Tries to match the format expected by tests
 */
function buildMessage(
  assertion: any, // Chai assertion object - dynamic API, must be any
  method: string,
  args: SandboxValue[],
  value: SandboxValue,
  _failed: boolean
): string {
  const flags = assertion.__flags || {}
  const valueStr = formatValue(value)

  let message = `Expected ${valueStr}`

  // Add "to" or "to not"
  if (flags.negate) {
    message += " to not"
  } else {
    message += " to"
  }

  // Add modifiers
  if (flags.deep) message += " deep"
  if (flags.own) message += " own"
  if (flags.nested) message += " nested"

  // Add the method name
  message += ` ${method}`

  // Add arguments
  if (args.length > 0) {
    const argStrs = args.map(formatValue)
    message += ` ${argStrs.join(", ")}`
  }

  return message
}

/**
 * Extracts a clean error message from a Chai assertion error
 */
function extractErrorMessage(error: any): string {
  if (!error) return "Assertion failed"

  // Chai errors have a message property
  let message = error.message || String(error)

  // Remove stack traces and extra info
  const lines = message.split("\n")
  if (lines.length > 0) {
    message = lines[0]
  }

  // Clean up Chai's "expected X to Y" format
  // Chai uses lowercase "expected", we want "Expected"
  if (message.startsWith("expected ")) {
    message = "E" + message.substring(1)
  }

  return message
}

/**
 * Formats a value for display in messages
 */
function formatValue(val: SandboxValue): string {
  if (val === null) return "null"
  if (val === undefined) return "undefined"
  if (typeof val === "string") return `'${val}'`
  if (typeof val === "number") {
    if (isNaN(val)) return "NaN"
    if (val === Infinity) return "Infinity"
    if (val === -Infinity) return "-Infinity"
    return String(val)
  }
  if (typeof val === "boolean") return String(val)
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]"
    const items = val.slice(0, 10).map(formatValue)
    return `[${items.join(", ")}]`
  }
  if (typeof val === "object") {
    try {
      const keys = Object.keys(val)
      if (keys.length === 0) return "{}"
      const pairs = keys.slice(0, 5).map((k) => `${k}: ${formatValue(val[k])}`)
      return `{${pairs.join(", ")}}`
    } catch {
      return "[object Object]"
    }
  }
  if (typeof val === "function") {
    return val.name || "[Function]"
  }
  return String(val)
}
