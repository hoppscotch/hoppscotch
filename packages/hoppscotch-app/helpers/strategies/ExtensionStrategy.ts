import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { NetworkResponse, NetworkStrategy } from "../network"
import { browserIsChrome, browserIsFirefox } from "../utils/userAgent"

export const hasExtensionInstalled = () =>
  typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined"

export const hasChromeExtensionInstalled = () =>
  hasExtensionInstalled() && browserIsChrome()

export const hasFirefoxExtensionInstalled = () =>
  hasExtensionInstalled() && browserIsFirefox()

export const cancelRunningExtensionRequest = () => {
  if (
    hasExtensionInstalled() &&
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest
  ) {
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest()
  }
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

  type subscribableProxyObject = typeof proxyObject

  return new Proxy(proxyObject, {
    set(obj, prop, newVal) {
      obj[prop as keyof subscribableProxyObject] = newVal

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

const extensionStrategy: NetworkStrategy = (req) =>
  pipe(
    TE.Do,

    // Storeing backup timing data in case the extension does not have that info
    TE.bind("backupTimeDataStart", () => TE.of(new Date().getTime())),

    // Run the request
    TE.bind("response", () =>
      TE.tryCatch(
        () =>
          window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
            ...req,
            wantsBinary: true,
          }) as Promise<NetworkResponse>,
        (err) => err as any
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
