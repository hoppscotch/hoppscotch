import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/lib/TaskEither"
import cloneDeep from "lodash/clone"
import { Context, createContext, runInContext } from "vm"

import { getEnv, setEnv } from "../../utils"

type Envs = {
  global: Environment["variables"]
  selected: Environment["variables"]
}

export const execPreRequestScriptForNode = (
  preRequestScript: string,
  envs: Envs
): TE.TaskEither<string, Envs> =>
  pipe(
    TE.tryCatch(
      async () => {
        return createContext()
      },
      (reason) => `Context initialization failed: ${reason}`
    ),
    TE.chain((context) =>
      TE.tryCatch(
        () => executeScriptInContextForNode(preRequestScript, envs, context),
        (reason) => `Script execution failed: ${reason}`
      )
    )
  )

const executeScriptInContextForNode = (
  preRequestScript: string,
  envs: Envs,
  context: Context
): Promise<Envs> => {
  return new Promise((resolve, reject) => {
    try {
      let currentEnvs = cloneDeep(envs)

      const envGetHandle = (key: any) => {
        if (typeof key !== "string") {
          return reject({
            error: "Expected key to be a string",
          })
        }

        const result = pipe(
          getEnv(key, currentEnvs),
          O.match(
            () => undefined,
            ({ value }) => String(value)
          )
        )

        return result
      }

      const envGetResolveHandle = (key: any) => {
        if (typeof key !== "string") {
          return reject({
            error: "Expected key to be a string",
          })
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
          E.map((x) => String(x)),
          E.getOrElseW(() => undefined)
        )

        return result
      }

      const envSetHandle = (key: any, value: any) => {
        if (typeof key !== "string") {
          return reject({
            error: "Expected key to be a string",
          })
        }

        if (typeof value !== "string") {
          return reject({
            error: "Expected value to be a string",
          })
        }

        currentEnvs = setEnv(key, value, currentEnvs)

        return undefined
      }

      const envResolveHandle = (value: any) => {
        if (typeof value !== "string") {
          return reject({
            error: "Expected value to be a string",
          })
        }

        const result = pipe(
          parseTemplateStringE(value, [
            ...currentEnvs.selected,
            ...currentEnvs.global,
          ]),
          E.getOrElse(() => value)
        )

        return String(result)
      }

      const pw = {
        env: {
          get: envGetHandle,
          getResolve: envGetResolveHandle,
          set: envSetHandle,
          resolve: envResolveHandle,
        },
      }

      // Expose pw to the context
      context.pw = pw

      // Run the test script in the provided context
      runInContext(preRequestScript, context)

      resolve(currentEnvs)
    } catch (error) {
      reject({ error: `Script execution failed: ${(error as Error).message}` })
    }
  })
}
