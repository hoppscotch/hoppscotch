import { parseTemplateStringE } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/lib/function"
import { cloneDeep } from "lodash"
import { TestResult } from "~/types"

import { getEnv, setEnv } from "~/utils"

const executeScriptInContextForWeb = (
  preRequestScript: string,
  envs: TestResult["envs"]
): Promise<TestResult["envs"]> => {
  return new Promise((resolve, reject) => {
    try {
      let currentEnvs = cloneDeep(envs)

      // Create a function from the script using the Function constructor
      const scriptFunction = new Function(
        "pw",
        "cloneDeep",
        "envs",
        `${preRequestScript}`
      )

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

      // Expose pw and other dependencies to the script
      scriptFunction(pw, cloneDeep, currentEnvs)

      resolve(currentEnvs)
    } catch (error) {
      reject({ error: `Script execution failed: ${(error as Error).message}` })
    }
  })
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { messageId, preRequestScript, envs } = event.data

  const result = executeScriptInContextForWeb(preRequestScript, envs)

  // Post the result back to the main thread
  self.postMessage({ messageId, result })
})
