import { TestDescriptor } from "../types"
import { ChaiExpectation } from "./chai-expectation"

/**
 * Creates a serializable proxy for Chai expectations that works with faraday-cage
 * This approach creates plain objects with methods rather than using getters/setters
 * which can't be serialized across the sandbox boundary
 */
export function createSerializableChaiExpectation(
  expectVal: any,
  currTestStack: TestDescriptor[]
) {
  const createChainProxy = (flags: any = {}) => {
    // Create a fresh ChaiExpectation instance for each call
    const chai = new ChaiExpectation(expectVal, currTestStack)
    // Apply flags
    Object.assign((chai as any)._flags, flags)

    const executeAssertion = (methodName: string, ...args: any[]) => {
      const instance = new ChaiExpectation(expectVal, currTestStack)
      Object.assign((instance as any)._flags, flags)
      return (instance as any)[methodName](...args)
    }

    const executePropertyAssertion = (propertyName: string) => {
      const instance = new ChaiExpectation(expectVal, currTestStack)
      Object.assign((instance as any)._flags, flags)
      // Access the getter property
      return (instance as any)[propertyName]
    }

    return {
      // Language chains - return new proxy with same flags
      to: () => createChainProxy(flags),
      be: () => createChainProxy(flags),
      been: () => createChainProxy(flags),
      is: () => createChainProxy(flags),
      that: () => createChainProxy(flags),
      which: () => createChainProxy(flags),
      and: () => createChainProxy(flags),
      has: () => createChainProxy(flags),
      have: () => createChainProxy(flags),
      with: () => createChainProxy(flags),
      at: () => createChainProxy(flags),
      of: () => createChainProxy(flags),
      same: () => createChainProxy(flags),
      but: () => createChainProxy(flags),
      does: () => createChainProxy(flags),

      // Modifiers - return new proxy with updated flags
      get not() {
        return createChainProxy({ ...flags, not: !flags.not })
      },
      get deep() {
        return createChainProxy({ ...flags, deep: true })
      },
      get nested() {
        return createChainProxy({ ...flags, nested: true })
      },
      get own() {
        return createChainProxy({ ...flags, own: true })
      },
      get ordered() {
        return createChainProxy({ ...flags, ordered: true })
      },
      get any() {
        return createChainProxy({ ...flags, any: true })
      },
      get all() {
        return createChainProxy({ ...flags, all: true })
      },
      get include() {
        return createChainProxy({ ...flags, include: true })
      },
      get itself() {
        return createChainProxy(flags)
      },

      // Assertion methods
      equal: (value: any) => executeAssertion("equal", value),
      equals: (value: any) => executeAssertion("equals", value),
      eql: (value: any) => executeAssertion("eql", value),

      // Type assertions with chaining support
      a: (type: any) => {
        executeAssertion("a", type)
        return createChainProxy(flags)
      },
      an: (type: any) => {
        executeAssertion("an", type)
        return createChainProxy(flags)
      },

      // Truthiness properties as getters
      get true() {
        return executePropertyAssertion("true")
      },
      get false() {
        return executePropertyAssertion("false")
      },
      get null() {
        return executePropertyAssertion("null")
      },
      get undefined() {
        return executePropertyAssertion("undefined")
      },
      get NaN() {
        return executePropertyAssertion("NaN")
      },
      get exist() {
        return executePropertyAssertion("exist")
      },
      get empty() {
        return executePropertyAssertion("empty")
      },
      get ok() {
        return executePropertyAssertion("ok")
      },

      // Numerical comparisons
      above: (value: number) => executeAssertion("above", value),
      below: (value: number) => executeAssertion("below", value),
      least: (value: number) => executeAssertion("least", value),
      most: (value: number) => executeAssertion("most", value),
      within: (start: number, finish: number) =>
        executeAssertion("within", start, finish),
      approximately: (value: number, delta: number) =>
        executeAssertion("approximately", value, delta),
      closeTo: (value: number, delta: number) =>
        executeAssertion("closeTo", value, delta),
      get finite() {
        return executePropertyAssertion("finite")
      },

      // Object/Array methods
      contain: (needle: any) => executeAssertion("contain", needle),
      // include is already defined above as a modifier flag, using contain for method
      length: (value: number) => executeAssertion("length", value),
      lengthOf: (value: number) => executeAssertion("lengthOf", value),
      property: (name: string, value?: any) =>
        executeAssertion("property", name, value),
      ownProperty: (name: string, value?: any) =>
        executeAssertion("ownProperty", name, value),

      // String matching
      match: (regex: RegExp) => executeAssertion("match", regex),
      string: (value: string) => executeAssertion("string", value),

      // Key assertions
      keys: (...keys: any[]) => executeAssertion("keys", ...keys),
      key: (key: any) => executeAssertion("key", key),

      // Instance/Type assertions
      instanceof: (constructor: (...args: any[]) => any) =>
        executeAssertion("instanceof", constructor),

      // Function assertions
      throw: (errorLike?: any, errMsgMatcher?: string | RegExp) =>
        executeAssertion("throw", errorLike, errMsgMatcher),
      throws: (errorLike?: any, errMsgMatcher?: string | RegExp) =>
        executeAssertion("throws", errorLike, errMsgMatcher),
      respondTo: (method: string) => executeAssertion("respondTo", method),

      // Custom assertions
      satisfy: (matcher: (value: any) => boolean) =>
        executeAssertion("satisfy", matcher),
      members: (list: any[]) => executeAssertion("members", list),
      oneOf: (list: any[]) => executeAssertion("oneOf", list),

      // Object state
      get extensible() {
        return executePropertyAssertion("extensible")
      },
      get sealed() {
        return executePropertyAssertion("sealed")
      },
      get frozen() {
        return executePropertyAssertion("frozen")
      },
    }
  }

  return createChainProxy()
}
