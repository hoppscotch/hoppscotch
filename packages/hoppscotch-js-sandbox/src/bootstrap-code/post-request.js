/* eslint-disable @typescript-eslint/no-unused-expressions */
;(inputs) => {
  // Keep strict mode scoped to this IIFE to avoid leaking strictness to concatenated/bootstrapped code
  "use strict"

  // Chai-style expectation proxy for experimental sandbox
  if (!globalThis.__createChaiProxy) {
    globalThis.__createChaiProxy = function (expectVal, inputs, initialFlags) {
      // Create fresh state for each expectation to avoid value pollution
      const createFreshState = (value, flags = {}) => ({
        value: value,
        flags: {
          not: false,
          deep: false,
          nested: false,
          own: false,
          ordered: false,
          any: false,
          all: false,
          include: false,
          itself: false,
          ...flags,
        },
      })

      const state = createFreshState(expectVal, initialFlags)

      // Helper function to format values for messages
      const _formatValue = (val) => {
        if (val === null) return "null"
        if (val === undefined) return "undefined"
        if (typeof val === "string") return `'${val}'`
        if (typeof val === "number" && isNaN(val)) return "NaN"
        if (Array.isArray(val)) return `[${val.map(formatValue).join(", ")}]`
        if (typeof val === "object") {
          // Check for special object states
          if (Object.isFrozen(val) && Object.keys(val).length === 0) {
            return "Object.freeze({})"
          }
          if (Object.isSealed(val) && Object.keys(val).length === 0) {
            return "Object.seal({})"
          }
          // Format objects like {a: 1} instead of {"a":1}
          const entries = Object.entries(val)
          const formatted = entries
            .map(([key, value]) => `${key}: ${formatValue(value)}`)
            .join(", ")
          return `{${formatted}}`
        }
        if (typeof val === "function") return `'${val.toString()}'`
        return String(val)
      }

      // Helper function to execute chained type + equals assertion
      const handleChainedTypeEquals = (pendingAssertion, expectedValue) => {
        const { article, type, flags } = pendingAssertion

        // Call the enhanced expectation method which has proper access to testRunStack
        inputs.expectChainedTypeEquals &&
          inputs.expectChainedTypeEquals(
            state.value,
            article,
            type,
            expectedValue,
            flags
          )

        return proxy
      }

      // Helper function to execute chained type + lengthOf assertion
      const handleChainedTypeLengthOf = (pendingAssertion, expectedLength) => {
        const { article, type, flags } = pendingAssertion

        // Call the enhanced expectation method which has proper access to testRunStack
        inputs.expectChainedTypeLengthOf &&
          inputs.expectChainedTypeLengthOf(
            state.value,
            article,
            type,
            expectedLength,
            flags
          )

        return proxy
      }

      // Create proxy object first without self-references
      const proxy = {
        // Language chains - will be defined after object creation

        // Modifiers - will be defined after object creation

        // Type assertion function that also acts as a chain
        a: function (type) {
          if (type !== undefined) {
            // Execute the type assertion immediately (for standalone usage)
            inputs.expectToBeA &&
              inputs.expectToBeA(state.value, type, state.flags)

            // Store for potential chaining
            state._pendingTypeAssertion = {
              article: "a",
              type: type,
              flags: { ...state.flags },
            }

            // Return a simple chaining object that only has the specific chain methods needed
            return {
              that: {
                equals: function (value) {
                  return handleChainedTypeEquals(
                    state._pendingTypeAssertion,
                    value
                  )
                },
              },
            }
          }
          return proxy
        },
        an: function (type) {
          if (type !== undefined) {
            // Execute the type assertion immediately (for standalone usage)
            inputs.expectToBeA &&
              inputs.expectToBeA(state.value, type, state.flags)

            // Store for potential chaining
            state._pendingTypeAssertion = {
              article: "an",
              type: type,
              flags: { ...state.flags },
            }

            // Return a simple chaining object that only has the specific chain methods needed
            return {
              that: {
                has: {
                  lengthOf: function (length) {
                    return handleChainedTypeLengthOf(
                      state._pendingTypeAssertion,
                      length
                    )
                  },
                },
              },
              instanceof: function (constructor) {
                return proxy.instanceof(constructor)
              },
            }
          }
          return proxy
        },

        // Truthiness getters
        get true() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "true", state.flags)
          return undefined
        },
        get false() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "false", state.flags)
          return undefined
        },
        get null() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "null", state.flags)
          return undefined
        },
        get undefined() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "undefined", state.flags)
          return undefined
        },
        get NaN() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "NaN", state.flags)
          return undefined
        },
        get exist() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "exist", state.flags)
          return undefined
        },
        get empty() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "empty", state.flags)
          return undefined
        },
        get ok() {
          inputs.expectToBeTruthy &&
            inputs.expectToBeTruthy(state.value, "ok", state.flags)
          return undefined
        },
        get finite() {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "finite",
              0,
              undefined,
              state.flags
            )
          return undefined
        },
        get extensible() {
          // Check the state before serialization and pass it along
          const isExtensible =
            typeof state.value === "object" && state.value !== null
              ? Object.isExtensible(state.value)
              : false
          inputs.expectObjectState &&
            inputs.expectObjectState(
              state.value,
              "extensible",
              state.flags,
              isExtensible
            )
          return undefined
        },
        get sealed() {
          // Check the state before serialization and pass it along
          // Also check frozen state since frozen objects are also sealed
          const isSealed =
            typeof state.value === "object" && state.value !== null
              ? Object.isSealed(state.value)
              : typeof state.value !== "object" // primitives are considered sealed
          const isFrozen =
            typeof state.value === "object" && state.value !== null
              ? Object.isFrozen(state.value)
              : typeof state.value !== "object"
          inputs.expectObjectState &&
            inputs.expectObjectState(
              state.value,
              "sealed",
              state.flags,
              isSealed,
              isFrozen
            )
          return undefined
        },
        get frozen() {
          // Check the state before serialization and pass it along
          const isFrozen =
            typeof state.value === "object" && state.value !== null
              ? Object.isFrozen(state.value)
              : typeof state.value !== "object" // primitives are considered frozen
          inputs.expectObjectState &&
            inputs.expectObjectState(
              state.value,
              "frozen",
              state.flags,
              isFrozen
            )
          return undefined
        },

        // Assertion methods
        equal: function (value) {
          // Pass context information for proper message formatting
          const flags = { ...state.flags, _lastChain: state._lastChain }
          inputs.expectEqual && inputs.expectEqual(state.value, value, flags)
        },
        equals: function (value) {
          this.equal(value)
        },
        toBe: function (value) {
          // toBe is an alias for equal in Chai, but with simpler messaging for PM compatibility
          inputs.expectToBe && inputs.expectToBe(state.value, value)
        },
        toInclude: function (needle) {
          // toInclude method for PM compatibility
          inputs.expectToInclude && inputs.expectToInclude(state.value, needle)
        },
        eql: function (value) {
          inputs.expectEql && inputs.expectEql(state.value, value, state.flags)
        },

        above: function (value) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "above",
              value,
              undefined,
              state.flags
            )
        },
        below: function (value) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "below",
              value,
              undefined,
              state.flags
            )
        },
        least: function (value) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "least",
              value,
              undefined,
              state.flags
            )
        },
        most: function (value) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "most",
              value,
              undefined,
              state.flags
            )
        },
        within: function (start, finish) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "within",
              start,
              finish,
              state.flags
            )
        },
        approximately: function (value, delta) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "approximately",
              value,
              delta,
              state.flags
            )
        },
        closeTo: function (value, delta) {
          inputs.expectNumerical &&
            inputs.expectNumerical(
              state.value,
              "closeTo",
              value,
              delta,
              state.flags
            )
        },

        // Note: contain and include are defined as getters below using Object.defineProperty
        // to support both method calls and chaining

        length: function (value) {
          inputs.expectLength &&
            inputs.expectLength(state.value, value, state.flags)
        },
        lengthOf: function (value) {
          inputs.expectLengthOf &&
            inputs.expectLengthOf(state.value, value, state.flags)
        },

        property: function (name, value) {
          inputs.expectProperty &&
            inputs.expectProperty(state.value, name, value, state.flags)
        },
        ownProperty: function (name, value) {
          const flags = { ...state.flags, own: true }
          inputs.expectProperty &&
            inputs.expectProperty(state.value, name, value, flags)
        },

        match: function (regex) {
          if (inputs.expectMatch) {
            // Preserve regex display string before serialization
            const regexStr =
              regex instanceof RegExp ? regex.toString() : String(regex)
            const enhancedFlags = { ...state.flags, _regexDisplay: regexStr }
            inputs.expectMatch(state.value, regex, enhancedFlags)
          }
        },
        string: function (value) {
          inputs.expectString &&
            inputs.expectString(state.value, value, state.flags)
        },

        keys: function (...keys) {
          inputs.expectKeys && inputs.expectKeys(state.value, keys, state.flags)
        },
        key: function (key) {
          this.keys(key)
        },

        instanceof: function (constructor) {
          if (inputs.expectInstanceOf) {
            // Pre-check instanceof before serialization (objects lose their type)
            const isInstance = state.value instanceof constructor

            // Preserve constructor information and pre-checked result before serialization
            let enhancedFlags = { ...state.flags }
            if (typeof constructor === "function") {
              enhancedFlags._constructorName = constructor.name
              enhancedFlags._constructorString = constructor.toString()
            }
            enhancedFlags._preCheckedInstance = isInstance

            inputs.expectInstanceOf(state.value, constructor, enhancedFlags)
          }
        },

        throw: function (errorLike, errMsgMatcher) {
          if (inputs.expectThrow) {
            // Preserve regex display strings before serialization
            let enhancedFlags = { ...state.flags }
            if (errorLike instanceof RegExp) {
              enhancedFlags._errorLikeDisplay = errorLike.toString()
            }
            if (errMsgMatcher instanceof RegExp) {
              enhancedFlags._errMsgMatcherDisplay = errMsgMatcher.toString()
            }
            inputs.expectThrow(
              state.value,
              errorLike,
              errMsgMatcher,
              enhancedFlags
            )
          }
        },
        throws: function (errorLike, errMsgMatcher) {
          this.throw(errorLike, errMsgMatcher)
        },

        respondTo: function (method) {
          // Check if the value responds to the method before serialization
          let respondsTo = false
          if (state.flags.itself) {
            // Check if the object itself has the method
            respondsTo =
              typeof state.value === "function" &&
              typeof state.value[method] === "function"
          } else {
            // Check if the object or its prototype has the method
            if (typeof state.value === "function") {
              respondsTo =
                typeof state.value.prototype?.[method] === "function" ||
                typeof state.value[method] === "function"
            } else if (
              typeof state.value === "object" &&
              state.value !== null
            ) {
              respondsTo = typeof state.value[method] === "function"
            }
          }
          inputs.expectRespondTo &&
            inputs.expectRespondTo(state.value, method, state.flags, respondsTo)
        },
        satisfy: function (matcher) {
          inputs.expectSatisfy &&
            inputs.expectSatisfy(state.value, matcher, state.flags)
        },
        members: function (list) {
          inputs.expectMembers &&
            inputs.expectMembers(state.value, list, state.flags)
        },
        oneOf: function (list) {
          inputs.expectOneOf &&
            inputs.expectOneOf(state.value, list, state.flags)
        },
      }

      // Add language chain getters after object creation to avoid circular reference issues
      Object.defineProperty(proxy, "to", { get: () => proxy })
      Object.defineProperty(proxy, "be", {
        get: () => {
          state._lastChain = "be"
          return proxy
        },
      })
      Object.defineProperty(proxy, "been", { get: () => proxy })
      Object.defineProperty(proxy, "is", { get: () => proxy })
      Object.defineProperty(proxy, "that", { get: () => proxy })
      Object.defineProperty(proxy, "which", { get: () => proxy })
      Object.defineProperty(proxy, "and", { get: () => proxy })
      Object.defineProperty(proxy, "has", { get: () => proxy })
      Object.defineProperty(proxy, "have", { get: () => proxy })
      Object.defineProperty(proxy, "with", { get: () => proxy })
      Object.defineProperty(proxy, "at", { get: () => proxy })
      Object.defineProperty(proxy, "of", { get: () => proxy })
      Object.defineProperty(proxy, "same", { get: () => proxy })
      Object.defineProperty(proxy, "but", { get: () => proxy })
      Object.defineProperty(proxy, "does", { get: () => proxy })

      // Add modifier getters
      Object.defineProperty(proxy, "not", {
        get: () => {
          state.flags.not = !state.flags.not
          return proxy
        },
      })
      Object.defineProperty(proxy, "deep", {
        get: () => {
          state.flags.deep = true
          return proxy
        },
      })
      Object.defineProperty(proxy, "nested", {
        get: () => {
          state.flags.nested = true
          return proxy
        },
      })
      Object.defineProperty(proxy, "own", {
        get: () => {
          state.flags.own = true
          return proxy
        },
      })
      Object.defineProperty(proxy, "ordered", {
        get: () => {
          state.flags.ordered = true
          return proxy
        },
      })
      Object.defineProperty(proxy, "any", {
        get: () => {
          state.flags.any = true
          return proxy
        },
      })
      Object.defineProperty(proxy, "all", {
        get: () => {
          state.flags.all = true
          return proxy
        },
      })
      // Note: include is both a modifier and a method, prioritizing method over getter to avoid conflicts
      Object.defineProperty(proxy, "itself", {
        get: () => {
          state.flags.itself = true
          return proxy
        },
      })

      // Add getter for 'an' that returns an object with instanceof method
      // This allows .be.an.instanceof(Constructor) pattern
      Object.defineProperty(proxy.an, "instanceof", {
        value: function (constructor) {
          return proxy.instanceof(constructor)
        },
        writable: true,
        enumerable: false,
        configurable: true,
      })

      // Add getter for 'a' that returns an object with instanceof method
      Object.defineProperty(proxy.a, "instanceof", {
        value: function (constructor) {
          return proxy.instanceof(constructor)
        },
        writable: true,
        enumerable: false,
        configurable: true,
      })

      // Add getters for include and contain that return callable functions with chaining methods
      // This allows both .include('value') and .include.oneOf([...]) to work
      Object.defineProperty(proxy, "include", {
        get: function () {
          const newFlags = { ...state.flags, include: true }

          // Create a function that executes the include assertion
          const includeFunc = function (needle) {
            inputs.expectInclude &&
              inputs.expectInclude(state.value, needle, newFlags)
          }

          // Add chaining methods directly to the function
          includeFunc.oneOf = function (list) {
            inputs.expectOneOf &&
              inputs.expectOneOf(state.value, list, newFlags)
          }
          includeFunc.members = function (list) {
            inputs.expectMembers &&
              inputs.expectMembers(state.value, list, newFlags)
          }
          // Add all getter for .include.all.keys()
          Object.defineProperty(includeFunc, "all", {
            get: function () {
              const allFlags = { ...newFlags, all: true }
              return globalThis.__createChaiProxy(state.value, inputs, allFlags)
            },
          })

          return includeFunc
        },
        enumerable: true,
        configurable: true,
      })

      Object.defineProperty(proxy, "contain", {
        get: function () {
          const newFlags = { ...state.flags, include: true }

          // Create a function that executes the contain assertion
          const containFunc = function (needle) {
            inputs.expectInclude &&
              inputs.expectInclude(state.value, needle, newFlags)
          }

          // Add chaining methods directly to the function
          containFunc.oneOf = function (list) {
            inputs.expectOneOf &&
              inputs.expectOneOf(state.value, list, newFlags)
          }

          return containFunc
        },
        enumerable: true,
        configurable: true,
      })

      return proxy
    }
  }
  const toJSON = (input) => {
    if (input == null) return null

    if (typeof input === "string") {
      try {
        return JSON.parse(input)
      } catch {
        throw new Error("Invalid JSON string")
      }
    }

    if (typeof input === "object") {
      return input
    }

    throw new Error(
      "Unsupported input type for hopp.response.asJSON(). Expected string or object."
    )
  }

  /**
   * Convert input into text (stringify objects, pass strings through).
   */
  const toText = (input) => {
    if (input == null) return ""

    if (typeof input === "string") return input

    if (typeof input === "object") return JSON.stringify(input)

    throw new Error("Unsupported input type for hopp.response.asText()")
  }

  /**
   * Convert input into bytes (UTF-8 encode strings, stringify objects first).
   */
  const toBytes = (input) => {
    if (input == null) return new Uint8Array()

    if (typeof input === "string") return new TextEncoder().encode(input)

    if (typeof input === "object")
      return new TextEncoder().encode(JSON.stringify(input))

    throw new Error("Unsupported input type for hopp.response.bytes()")
  }

  const { status, statusText, headers, responseTime, body } =
    inputs.getResponse()

  const pwResponse = {
    status,
    body,
    headers,
  }

  // Create response body object with read-only methods
  const responseBody = {
    asJSON: () => toJSON(body),
    asText: () => toText(body),
    bytes: () => toBytes(body),
  }

  // Make body methods read-only using a loop
  ;["asJSON", "asText", "bytes"].forEach((method) => {
    Object.defineProperty(responseBody, method, {
      value: responseBody[method],
      writable: false,
      configurable: false,
    })
  })
  Object.freeze(responseBody)

  // Create response object with read-only properties
  const hoppResponse = {}

  // Define response properties and their values
  const responseProperties = {
    statusCode: status,
    statusText: statusText,
    headers: headers,
    responseTime: responseTime,
    body: responseBody,
  }

  // Apply read-only protection to all response properties
  Object.keys(responseProperties).forEach((prop) => {
    Object.defineProperty(hoppResponse, prop, {
      value: responseProperties[prop],
      writable: false,
      enumerable: true,
      configurable: false,
    })
  })

  // Freeze the entire response object
  Object.freeze(hoppResponse)

  globalThis.pw = {
    env: {
      get: (key) => inputs.envGet(key),
      getResolve: (key) => inputs.envGetResolve(key),
      set: (key, value) => inputs.envSet(key, value),
      unset: (key) => inputs.envUnset(key),
      resolve: (key) => inputs.envResolve(key),
    },
    expect: (expectVal) => {
      const isDateInstance = expectVal instanceof Date

      const expectation = {
        toBe: (expectedVal) => inputs.expectToBe(expectVal, expectedVal),
        toBeLevel2xx: () => inputs.expectToBeLevel2xx(expectVal),
        toBeLevel3xx: () => inputs.expectToBeLevel3xx(expectVal),
        toBeLevel4xx: () => inputs.expectToBeLevel4xx(expectVal),
        toBeLevel5xx: () => inputs.expectToBeLevel5xx(expectVal),
        toBeType: (expectedType) =>
          inputs.expectToBeType(expectVal, expectedType, isDateInstance),
        toHaveLength: (expectedLength) =>
          inputs.expectToHaveLength(expectVal, expectedLength),
        toInclude: (needle) => inputs.expectToInclude(expectVal, needle),
      }

      Object.defineProperty(expectation, "not", {
        get: () => ({
          toBe: (expectedVal) => inputs.expectNotToBe(expectVal, expectedVal),
          toBeLevel2xx: () => inputs.expectNotToBeLevel2xx(expectVal),
          toBeLevel3xx: () => inputs.expectNotToBeLevel3xx(expectVal),
          toBeLevel4xx: () => inputs.expectNotToBeLevel4xx(expectVal),
          toBeLevel5xx: () => inputs.expectNotToBeLevel5xx(expectVal),
          toBeType: (expectedType) =>
            inputs.expectNotToBeType(expectVal, expectedType, isDateInstance),
          toHaveLength: (expectedLength) =>
            inputs.expectNotToHaveLength(expectVal, expectedLength),
          toInclude: (needle) => inputs.expectNotToInclude(expectVal, needle),
        }),
      })

      return expectation
    },
    test: (descriptor, testFn) => {
      inputs.preTest(descriptor)
      testFn()
      inputs.postTest()
    },
    response: pwResponse,
  }

  // Immutable getters under the `request` namespace
  const requestProps = {}

  // Define all properties with unified read-only protection
  ;["url", "method", "params", "headers", "body", "auth"].forEach((prop) => {
    Object.defineProperty(requestProps, prop, {
      enumerable: true,
      configurable: false,
      get() {
        return inputs.getRequestProps()[prop]
      },
      set(_value) {
        throw new TypeError(`hopp.request.${prop} is read-only`)
      },
    })
  })

  // Special handling for variables property
  Object.defineProperty(requestProps, "variables", {
    enumerable: true,
    configurable: false,
    get() {
      return Object.freeze({
        get: (key) => inputs.getRequestVariable(key),
      })
    },
    set(_value) {
      throw new TypeError(`hopp.request.variables is read-only`)
    },
  })

  // Freeze the entire requestProps object for additional protection
  Object.freeze(requestProps)

  globalThis.hopp = {
    env: {
      get: (key) =>
        inputs.envGetResolve(key, { fallbackToNull: true, source: "all" }),
      getRaw: (key) =>
        inputs.envGet(key, { fallbackToNull: true, source: "all" }),
      set: (key, value) => inputs.envSet(key, value),
      delete: (key) => inputs.envUnset(key),
      reset: (key) => inputs.envReset(key),
      getInitialRaw: (key) => inputs.envGetInitialRaw(key),
      setInitial: (key, value) => inputs.envSetInitial(key, value),

      active: {
        get: (key) =>
          inputs.envGetResolve(key, { fallbackToNull: true, source: "active" }),
        getRaw: (key) =>
          inputs.envGet(key, { fallbackToNull: true, source: "active" }),
        set: (key, value) => inputs.envSet(key, value, { source: "active" }),
        delete: (key) => inputs.envUnset(key, { source: "active" }),
        reset: (key) => inputs.envReset(key, { source: "active" }),
        getInitialRaw: (key) =>
          inputs.envGetInitialRaw(key, { source: "active" }),
        setInitial: (key, value) =>
          inputs.envSetInitial(key, value, { source: "active" }),
      },

      global: {
        get: (key) =>
          inputs.envGetResolve(key, { fallbackToNull: true, source: "global" }),
        getRaw: (key) =>
          inputs.envGet(key, { fallbackToNull: true, source: "global" }),
        set: (key, value) => inputs.envSet(key, value, { source: "global" }),
        delete: (key) => inputs.envUnset(key, { source: "global" }),
        reset: (key) => inputs.envReset(key, { source: "global" }),
        getInitialRaw: (key) =>
          inputs.envGetInitialRaw(key, { source: "global" }),
        setInitial: (key, value) =>
          inputs.envSetInitial(key, value, { source: "global" }),
      },
    },
    request: requestProps,
    cookies: {
      get: (domain, name) => inputs.cookieGet(domain, name),
      set: (domain, cookie) => inputs.cookieSet(domain, cookie),
      has: (domain, name) => inputs.cookieHas(domain, name),
      getAll: (domain) => inputs.cookieGetAll(domain),
      delete: (domain, name) => inputs.cookieDelete(domain, name),
      clear: (domain) => inputs.cookieClear(domain),
    },
    expect: (expectVal) => {
      // Use the new Chai-style expectation system if enhanced methods are available (experimental sandbox)
      if (
        inputs.expectEqual &&
        typeof globalThis.__createChaiProxy === "function"
      ) {
        return globalThis.__createChaiProxy(expectVal, inputs)
      }

      // Fallback to legacy expectation system for backwards compatibility
      const isDateInstance = expectVal instanceof Date

      const expectation = {
        toBe: (expectedVal) => inputs.expectToBe(expectVal, expectedVal),
        toBeLevel2xx: () => inputs.expectToBeLevel2xx(expectVal),
        toBeLevel3xx: () => inputs.expectToBeLevel3xx(expectVal),
        toBeLevel4xx: () => inputs.expectToBeLevel4xx(expectVal),
        toBeLevel5xx: () => inputs.expectToBeLevel5xx(expectVal),
        toBeType: (expectedType) =>
          inputs.expectToBeType(expectVal, expectedType, isDateInstance),
        toHaveLength: (expectedLength) =>
          inputs.expectToHaveLength(expectVal, expectedLength),
        toInclude: (needle) => inputs.expectToInclude(expectVal, needle),
      }

      Object.defineProperty(expectation, "not", {
        get: () => ({
          toBe: (expectedVal) => inputs.expectNotToBe(expectVal, expectedVal),
          toBeLevel2xx: () => inputs.expectNotToBeLevel2xx(expectVal),
          toBeLevel3xx: () => inputs.expectNotToBeLevel3xx(expectVal),
          toBeLevel4xx: () => inputs.expectNotToBeLevel4xx(expectVal),
          toBeLevel5xx: () => inputs.expectNotToBeLevel5xx(expectVal),
          toBeType: (expectedType) =>
            inputs.expectNotToBeType(expectVal, expectedType, isDateInstance),
          toHaveLength: (expectedLength) =>
            inputs.expectNotToHaveLength(expectVal, expectedLength),
          toInclude: (needle) => inputs.expectNotToInclude(expectVal, needle),
        }),
      })

      return expectation
    },
    test: (descriptor, testFn) => {
      inputs.preTest(descriptor)
      testFn()
      inputs.postTest()
    },
    response: hoppResponse,
  }

  // PM Namespace - Postman Compatibility Layer
  globalThis.pm = {
    environment: {
      get: (key) => globalThis.hopp.env.active.get(key),
      set: (key, value) => globalThis.hopp.env.active.set(key, value),
      unset: (key) => globalThis.hopp.env.active.delete(key),
      has: (key) => globalThis.hopp.env.active.get(key) !== null,
      clear: () => {
        throw new Error("pm.environment.clear() not yet implemented")
      },
      toObject: () => {
        throw new Error("pm.environment.toObject() not yet implemented")
      },
    },

    globals: {
      get: (key) => globalThis.hopp.env.global.get(key),
      set: (key, value) => globalThis.hopp.env.global.set(key, value),
      unset: (key) => globalThis.hopp.env.global.delete(key),
      has: (key) => globalThis.hopp.env.global.get(key) !== null,
      clear: () => {
        throw new Error("pm.globals.clear() not yet implemented")
      },
      toObject: () => {
        throw new Error("pm.globals.toObject() not yet implemented")
      },
    },

    variables: {
      get: (key) => globalThis.hopp.env.get(key),
      set: (key, value) => globalThis.hopp.env.active.set(key, value),
      has: (key) => globalThis.hopp.env.get(key) !== null,
      replaceIn: (template) => {
        if (typeof template !== "string") return template
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const value = globalThis.hopp.env.get(key.trim())
          return value !== null ? value : match
        })
      },
    },

    request: {
      get url() {
        const urlString = globalThis.hopp.request.url
        return {
          toString: () => urlString,
        }
      },

      get method() {
        return globalThis.hopp.request.method
      },

      get headers() {
        return {
          get: (name) => {
            const headers = globalThis.hopp.request.headers
            const header = headers.find(
              (h) => h.key.toLowerCase() === name.toLowerCase()
            )
            return header ? header.value : null
          },
          has: (name) => {
            const headers = globalThis.hopp.request.headers
            return headers.some(
              (h) => h.key.toLowerCase() === name.toLowerCase()
            )
          },
          all: () => {
            const result = {}
            globalThis.hopp.request.headers.forEach((header) => {
              result[header.key] = header.value
            })
            return result
          },
        }
      },

      get body() {
        return globalThis.hopp.request.body
      },

      get auth() {
        return globalThis.hopp.request.auth
      },
    },

    response: {
      get code() {
        return globalThis.hopp.response.statusCode
      },
      get status() {
        return globalThis.hopp.response.statusText
      },
      get responseTime() {
        return globalThis.hopp.response.responseTime
      },
      text: () => globalThis.hopp.response.body.asText(),
      json: () => globalThis.hopp.response.body.asJSON(),
      stream: globalThis.hopp.response.body.bytes(),
      headers: {
        get: (name) => {
          const headers = globalThis.hopp.response.headers
          const header = headers.find(
            (h) => h.key.toLowerCase() === name.toLowerCase()
          )
          return header ? header.value : null
        },
        has: (name) => {
          const headers = globalThis.hopp.response.headers
          return headers.some((h) => h.key.toLowerCase() === name.toLowerCase())
        },
        all: () => {
          const result = {}
          globalThis.hopp.response.headers.forEach((header) => {
            result[header.key] = header.value
          })
          return result
        },
      },
      cookies: {
        get: (_name) => {
          throw new Error("pm.response.cookies.get() not yet implemented")
        },
        has: (_name) => {
          throw new Error("pm.response.cookies.has() not yet implemented")
        },
        toObject: () => {
          throw new Error("pm.response.cookies.toObject() not yet implemented")
        },
      },
    },

    cookies: {
      get: (_name) => {
        throw new Error(
          "pm.cookies.get() needs domain information - use hopp.cookies instead"
        )
      },
      set: (_name, _value, _options) => {
        throw new Error(
          "pm.cookies.set() needs domain information - use hopp.cookies instead"
        )
      },
      jar: () => {
        throw new Error("pm.cookies.jar() not yet implemented")
      },
    },

    test: (name, fn) => globalThis.hopp.test(name, fn),
    expect: (value) => {
      // Always use the enhanced Chai proxy system for PM namespace
      if (typeof globalThis.__createChaiProxy === "function") {
        return globalThis.__createChaiProxy(value, inputs)
      }
      // Fallback to hopp namespace expect if Chai proxy is not available
      return globalThis.hopp.expect(value)
    },

    // Script context information
    info: {
      eventName: "post-request", // post-request context
      get requestName() {
        return inputs.pmInfoRequestName()
      },
      get requestId() {
        return inputs.pmInfoRequestId()
      },
      // Unsupported Collection Runner features
      get iteration() {
        throw new Error(
          "pm.info.iteration is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      get iterationCount() {
        throw new Error(
          "pm.info.iterationCount is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Unsupported APIs that throw errors
    sendRequest: () => {
      throw new Error("pm.sendRequest() is not yet implemented in Hoppscotch")
    },

    // Collection variables (unsupported)
    collectionVariables: {
      get: () => {
        throw new Error(
          "pm.collectionVariables.get() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      set: () => {
        throw new Error(
          "pm.collectionVariables.set() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.collectionVariables.unset() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      has: () => {
        throw new Error(
          "pm.collectionVariables.has() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      clear: () => {
        throw new Error(
          "pm.collectionVariables.clear() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      toObject: () => {
        throw new Error(
          "pm.collectionVariables.toObject() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
    },

    // Postman Vault (unsupported)
    vault: {
      get: () => {
        throw new Error(
          "pm.vault.get() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
      set: () => {
        throw new Error(
          "pm.vault.set() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.vault.unset() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
    },

    // Iteration data (unsupported)
    iterationData: {
      get: () => {
        throw new Error(
          "pm.iterationData.get() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      set: () => {
        throw new Error(
          "pm.iterationData.set() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.iterationData.unset() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      has: () => {
        throw new Error(
          "pm.iterationData.has() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      toObject: () => {
        throw new Error(
          "pm.iterationData.toObject() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Execution control (unsupported)
    execution: {
      setNextRequest: () => {
        throw new Error(
          "pm.execution.setNextRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },
  }
}
