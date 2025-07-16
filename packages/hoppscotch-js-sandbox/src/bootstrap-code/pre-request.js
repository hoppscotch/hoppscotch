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
    request: requestProps,
  }
}
