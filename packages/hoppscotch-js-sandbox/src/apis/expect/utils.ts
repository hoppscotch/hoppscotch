import { QuickJSContext, QuickJSHandle } from "quickjs-emscripten"
import { TestDescriptor } from "../../test-runner"

/**
 * Creates an Expectation object for use inside the sandbox
 * @param vm The QuickJS sandbox VM instance
 * @param expectVal The expecting value of the expectation
 * @param negated Whether the expectation is negated (negative)
 * @param currTestStack The current state of the test execution stack
 * @returns Handle to the expectation object in VM
 */
export function createExpectation(
  vm: QuickJSContext,
  expectVal: any,
  negated: boolean,
  currTestStack: TestDescriptor[]
): QuickJSHandle {
  const resultHandle = vm.newObject()

  const toBeFnHandle = vm.newFunction("toBe", (expectedValHandle) => {
    const expectedVal = vm.dump(expectedValHandle)

    let assertion = expectVal === expectedVal
    if (negated) assertion = !assertion

    if (assertion) {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "pass",
        message: `Expected '${expectVal}' to${
          negated ? " not" : ""
        } be '${expectedVal}'`,
      })
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "fail",
        message: `Expected '${expectVal}' to${
          negated ? " not" : ""
        } be '${expectedVal}'`,
      })
    }

    return { value: vm.undefined }
  })

  const toBeLevel2xxHandle = vm.newFunction("toBeLevel2xx", () => {
    // Check if the expected value is a number, else it is an error
    if (typeof expectVal === "number" && !Number.isNaN(expectVal)) {
      let assertion = expectVal >= 200 && expectVal <= 299
      if (negated) assertion = !assertion

      if (assertion) {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "pass",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 200-level status`,
        })
      } else {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "fail",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 200-level status`,
        })
      }
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Expected 200-level status but could not parse value '${expectVal}'`,
      })
    }

    return { value: vm.undefined }
  })

  const toBeLevel3xxHandle = vm.newFunction("toBeLevel3xx", () => {
    // Check if the expected value is a number, else it is an error
    if (typeof expectVal === "number" && !Number.isNaN(expectVal)) {
      let assertion = expectVal >= 300 && expectVal <= 399
      if (negated) assertion = !assertion

      if (assertion) {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "pass",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 300-level status`,
        })
      } else {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "fail",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 300-level status`,
        })
      }
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Expected 300-level status but could not parse value '${expectVal}'`,
      })
    }

    return { value: vm.undefined }
  })

  const toBeLevel4xxHandle = vm.newFunction("toBeLevel4xx", () => {
    // Check if the expected value is a number, else it is an error
    if (typeof expectVal === "number" && !Number.isNaN(expectVal)) {
      let assertion = expectVal >= 400 && expectVal <= 499
      if (negated) assertion = !assertion

      if (assertion) {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "pass",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 400-level status`,
        })
      } else {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "fail",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 400-level status`,
        })
      }
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Expected 400-level status but could not parse value '${expectVal}'`,
      })
    }

    return { value: vm.undefined }
  })

  const toBeLevel5xxHandle = vm.newFunction("toBeLevel5xx", () => {
    // Check if the expected value is a number, else it is an error
    if (typeof expectVal === "number" && !Number.isNaN(expectVal)) {
      let assertion = expectVal >= 500 && expectVal <= 599
      if (negated) assertion = !assertion

      if (assertion) {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "pass",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 500-level status`,
        })
      } else {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "fail",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be 500-level status`,
        })
      }
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Expected 500-level status but could not parse value '${expectVal}'`,
      })
    }

    return { value: vm.undefined }
  })

  const toBeTypeHandle = vm.newFunction("toBeType", (expectedValHandle) => {
    const expectedType = vm.dump(expectedValHandle)

    // Check if the expectation param is a valid type name string, else error
    if (
      [
        "string",
        "boolean",
        "number",
        "object",
        "undefined",
        "bigint",
        "symbol",
        "function",
      ].includes(expectedType)
    ) {
      let assertion = typeof expectVal === expectedType
      if (negated) assertion = !assertion

      if (assertion) {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "pass",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be type '${expectedType}'`,
        })
      } else {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "fail",
          message: `Expected '${expectVal}' to${
            negated ? " not" : ""
          } be type '${expectedType}'`,
        })
      }
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`,
      })
    }

    return { value: vm.undefined }
  })

  const toHaveLengthHandle = vm.newFunction(
    "toHaveLength",
    (expectedValHandle) => {
      const expectedLength = vm.dump(expectedValHandle)

      if (!(Array.isArray(expectVal) || typeof expectVal === "string")) {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "error",
          message: `Expected toHaveLength to be called for an array or string`,
        })

        return { value: vm.undefined }
      }

      // Check if the parameter is a number, else error
      if (typeof expectedLength === "number" && !Number.isNaN(expectedLength)) {
        let assertion = (expectVal as any[]).length === expectedLength
        if (negated) assertion = !assertion

        if (assertion) {
          currTestStack[currTestStack.length - 1].expectResults.push({
            status: "pass",
            message: `Expected the array to${
              negated ? " not" : ""
            } be of length '${expectedLength}'`,
          })
        } else {
          currTestStack[currTestStack.length - 1].expectResults.push({
            status: "fail",
            message: `Expected the array to${
              negated ? " not" : ""
            } be of length '${expectedLength}'`,
          })
        }
      } else {
        currTestStack[currTestStack.length - 1].expectResults.push({
          status: "error",
          message: `Argument for toHaveLength should be a number`,
        })
      }

      return { value: vm.undefined }
    }
  )

  const toIncludeHandle = vm.newFunction("toInclude", (needleHandle) => {
    const expectedVal = vm.dump(needleHandle)

    if (!(Array.isArray(expectVal) || typeof expectVal === "string")) {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Expected toInclude to be called for an array or string`,
      })

      return { value: vm.undefined }
    }

    if (expectedVal === null) {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Argument for toInclude should not be null`,
      })

      return { value: vm.undefined }
    }

    if (expectedVal === undefined) {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "error",
        message: `Argument for toInclude should not be undefined`,
      })

      return { value: vm.undefined }
    }

    let assertion = expectVal.includes(expectedVal)
    if (negated) assertion = !assertion

    const expectValPretty = JSON.stringify(expectVal)
    const expectedValPretty = JSON.stringify(expectedVal)

    if (assertion) {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "pass",
        message: `Expected ${expectValPretty} to${
          negated ? " not" : ""
        } include ${expectedValPretty}`,
      })
    } else {
      currTestStack[currTestStack.length - 1].expectResults.push({
        status: "fail",
        message: `Expected ${expectValPretty} to${
          negated ? " not" : ""
        } include ${expectedValPretty}`,
      })
    }

    return { value: vm.undefined }
  })

  vm.setProp(resultHandle, "toBe", toBeFnHandle)
  vm.setProp(resultHandle, "toBeLevel2xx", toBeLevel2xxHandle)
  vm.setProp(resultHandle, "toBeLevel3xx", toBeLevel3xxHandle)
  vm.setProp(resultHandle, "toBeLevel4xx", toBeLevel4xxHandle)
  vm.setProp(resultHandle, "toBeLevel5xx", toBeLevel5xxHandle)
  vm.setProp(resultHandle, "toBeType", toBeTypeHandle)
  vm.setProp(resultHandle, "toHaveLength", toHaveLengthHandle)
  vm.setProp(resultHandle, "toInclude", toIncludeHandle)

  vm.defineProp(resultHandle, "not", {
    get: () => {
      return createExpectation(vm, expectVal, !negated, currTestStack)
    },
  })

  toBeFnHandle.dispose()
  toBeLevel2xxHandle.dispose()
  toBeLevel3xxHandle.dispose()
  toBeLevel4xxHandle.dispose()
  toBeLevel5xxHandle.dispose()
  toBeTypeHandle.dispose()
  toHaveLengthHandle.dispose()
  toIncludeHandle.dispose()

  return resultHandle
}
