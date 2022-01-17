import { AxiosResponse, AxiosRequestConfig } from "axios"
import { BehaviorSubject, Observable } from "rxjs"
import cloneDeep from "lodash/cloneDeep"
import * as T from "fp-ts/Task"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import AxiosStrategy, {
  cancelRunningAxiosRequest,
} from "./strategies/AxiosStrategy"
import ExtensionStrategy, {
  cancelRunningExtensionRequest,
  hasExtensionInstalled,
} from "./strategies/ExtensionStrategy"
import { HoppRESTResponse } from "./types/HoppRESTResponse"
import { EffectiveHoppRESTRequest } from "./utils/EffectiveURL"
import { settingsStore } from "~/newstore/settings"

export type NetworkResponse = AxiosResponse<any> & {
  config?: {
    timeData?: {
      startTime: number
      endTime: number
    }
  }
}

export type NetworkStrategy = (
  req: AxiosRequestConfig
) => TE.TaskEither<any, NetworkResponse>

export const cancelRunningRequest = () => {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    cancelRunningExtensionRequest()
  } else {
    cancelRunningAxiosRequest()
  }
}

const isExtensionsAllowed = () => settingsStore.value.EXTENSIONS_ENABLED

const runAppropriateStrategy = (req: AxiosRequestConfig) => {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    return ExtensionStrategy(req)
  }

  return AxiosStrategy(req)
}

/**
 * Returns an identifier for how a request will be ran
 * if the system is asked to fire a request
 *
 */
export function getCurrentStrategyID() {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    return "extension" as const
  } else if (settingsStore.value.PROXY_ENABLED) {
    return "proxy" as const
  } else {
    return "normal" as const
  }
}

export const sendNetworkRequest = (req: any) =>
  pipe(
    runAppropriateStrategy(req),
    TE.getOrElse((e) => {
      throw e
    })
  )()

const processResponse = (
  res: NetworkResponse,
  req: EffectiveHoppRESTRequest,
  backupTimeStart: number,
  backupTimeEnd: number,
  successState: HoppRESTResponse["type"]
) =>
  pipe(
    TE.Do,

    // Calculate the content length
    TE.bind("contentLength", () =>
      TE.of(
        res.headers["content-length"]
          ? parseInt(res.headers["content-length"])
          : (res.data as ArrayBuffer).byteLength
      )
    ),

    // Building the final response object
    TE.map(
      ({ contentLength }) =>
        <HoppRESTResponse>{
          type: successState,
          statusCode: res.status,
          body: res.data,
          headers: Object.keys(res.headers).map((x) => ({
            key: x,
            value: res.headers[x],
          })),
          meta: {
            responseSize: contentLength,
            responseDuration: backupTimeEnd - backupTimeStart,
          },
          req,
        }
    )
  )

export function createRESTNetworkRequestStream(
  request: EffectiveHoppRESTRequest
): Observable<HoppRESTResponse> {
  const response = new BehaviorSubject<HoppRESTResponse>({
    type: "loading",
    req: request,
  })

  pipe(
    TE.Do,

    // Get a deep clone of the request
    TE.bind("req", () => TE.of(cloneDeep(request))),

    // Assembling headers object
    TE.bind("headers", ({ req }) =>
      TE.of(
        req.effectiveFinalHeaders.reduce((acc, { key, value }) => {
          return Object.assign(acc, { [key]: value })
        }, {})
      )
    ),

    // Assembling params object
    TE.bind("params", ({ req }) =>
      TE.of(
        req.effectiveFinalParams.reduce((acc, { key, value }) => {
          return Object.assign(acc, { [key]: value })
        }, {})
      )
    ),

    // Keeping the backup start time
    TE.bind("backupTimeStart", () => TE.of(Date.now())),

    // Running the request and getting the response
    TE.bind("res", ({ req, headers, params }) =>
      runAppropriateStrategy({
        method: req.method as any,
        url: req.effectiveFinalURL.trim(),
        headers,
        params,
        data: req.effectiveFinalBody,
      })
    ),

    // Getting the backup end time
    TE.bind("backupTimeEnd", () => TE.of(Date.now())),

    // Assemble the final response object
    TE.chainW(({ req, res, backupTimeEnd, backupTimeStart }) =>
      processResponse(res, req, backupTimeStart, backupTimeEnd, "success")
    ),

    // Writing success state to the stream
    TE.chain((res) => {
      response.next(res)
      response.complete()

      return TE.of(res)
    }),

    // Package the error type
    TE.getOrElseW((e) => {
      const obj: HoppRESTResponse = {
        type: "network_fail",
        error: e,
        req: request,
      }

      response.next(obj)
      response.complete()

      return T.of(obj)
    })
  )()

  return response
}
