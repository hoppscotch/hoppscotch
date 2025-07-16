import { Environment, HoppRESTRequest } from "@hoppscotch/data"
import {
  SandboxPreRequestResult,
  SandboxTestResult,
  TestResult,
} from "@hoppscotch/js-sandbox"
import { runPreRequestScript, runTestScript } from "@hoppscotch/js-sandbox/web"
import * as E from "fp-ts/Either"

import { HoppRESTResponse } from "../types/HoppRESTResponse"

interface PreRequestMessage {
  type: "pre"
  script: string
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  }
  request: string // JSON stringified request
}

interface PostRequestMessage {
  type: "post"
  script: string
  envs: TestResult["envs"]
  response: HoppRESTResponse
}

type IncomingSandboxWorkerMessage = PreRequestMessage | PostRequestMessage

interface PreRequestScriptResultMessage {
  type: "PRE_REQUEST_SCRIPT_RESULT"
  data: E.Either<string, SandboxPreRequestResult>
}

interface PreRequestScriptErrorMessage {
  type: "PRE_REQUEST_SCRIPT_ERROR"
  data: unknown
}

interface PostRequestScriptResultMessage {
  type: "POST_REQUEST_SCRIPT_RESULT"
  data: E.Either<string, SandboxTestResult>
}

interface PostRequestScriptErrorMessage {
  type: "POST_REQUEST_SCRIPT_ERROR"
  data: unknown
}

export type OutgoingSandboxPreRequestWorkerMessage =
  | PreRequestScriptResultMessage
  | PreRequestScriptErrorMessage

export type OutgoingSandboxPostRequestWorkerMessage =
  | PostRequestScriptResultMessage
  | PostRequestScriptErrorMessage

self.addEventListener(
  "message",
  async (event: MessageEvent<IncomingSandboxWorkerMessage>) => {
    const { type, script, envs } = event.data
    if (type === "pre") {
      const request = JSON.parse(event.data.request) as HoppRESTRequest

      const parsedRequest = HoppRESTRequest.safeParse(request)

      if (parsedRequest.type === "err") {
        const err: PreRequestScriptErrorMessage = {
          type: "PRE_REQUEST_SCRIPT_ERROR",
          data: parsedRequest.error,
        }
        self.postMessage(err)
        return
      }

      try {
        const preRequestScriptResult = await runPreRequestScript(script, {
          envs,
          request: parsedRequest.value,
        })
        const result: PreRequestScriptResultMessage = {
          type: "PRE_REQUEST_SCRIPT_RESULT",
          data: preRequestScriptResult,
        }
        self.postMessage(result)
      } catch (error) {
        const err: PreRequestScriptErrorMessage = {
          type: "PRE_REQUEST_SCRIPT_ERROR",
          data: error,
        }
        self.postMessage(err)
      }
    }

    if (type === "post") {
      const { response } = event.data

      try {
        const postRequestScriptResult = await runTestScript(
          script,
          envs,
          response
        )
        const result: PostRequestScriptResultMessage = {
          type: "POST_REQUEST_SCRIPT_RESULT",
          data: postRequestScriptResult,
        }
        self.postMessage(result)
      } catch (error) {
        const err: PostRequestScriptErrorMessage = {
          type: "POST_REQUEST_SCRIPT_ERROR",
          data: error,
        }
        self.postMessage(err)
      }
    }
  }
)
