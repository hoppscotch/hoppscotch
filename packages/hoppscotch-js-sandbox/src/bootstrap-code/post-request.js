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
    expect: (expectVal) => {
      return {
        toBe: (expectedVal) => inputs.expectToBe(expectVal, expectedVal),
        toBeLevel2xx: (expectedVal) =>
          inputs.expectToBeLevel2xx(expectVal, expectedVal),
        toBeLevel3xx: (expectedVal) =>
          inputs.expectToBeLevel3xx(expectVal, expectedVal),
        toBeLevel4xx: (expectedVal) =>
          inputs.expectToBeLevel4xx(expectVal, expectedVal),
        toBeLevel5xx: (expectedVal) =>
          inputs.expectToBeLevel5xx(expectVal, expectedVal),
        toBeType: (expectedVal) => {
          const isExpectValDateInstance = expectVal instanceof Date
          return inputs.expectToBeType(
            expectVal,
            expectedVal,
            isExpectValDateInstance
          )
        },
        toHaveLength: (expectedVal) =>
          inputs.expectToHaveLength(expectVal, expectedVal),
        toInclude: (expectedVal) =>
          inputs.expectToInclude(expectVal, expectedVal),
        not: {
          toBe: (expectedVal) => inputs.expectNotToBe(expectVal, expectedVal),
          toBeLevel2xx: (expectedVal) =>
            inputs.expectNotToBeLevel2xx(expectVal, expectedVal),
          toBeLevel3xx: (expectedVal) =>
            inputs.expectNotToBeLevel3xx(expectVal, expectedVal),
          toBeLevel4xx: (expectedVal) =>
            inputs.expectNotToBeLevel4xx(expectVal, expectedVal),
          toBeLevel5xx: (expectedVal) =>
            inputs.expectNotToBeLevel5xx(expectVal, expectedVal),
          toBeType: (expectedVal) => {
            const isExpectValDateInstance = expectVal instanceof Date
            return inputs.expectNotToBeType(
              expectVal,
              expectedVal,
              isExpectValDateInstance
            )
          },
          toHaveLength: (expectedVal) =>
            inputs.expectNotToHaveLength(expectVal, expectedVal),
          toInclude: (expectedVal) =>
            inputs.expectNotToInclude(expectVal, expectedVal),
        },
      }
    },
    test: (descriptor, testFn) => {
      inputs.preTest(descriptor)
      testFn()
      inputs.postTest()
    },
    response: inputs.getResponse(),
  }
}
