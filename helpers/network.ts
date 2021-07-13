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

const runAppropriateStrategy = (req: any) => {
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
  const response = new BehaviorSubject<HoppRESTResponse>({ type: "loading" })

  runAppropriateStrategy({
    url: req.effectiveFinalURL,
  }).then((res: any) => {
    console.log(res)

    const resObj: HoppRESTResponse = {
      type: "success",
      statusCode: res.status,
      body: res.data,
      headers: Object.keys(res.headers).map((x) => ({
        key: x,
        value: res.headers[x],
      })),
      meta: {
        // TODO: Implement
        responseSize: 0,
        responseDuration: 0,
      },
    }
    response.next(resObj)

    response.complete()
  })

  return response
}
