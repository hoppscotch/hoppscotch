import { Cookie, Environment, HoppRESTRequest } from "@hoppscotch/data"
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
  // TODO: This can be removed in favour of the incoming request
  script: string
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  }
  request: string // JSON stringified request
  cookies?: string // JSON stringified cookies subject to the feature flag
}

interface PostRequestMessage {
  type: "post"
  // TODO: This can be removed in favour of the incoming request
  script: string
  envs: TestResult["envs"]
  request: string // JSON stringified request
  response: HoppRESTResponse
  cookies?: string // JSON stringified cookies subject to the feature flag
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
    const { type, script, envs, request, cookies } = event.data

    const parsedRequest = JSON.parse(request) as HoppRESTRequest

    const parsedRequestResult = HoppRESTRequest.safeParse(parsedRequest)

    const parsedCookies = cookies
      ? (JSON.parse(cookies) as Cookie[])
      : undefined

    if (type === "pre") {
      if (parsedRequestResult.type === "err") {
        const err: PreRequestScriptErrorMessage = {
          type: "PRE_REQUEST_SCRIPT_ERROR",
          data: parsedRequestResult.error,
        }
        self.postMessage(err)
        return
      }

      try {
        const preRequestScriptResult = await runPreRequestScript(script, {
          envs,
          request: parsedRequestResult.value,
          cookies: parsedCookies,
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
      if (parsedRequestResult.type === "err") {
        const err: PostRequestScriptErrorMessage = {
          type: "POST_REQUEST_SCRIPT_ERROR",
          data: parsedRequestResult.error,
        }
        self.postMessage(err)
        return
      }

      const { response } = event.data

      try {
        const postRequestScriptResult = await runTestScript(script, {
          envs,
          request,
          response,
          cookies: parsedCookies,
        })
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
