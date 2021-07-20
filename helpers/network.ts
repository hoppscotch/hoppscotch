import { AxiosRequestConfig } from "axios"
import { BehaviorSubject, Observable } from "rxjs"
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
 * @returns {"normal" | "extension" | "proxy"}
 */
export function getCurrentStrategyID() {
  if (isExtensionsAllowed() && hasExtensionInstalled()) {
    return "extension"
  } else if (settingsStore.value.PROXY_ENABLED) {
    return "proxy"
  } else {
    return "normal"
  }
}

export const sendNetworkRequest = (req: any) =>
  runAppropriateStrategy(req).finally(() => window.$nuxt.$loading.finish())

export function createRESTNetworkRequestStream(
  req: EffectiveHoppRESTRequest
): Observable<HoppRESTResponse> {
  const response = new BehaviorSubject<HoppRESTResponse>({
    type: "loading",
    req,
  })

  const headers = req.effectiveFinalHeaders.reduce((acc, { key, value }) => {
    return Object.assign(acc, { [key]: value })
  }, {})

  const params = req.effectiveFinalParams.reduce((acc, { key, value }) => {
    return Object.assign(acc, { [key]: value })
  }, {})

  const timeStart = Date.now()

  runAppropriateStrategy({
    method: req.method as any,
    url: req.effectiveFinalURL,
    headers,
    params,
  })
    .then((res: any) => {
      const timeEnd = Date.now()

      const contentLength = res.headers["content-length"]
        ? parseInt(res.headers["content-length"])
        : (res.data as ArrayBuffer).byteLength

      const resObj: HoppRESTResponse = {
        type: "success",
        statusCode: res.status,
        body: res.data,
        headers: Object.keys(res.headers).map((x) => ({
          key: x,
          value: res.headers[x],
        })),
        meta: {
          responseSize: contentLength,
          responseDuration: timeEnd - timeStart,
        },
        req,
      }
      response.next(resObj)

      response.complete()
    })
    .catch((err) => {
      if (err.response) {
        const timeEnd = Date.now()

        const contentLength = err.response.headers["content-length"]
          ? parseInt(err.response.headers["content-length"])
          : (err.response.data as ArrayBuffer).byteLength

        const resObj: HoppRESTResponse = {
          type: "fail",
          body: err.response.data,
          headers: Object.keys(err.response.headers).map((x) => ({
            key: x,
            value: err.response.headers[x],
          })),
          meta: {
            responseDuration: timeEnd - timeStart,
            responseSize: contentLength,
          },
          req,
          statusCode: err.response.status,
        }

        response.next(resObj)

        response.complete()
      } else {
        const resObj: HoppRESTResponse = {
          type: "network_fail",
          error: err,
          req,
        }

        response.next(resObj)

        response.complete()
      }
    })

  return response
}
