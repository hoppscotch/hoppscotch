import { parseTemplateStringE } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import { defineAPI } from "../../api"
import { Envs } from "."
import {
  defineHandleFn,
  disposeHandlers,
  HandleFnPairs,
  setFnHandlers,
} from "../../utils"
import { getGlobalEnv } from "./utils"

export type EnvGlobalKeys = "get"

export default (data: { envs: Envs }) =>
  defineAPI("global", (vm) => {
    const handle = vm.newObject()

    const getHandleFn = defineHandleFn((keyHandle) => {
      const { envs: currentEnvs } = data
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      const result = pipe(
        getGlobalEnv(key, currentEnvs),
        E.fromOption(() => "INVALID_KEY" as const),

        E.map(({ value }) =>
          pipe(
            parseTemplateStringE(value, [
              ...currentEnvs.selected,
              ...currentEnvs.global,
            ]),
            E.getOrElse(() => value)
          )
        ),

        E.map((x) => vm.newString(x)),

        E.getOrElse(() => vm.undefined)
      )

      return {
        value: result,
      }
    })

    const handleFnPairs: HandleFnPairs<EnvGlobalKeys>[] = [
      { key: "get", func: getHandleFn },
    ]

    const handlers = setFnHandlers(vm, handle, handleFnPairs)
    disposeHandlers(handlers)

    return {
      rootHandle: handle,
      exposes: {},
      childAPIs: [],
    }
  })
