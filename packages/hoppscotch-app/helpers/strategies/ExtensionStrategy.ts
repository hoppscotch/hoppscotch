import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { NetworkResponse, NetworkStrategy } from "../network"

export const hasExtensionInstalled = () =>
  typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined"

export const hasChromeExtensionInstalled = () =>
  hasExtensionInstalled() &&
  /Chrome/i.test(navigator.userAgent) &&
  /Google/i.test(navigator.vendor)

export const hasFirefoxExtensionInstalled = () =>
  hasExtensionInstalled() && /Firefox/i.test(navigator.userAgent)

export const cancelRunningExtensionRequest = () => {
  if (
    hasExtensionInstalled() &&
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest
  ) {
    window.__POSTWOMAN_EXTENSION_HOOK__.cancelRunningRequest()
  }
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
