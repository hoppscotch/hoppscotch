import { Cookie, Environment, HoppRESTRequest } from "@hoppscotch/data"
import {
  RunPostRequestScriptOptions,
  RunPreRequestScriptOptions,
  SandboxPreRequestResult,
  SandboxTestResult,
  TestResult,
} from "@hoppscotch/js-sandbox"
import { runPreRequestScript, runTestScript } from "@hoppscotch/js-sandbox/web"
import * as E from "fp-ts/Either"

import { HoppRESTResponse } from "../types/HoppRESTResponse"

interface PreRequestMessage {
  type: "pre"
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
    temp: Environment["variables"]
  }
  request: string // JSON stringified request
  cookies: string | null // JSON stringified cookies subject to the feature flag
}

interface PostRequestMessage {
  type: "post"
  envs: TestResult["envs"]
  request: string // JSON stringified request
  response: HoppRESTResponse
  cookies: string | null // JSON stringified cookies subject to the feature flag
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
    const { type, envs, request, cookies } = event.data

    const parsedRequest = JSON.parse(request) as HoppRESTRequest

    const parsedRequestResult = HoppRESTRequest.safeParse(parsedRequest)

    const parsedCookies = cookies ? (JSON.parse(cookies) as Cookie[]) : null

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
        const preRequestScriptResult = await runPreRequestScript(
          parsedRequestResult.value.preRequestScript,
          {
            envs,
            request: parsedRequestResult.value,
            experimentalScriptingSandbox: true,
            cookies: parsedCookies as unknown as Cookie[],
          } satisfies RunPreRequestScriptOptions
        )
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
        const postRequestScriptResult = await runTestScript(
          parsedRequestResult.value.testScript,
          {
            envs,
            request: parsedRequestResult.value,
            response,
            experimentalScriptingSandbox: true,
            cookies: parsedCookies as unknown as Cookie[],
          } satisfies RunPostRequestScriptOptions
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
