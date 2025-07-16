/* eslint-disable @typescript-eslint/no-unused-expressions */
;(inputs) => {
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

    throw new Error("Unsupported input type for hopp.response.asJSON()")
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

  const hoppResponse = {
    statusCode: status,
    statusText,
    headers,
    responseTime,
    body: {
      asJSON: () => toJSON(body),
      asText: () => toText(body),
      bytes: () => toBytes(body),
    },
  }

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
  const requestProps = {
    variables: {
      get: (key) => inputs.getRequestVariable(key),
    },
  }

  // TODO: Rely on `Object.freeze` or similar to prevent modifications all at once
  ;["url", "method", "params", "headers", "body", "auth"].forEach((prop) => {
    Object.defineProperty(requestProps, prop, {
      enumerable: true,
      configurable: false,
      get() {
        const currentValues = inputs.getRequestProps()
        return currentValues[prop]
      },
      set(_value) {
        throw new TypeError(`hopp.request.${prop} is read-only`)
      },
    })
  })

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
}
