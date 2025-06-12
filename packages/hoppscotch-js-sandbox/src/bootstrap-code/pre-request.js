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
}
