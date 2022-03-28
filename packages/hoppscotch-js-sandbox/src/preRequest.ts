import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as qjs from "quickjs-emscripten"
import cloneDeep from "lodash/clone"
import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import { getEnv, setEnv } from "./utils"

type Envs = {
  global: Environment["variables"]
  selected: Environment["variables"]
}

export const execPreRequestScript = (
  preRequestScript: string,
  envs: Envs
): TE.TaskEither<string, Envs> =>
  pipe(
    TE.tryCatch(
      async () => await qjs.getQuickJS(),
      (reason) => `QuickJS initialization failed: ${reason}`
    ),
    TE.chain((QuickJS) => {
      let currentEnvs = cloneDeep(envs)

      const vm = QuickJS.createVm()

      const pwHandle = vm.newObject()

      // Environment management APIs
      // TODO: Unified Implementation
      const envHandle = vm.newObject()

      const envGetHandle = vm.newFunction("get", (keyHandle) => {
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

      const envGetResolveHandle = vm.newFunction("getResolve", (keyHandle) => {
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
              parseTemplateStringE(value, [...envs.selected, ...envs.global]),
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

      const envSetHandle = vm.newFunction("set", (keyHandle, valueHandle) => {
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

      const envResolveHandle = vm.newFunction("resolve", (valueHandle) => {
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

      vm.setProp(envHandle, "resolve", envResolveHandle)
      envResolveHandle.dispose()

      vm.setProp(envHandle, "set", envSetHandle)
      envSetHandle.dispose()

      vm.setProp(envHandle, "getResolve", envGetResolveHandle)
      envGetResolveHandle.dispose()

      vm.setProp(envHandle, "get", envGetHandle)
      envGetHandle.dispose()

      vm.setProp(pwHandle, "env", envHandle)
      envHandle.dispose()

      vm.setProp(vm.global, "pw", pwHandle)
      pwHandle.dispose()

      const evalRes = vm.evalCode(preRequestScript)

      if (evalRes.error) {
        const errorData = vm.dump(evalRes.error)
        evalRes.error.dispose()

        return TE.left(errorData)
      }

      vm.dispose()

      return TE.right(currentEnvs)
    })
  )
