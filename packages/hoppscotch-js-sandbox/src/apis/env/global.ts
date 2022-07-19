import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import cloneDeep from "lodash/cloneDeep"
import { defineAPI } from "../../api"
import { Envs } from "."
import {
  defineHandleFn,
  disposeHandlers,
  HandleFnPairs,
  setHandlers,
} from "../../utils"

export type EnvGlobalAPINamespaces = "get"

export default (initialEnvs: Envs) =>
  defineAPI("global", (vm) => {
    const handle = vm.newObject()

    const currentEnvs: Envs = cloneDeep(initialEnvs)

    const getHandleFn = defineHandleFn((keyHandle) => {
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      const result = pipe(
        O.fromNullable(currentEnvs.global.find((x) => x.key === key)),
        O.match(
          () => vm.undefined,
          ({ value }) => vm.newString(value)
        )
      )

      return {
        value: result,
      }
    })

    const handleFnPairs: HandleFnPairs<EnvGlobalAPINamespaces>[] = [
      { key: "get", func: getHandleFn },
    ]

    const handlers = setHandlers(vm, handle, handleFnPairs)
    disposeHandlers(handlers)

    return {
      rootHandle: handle,
      exposes: {},
      apis: [],
    }
  })
