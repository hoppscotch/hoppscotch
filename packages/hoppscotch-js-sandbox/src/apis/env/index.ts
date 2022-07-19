import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import cloneDeep from "lodash/cloneDeep"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import {
  defineAPI,
  onPreRequestScriptComplete,
  onTestScriptComplete,
} from "../../api"
import {
  setHandlers,
  disposeHandlers,
  mergeEnvs,
  defineHandleFn,
  HandleFnPairs,
} from "../../utils"
import { getEnv, setEnv } from "./utils"
import { api, Namespaced } from "../../apiManager"
import EnvGlobalAPI from "./global"
import EnvActiveAPI from "./active"

export type EnvKeys = "set" | "get" | "resolve" | "getResolve"

export type Envs = {
  global: Environment["variables"]
  selected: Environment["variables"]
}

export default (initialEnvs: Envs) =>
  defineAPI("env", (vm) => {
    const handle = vm.newObject()

    let currentEnvs: Envs = cloneDeep(initialEnvs)

    const getHandleFn = defineHandleFn((keyHandle) => {
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      const result = pipe(
        getEnv(key, currentEnvs),
        O.match(
          () => vm.undefined,
          ({ value }) => vm.newString(value)
        )
      )

      return {
        value: result,
      }
    })

    const getResolveHandleFn = defineHandleFn((keyHandle) => {
      const key: unknown = vm.dump(keyHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      const result = pipe(
        getEnv(key, currentEnvs),
        E.fromOption(() => "INVALID_KEY" as const),

        E.map(({ value }) =>
          pipe(
            parseTemplateStringE(value, [
              ...initialEnvs.selected,
              ...initialEnvs.global,
            ]),
            // If the recursive resolution failed, return the unresolved value
            E.getOrElse(() => value)
          )
        ),

        // Create a new VM String
        // NOTE: Do not shorten this to map(vm.newString) apparently it breaks it
        E.map((x) => vm.newString(x)),

        E.getOrElse(() => vm.undefined)
      )

      return {
        value: result,
      }
    })

    const setHandleFn = defineHandleFn((keyHandle, valueHandle) => {
      const key: unknown = vm.dump(keyHandle)
      const value: unknown = vm.dump(valueHandle)

      if (typeof key !== "string") {
        return {
          error: vm.newString("Expected key to be a string"),
        }
      }

      if (typeof value !== "string") {
        return {
          error: vm.newString("Expected value to be a string"),
        }
      }

      currentEnvs = setEnv(key, value, currentEnvs)

      return {
        value: vm.undefined,
      }
    })

    const resolveHandle = defineHandleFn((valueHandle) => {
      const value: unknown = vm.dump(valueHandle)

      if (typeof value !== "string") {
        return {
          error: vm.newString("Expected value to be a string"),
        }
      }

      const result = pipe(
        parseTemplateStringE(value, [
          ...currentEnvs.selected,
          ...currentEnvs.global,
        ]),
        E.getOrElse(() => value)
      )

      return {
        value: vm.newString(result),
      }
    })

    const handleFnPairs: HandleFnPairs<EnvKeys>[] = [
      { key: "get", func: getHandleFn },
      { key: "getResolve", func: getResolveHandleFn },
      { key: "set", func: setHandleFn },
      { key: "resolve", func: resolveHandle },
    ]

    const handlers = setHandlers(vm, handle, handleFnPairs)
    disposeHandlers(handlers)

    const childAPIs = [
      api([EnvGlobalAPI(currentEnvs), Namespaced("global")]),
      api([EnvActiveAPI(currentEnvs), Namespaced("active")])
    ]

    const exposed = {
      getEnvs: () => currentEnvs,
    }

    onPreRequestScriptComplete((report) => ({
      ...report,
      envs: {
        global: mergeEnvs(report.envs.global, currentEnvs.global),
        selected: mergeEnvs(report.envs.selected, currentEnvs.selected),
      },
    }))

    onTestScriptComplete((report) => ({
      ...report,
      envs: {
        global: mergeEnvs(report.envs.global, currentEnvs.global),
        selected: mergeEnvs(report.envs.selected, currentEnvs.selected),
      },
    }))

    return {
      rootHandle: handle,
      exposes: exposed,
      apis: childAPIs
    }
  })
