import * as TE from "fp-ts/TaskEither"
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
  if (
    hasExtensionInstalled() &&
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest
  ) {
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest()
  }
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
      TE.tryCatch(
        () =>
          window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
            ...processedReq,
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
