import * as TE from "fp-ts/lib/TaskEither"
import { TestResult } from "~/types"

const workerScript = `
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
): TestResult["envs"] => {
    console.log("Executing script in context from web worker script", preRequestScript, envs)
    try {
      let currentEnvs = cloneDeep(envs)

      // Create a function from the script using the Function constructor
      const scriptFunction = new Function(
        "pw",
        "cloneDeep",
        "envs",
        preRequestScript
      )

      const envGetHandle = (key: any) => {
        if (typeof key !== "string") {
          return TE.left("Expected key to be a string")
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
          return TE.left("Expected key to be a string")
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
          return TE.left("Expected key to be a string")
        }

        if (typeof value !== "string") {
          return TE.left("Expected value to be a string")
        }
        currentEnvs = setEnv(key, value, currentEnvs)

        return undefined
      }

      const envResolveHandle = (value: any) => {
        if (typeof value !== "string") {
          return TE.left("Expected value to be a string")
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

      return TE.right(currentEnvs)
    } catch (error) {
      return TE.left("Script execution failed: " + (error as Error).message)
    }
}

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  console.log("Received message from main thread", event.data)

  const { messageId, preRequestScript, envs } = event.data

  const result = executeScriptInContextForWeb(preRequestScript, envs)

  // Post the result back to the main thread
  self.postMessage({ messageId, result })
})
`

// export const execPreRequestScriptForWeb = (
//   preRequestScript: string,
//   envs: TestResult["envs"]
// ): Promise<TE.TaskEither<string, TestResult["envs"]>> => {
//   return new Promise((resolve) => {
//     // Create a Blob from the script content
//     const blob = new Blob([workerScript], { type: "application/javascript" })

//     // Create a Blob URL
//     const blobURL = URL.createObjectURL(blob)

//     const worker = new Worker(blobURL, { type: "module" })

//     const messageId = Date.now().toString()
//     let result = TE.right({}) as TE.TaskEither<string, TestResult["envs"]>

//     // Listen for the result from the web worker
//     worker.addEventListener("message", (event) => {
//       if (event.data.messageId === messageId) {
//         if (event.data.result) {
//           result = TE.right(event.data.result)
//         } else {
//           result = TE.left(event.data.result)
//         }
//       }
//     })

//     // Send the script to the web worker
//     try {
//       worker.postMessage({
//         messageId,
//         preRequestScript,
//         envs,
//       })
//       console.log("Sent message to web worker", preRequestScript, envs)
//     } catch (err) {
//       console.error(
//         "Sending message to worker failed " + (err as Error).message
//       )
//     }

//     // @ts-expect-error TODO: Investigate why this comes up as a function
//     return resolve(result())
//   })
// }

export const execPreRequestScriptForWeb = (
  preRequestScript: string,
  envs: TestResult["envs"]
) =>
  new Promise((resolve) => {
    const blob = new Blob([workerScript], {
      type: "application/javascript",
    })

    const blobURL = URL.createObjectURL(blob)

    const worker = new Worker(blobURL, { type: "module" })

    const messageId = Date.now().toString()

    // Listen for the result from the web worker
    worker.addEventListener("message", (event) => {
      if (event.data.messageId === messageId) {
        if (event.data.result) {
          return resolve(TE.right(event.data.result))
        }
        return resolve(TE.left(event.data.result))
      }
    })

    // Send the script to the web worker
    try {
      worker.postMessage({
        messageId,
        preRequestScript,
        envs,
      })
      console.log("Sent message to web worker", preRequestScript, envs)
    } catch (err) {
      console.error(
        "Sending message to worker failed " + (err as Error).message
      )
      resolve(TE.left("Sending message to worker failed"))
    }
  })
