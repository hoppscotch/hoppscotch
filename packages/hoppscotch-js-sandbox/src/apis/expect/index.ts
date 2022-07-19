import { useAPIExposed } from "../../apiManager"
import { defineAPI, onTestScriptComplete } from "../../api"
import { createExpectation } from "./utils"

export default () =>
  defineAPI("expect", (vm) => {
    const exposedAPI = useAPIExposed("test")

    const testRunStack = exposedAPI.getTestRunStack()

    const handle = vm.newFunction("expect", (expectValueHandle) => {
      const expectVal = vm.dump(expectValueHandle)

      return {
        value: createExpectation(vm, expectVal, false, testRunStack),
      }
    })

    const exposed = {}

    onTestScriptComplete((report) => ({
      ...report,
      tests: testRunStack,
    }))

    return {
      rootHandle: handle,
      exposes: exposed,
      apis: [],
    }
  })
