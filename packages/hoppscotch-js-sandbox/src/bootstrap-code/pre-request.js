/* eslint-disable @typescript-eslint/no-unused-expressions */
;(inputs) => {
  // Keep strict mode scoped to this IIFE to avoid leaking strictness to concatenated/bootstrapped code
  "use strict"
  globalThis.pw = {
    env: {
      get: (key) => inputs.envGet(key),
      getResolve: (key) => inputs.envGetResolve(key),
      set: (key, value) => inputs.envSet(key, value),
      unset: (key) => inputs.envUnset(key),
      resolve: (key) => inputs.envResolve(key),
    },
  }

  const requestProps = {
    // Setter methods
    setUrl: (url) => inputs.setRequestUrl(url),
    setMethod: (method) => inputs.setRequestMethod(method),
    setHeader: (name, value) => inputs.setRequestHeader(name, value),
    setHeaders: (headers) => inputs.setRequestHeaders(headers),
    removeHeader: (key) => inputs.removeRequestHeader(key),
    setParam: (name, value) => inputs.setRequestParam(name, value),
    setParams: (params) => inputs.setRequestParams(params),
    removeParam: (key) => inputs.removeRequestParam(key),
    setBody: (body) => inputs.setRequestBody(body),
    setAuth: (auth) => inputs.setRequestAuth(auth),

    // Request variables
    variables: {
      get: (key) => inputs.getRequestVariable(key),
      set: (key, value) => inputs.setRequestVariable(key, value),
    },
  }

  // Define all properties with unified read-only protection
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

    // Script context information
    info: {
      eventName: "pre-request",
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
