/* eslint-disable @typescript-eslint/no-unused-expressions */
;(inputs) => {
  // Keep strict mode scoped to this IIFE to avoid leaking strictness to concatenated/bootstrapped code
  "use strict"
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
        
        // Enhanced replaceIn with nested variable support
        let result = template
        let depth = 0
        const maxDepth = 15
        
        // Support both {{var}} and nested {{{{key1}}{{key2}}}} syntax
        while (result.match(/\{\{([^}]*)\}\}/g) && depth < maxDepth) {
          const previousResult = result
          
          result = result.replace(/\{\{([^}]*)\}\}/g, (match, varKey) => {
            // First resolve any nested variables within the key itself
            let resolvedKey = varKey.trim()
            let keyDepth = 0
            
            // Resolve nested keys like {{country}}{{env}} -> USPROD
            while (resolvedKey.match(/\{\{([^}]*)\}\}/g) && keyDepth < 5) {
              resolvedKey = resolvedKey.replace(/\{\{([^}]*)\}\}/g, (keyMatch, nestedKey) => {
                const nestedValue = globalThis.hopp.env.get(nestedKey.trim())
                return nestedValue !== null ? nestedValue : ""
              })
              keyDepth++
            }
            
            // Now get the final value using the resolved key
            const value = globalThis.hopp.env.get(resolvedKey)
            return value !== null ? value : ""
          })
          
          // Break if no changes to prevent infinite loops
          if (result === previousResult) break
          depth++
        }
        
        return result
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
    expect: (value) => globalThis.hopp.expect(value),

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
