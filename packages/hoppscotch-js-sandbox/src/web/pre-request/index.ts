import * as E from "fp-ts/Either"

import { TestResult } from "~/types"

import Worker from "./worker?worker&inline"

export const runPreRequestScript = (
  preRequestScript: string,
  envs: TestResult["envs"]
): Promise<E.Either<string, TestResult["envs"]>> =>
  new Promise((resolve) => {
    const worker = new Worker()

    // Listen for the results from the web worker
    worker.addEventListener("message", (event: MessageEvent) =>
      resolve(event.data.results)
    )

    // Send the script to the web worker
    worker.postMessage({
      preRequestScript,
      envs,
    })
  })
