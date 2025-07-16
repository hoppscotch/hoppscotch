/* eslint-disable @typescript-eslint/no-unused-expressions */
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

  const requestGetterProps = inputs.getRequestProps()

  globalThis.hopp = {
    request: {
      // Immutable getters
      ...requestGetterProps,

      // Setter methods
      setUrl: (url) => inputs.setRequestUrl(url),
      setMethod: (method) => inputs.setRequestMethod(method),
      setHeader: (name, value) => inputs.setRequestHeader(name, value),
      setHeaders: (headers) => inputs.setRequestHeaders(headers),
      removeHeader: (name) => inputs.removeRequestHeader(name),
      setParam: (name, value) => inputs.setRequestParam(name, value),
      setParams: (params) => inputs.setRequestParams(params),
      removeParam: (name) => inputs.removeRequestParam(name),
      setBody: (body) => inputs.setRequestBody(body),
      setAuth: (auth) => inputs.setRequestAuth(auth),
    },
  }
}
