import { TestDescriptor } from "../../test-runner"
import { defineAPI, onTestScriptComplete } from "../../api"

export default () =>
  defineAPI("test", (vm) => {
    const testRunStack: TestDescriptor[] = [
      { descriptor: "root", expectResults: [], children: [] },
    ]

    const handle = vm.newFunction(
      "test",
      (descriptorHandle, testFuncHandle) => {
        const descriptor = vm.getString(descriptorHandle)

        testRunStack.push({
          descriptor,
          expectResults: [],
          children: [],
        })

        const result = vm.unwrapResult(vm.callFunction(testFuncHandle, vm.null))
        result.dispose()

        const child = testRunStack.pop() as TestDescriptor
        testRunStack[testRunStack.length - 1].children.push(child)
      }
    )

    const exposed = {
      getTestRunStack: () => testRunStack,
    }

    onTestScriptComplete((report) => ({
      ...report,
      tests: testRunStack,
    }))

    return {
      rootHandle: handle,
      exposes: exposed,
      childAPIs: [],
    }
  })
