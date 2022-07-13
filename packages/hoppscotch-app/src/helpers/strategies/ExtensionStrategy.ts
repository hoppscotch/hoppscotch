import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { AxiosRequestConfig } from "axios"
import cloneDeep from "lodash/cloneDeep"
import { NetworkResponse, NetworkStrategy } from "../network"
import { browserIsChrome, browserIsFirefox } from "../utils/userAgent"

export const hasExtensionInstalled = () =>
  typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined"

export const hasChromeExtensionInstalled = () =>
  hasExtensionInstalled() && browserIsChrome()

export const hasFirefoxExtensionInstalled = () =>
  hasExtensionInstalled() && browserIsFirefox()

export const cancelRunningExtensionRequest = () => {
  window.__POSTWOMAN_EXTENSION_HOOK__?.cancelRunningRequest()
}

export const defineSubscribableObject = <T extends object>(obj: T) => {
  const proxyObject = {
    ...obj,
    _subscribers: {} as {
      // eslint-disable-next-line no-unused-vars
      [key in keyof T]?: ((...args: any[]) => any)[]
    },
    subscribe(prop: keyof T, func: (...args: any[]) => any): void {
      if (Array.isArray(this._subscribers[prop])) {
        this._subscribers[prop]?.push(func)
      } else {
        this._subscribers[prop] = [func]
      }
    },
  }

  type SubscribableProxyObject = typeof proxyObject

  return new Proxy(proxyObject, {
    set(obj, prop, newVal) {
      obj[prop as keyof SubscribableProxyObject] = newVal

      const currentSubscribers = obj._subscribers[prop as keyof T]

      if (Array.isArray(currentSubscribers)) {
        for (const subscriber of currentSubscribers) {
          subscriber(newVal)
        }
      }

      return true
    },
  })
}

const preProcessRequest = (req: AxiosRequestConfig): AxiosRequestConfig => {
  const reqClone = cloneDeep(req)

  // If the parameters are URLSearchParams, inject them to URL instead
  // This prevents marshalling issues with structured cloning of URLSearchParams
  if (reqClone.params instanceof URLSearchParams) {
    try {
      const url = new URL(reqClone.url ?? "")

      for (const [key, value] of reqClone.params.entries()) {
        url.searchParams.append(key, value)
      }

      reqClone.url = url.toString()
    } catch (e) {}

    reqClone.params = {}
  }

  return reqClone
}

const extensionStrategy: NetworkStrategy = (req) =>
  pipe(
    TE.Do,

    TE.bind("processedReq", () => TE.of(preProcessRequest(req))),

    // Storeing backup timing data in case the extension does not have that info
    TE.bind("backupTimeDataStart", () => TE.of(new Date().getTime())),

    // Run the request
    TE.bind("response", ({ processedReq }) =>
      pipe(
        window.__POSTWOMAN_EXTENSION_HOOK__,
        O.fromNullable,
        TE.fromOption(() => "NO_PW_EXT_HOOK" as const),
        TE.chain((extensionHook) =>
          TE.tryCatch(
            () =>
              extensionHook.sendRequest({
                ...processedReq,
                wantsBinary: true,
              }),
            (err) => err as any
          )
        )
      )
    ),

    // Inject backup time data if not present
    TE.map(({ backupTimeDataStart, response }) => ({
      ...response,
      config: {
        timeData: {
          startTime: backupTimeDataStart,
          endTime: new Date().getTime(),
        },
        ...response.config,
      },
    })),
    TE.orElse((e) =>
      e !== "cancellation" && e.response
        ? TE.right(e.response as NetworkResponse)
        : TE.left(e)
    )
  )

export default extensionStrategy
