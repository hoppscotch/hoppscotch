import { parseTemplateStringE } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import { defineAPI } from "../../api"
import { Envs } from "."
import {
  defineVmFn,
  disposeHandlers,
  VmFnPairs,
  setFnHandlers,
} from "../../utils"
import { getActiveEnv } from "./utils"

type EnvActiveKeys = "get"

export default (data: { envs: Envs }) =>
  defineAPI("active", (vm) => {
    const handle = vm.newObject()

    const getHandleFn = defineVmFn((keyHandle) => {
      const { envs: currentEnvs } = data
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      const result = pipe(
        getActiveEnv(key, currentEnvs),
        E.fromOption(() => "INVALID_KEY" as const),

        E.map(({ value }) =>
          pipe(
            parseTemplateStringE(value, [
              ...currentEnvs.selected,
              ...currentEnvs.global,
            ]),
            // If the recursive resolution failed, return the unresolved value
            E.getOrElse(() => value)
          )
        ),

        // Create a new VM String
        E.map((x) => vm.newString(x)),

        E.getOrElse(() => vm.undefined)
      )

      return {
        value: result,
      }
    })

    const vmFnPairs: VmFnPairs<EnvActiveKeys>[] = [
      { key: "get", func: getHandleFn },
    ]

    const handlers = setFnHandlers(vm, handle, vmFnPairs)
    disposeHandlers(handlers)

    return {
      rootHandle: handle,
      exposes: {},
      childAPIs: [],
    }
  })
