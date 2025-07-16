/* eslint-disable @typescript-eslint/no-unused-expressions */
"use strict"
;(inputs) => {
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

  // Immutable getters
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
  }
}
