import * as E from "fp-ts/Either"
import { defineAPI } from "../../api"
import { marshalObjectToVM } from "./utils"
import { TestResponse } from "../../test-runner"

export default (response: TestResponse) =>
  defineAPI("response", (vm) => {
    const handle = marshalObjectToVM(vm, response)
    if (E.isLeft(handle)) {
      return {
        rootHandle: vm.undefined,
        exposes: {},
        apis: [],
      }
    }

    return {
      rootHandle: handle.right,
      exposes: {},
      apis: [],
    }
  })
