import { computed, markRaw, ref } from "vue"
import { Service } from "dioc"
import type { RelayRequest, RelayResponse } from "@hoppscotch/kernel"
import { body } from "@hoppscotch/kernel"
import SettingsExtension from "~/components/settings/Extension.vue"
import SettingsExtensionSubtitle from "~/components/settings/ExtensionSubtitle.vue"
import * as E from "fp-ts/Either"
import { getI18n } from "~/modules/i18n"
import { until } from "@vueuse/core"
import { preProcessRelayRequest } from "~/helpers/functional/process-request"
import { browserIsChrome, browserIsFirefox } from "~/helpers/utils/userAgent"
import type {
  KernelInterceptor,
  ExecutionResult,
  KernelInterceptorError,
} from "~/services/kernel-interceptor.service"

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

export type ExtensionStatus = "available" | "unknown-origin" | "waiting"

export const cancelRunningExtensionRequest = async () => {
  window.__POSTWOMAN_EXTENSION_HOOK__?.cancelRequest()
}

export class ExtensionKernelInterceptorService
  extends Service
  implements KernelInterceptor
{
  public static readonly ID = "KERNEL_EXTENSION_INTERCEPTOR_SERVICE"

  private _extensionStatus = ref<ExtensionStatus>("waiting")

  public readonly id = "extension"
  public readonly name = (t: ReturnType<typeof getI18n>) => {
    const version = this.extensionVersion.value

    if (this.extensionStatus.value === "available" && version) {
      return `${t("settings.extensions")}: v${version.major}.${version.minor}`
    }
    return `${t("settings.extensions")}`
  }

  public readonly selectable = { type: "selectable" as const }
  public readonly capabilities = {
    method: new Set([
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
    ]),
    header: new Set(["stringvalue", "arrayvalue", "multivalue"]),
    content: new Set([
      "text",
      "json",
      "xml",
      "form",
      "binary",
      "multipart",
      "urlencoded",
      "compression",
    ]),
    auth: new Set(["basic", "bearer", "apikey"]),
    security: new Set([
      "clientcertificates",
      "cacertificates",
      "certificatevalidation",
      "hostverification",
      "peerverification",
    ]),
    proxy: new Set(["http", "https", "authentication", "certificates"]),
    advanced: new Set(["localaccess"]),
  } as const

  public readonly extensionStatus = computed(() => this._extensionStatus.value)

  public readonly extensionVersion = computed(() => {
    if (this.extensionStatus.value === "available") {
      return window.__POSTWOMAN_EXTENSION_HOOK__?.getVersion() || null
    }
    return null
  })

  public readonly settingsEntry = markRaw({
    title: (t: ReturnType<typeof getI18n>) => t("settings.extensions"),
    component: SettingsExtension,
  })

  public readonly subtitle = markRaw(SettingsExtensionSubtitle)

  /**
   * Whether the extension is installed in Chrome or not.
   */
  public readonly chromeExtensionInstalled = computed(
    () => this.extensionStatus.value === "available" && browserIsChrome()
  )

  /**
   * Whether the extension is installed in Firefox or not.
   */
  public readonly firefoxExtensionInstalled = computed(
    () => this.extensionStatus.value === "available" && browserIsFirefox()
  )

  override async onServiceInit(): Promise<void> {
    this.setupExtensionStatusListener()
  }

  private setupExtensionStatusListener(): void {
    const extensionPollIntervalId = ref<ReturnType<typeof setInterval>>()

    if (window.__HOPP_EXTENSION_STATUS_PROXY__) {
      this._extensionStatus.value =
        window.__HOPP_EXTENSION_STATUS_PROXY__.status
      window.__HOPP_EXTENSION_STATUS_PROXY__.subscribe(
        "status",
        (status: ExtensionStatus) => {
          this._extensionStatus.value = status
        }
      )
    } else {
      const statusProxy = defineSubscribableObject({
        status: "waiting" as ExtensionStatus,
      })

      window.__HOPP_EXTENSION_STATUS_PROXY__ = statusProxy
      statusProxy.subscribe(
        "status",
        (status: ExtensionStatus) => (this._extensionStatus.value = status)
      )

      // Check if extension is already available
      if (this.tryDetectExtension()) {
        return
      }

      /**
       * Keeping identifying extension backward compatible
       * We are assuming the default version is 0.24 or later. So if the extension exists, its identified immediately,
       * then we use a poll to find the version, this will get the version for 0.24 and any other version
       * of the extension, but will have a slight lag.
       * 0.24 users will get the benefits of 0.24, while the extension won't break for the old users
       */
      extensionPollIntervalId.value = setInterval(() => {
        if (this.tryDetectExtension() && extensionPollIntervalId.value) {
          clearInterval(extensionPollIntervalId.value)
        }
      }, 2000)
    }
  }

  public tryDetectExtension(): boolean {
    if (typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined") {
      const version = window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()

      this._extensionStatus.value = "available"

      // When the version is not 0.24 or higher, the extension wont do this. so we have to do it manually
      if (
        version.major === 0 &&
        version.minor <= 23 &&
        window.__HOPP_EXTENSION_STATUS_PROXY__
      ) {
        window.__HOPP_EXTENSION_STATUS_PROXY__.status = "available"
      }
      return true
    }
    return false
  }

  private async executeExtensionRequest(
    request: RelayRequest
  ): Promise<E.Either<KernelInterceptorError, RelayResponse>> {
    // Wait for the extension to resolve (not waiting forever)
    await until(this.extensionStatus).toMatch(
      (status) => status !== "waiting",
      { timeout: 1000 }
    )

    if (!window.__POSTWOMAN_EXTENSION_HOOK__) {
      return E.left({
        humanMessage: {
          heading: (t) => t("error.extension_not_found"),
          description: (t) => t("error.network_fail"),
        },
        error: {
          kind: "extension",
          message: "Extension hook not found",
        },
      })
    }

    try {
      const startTime = Date.now()
      let requestData: any = null

      if (request.content) {
        switch (request.content.kind) {
          case "json":
            // For JSON, we need to stringify it before sending it to extension,
            // see extension source code for more info on this.
            // Also if it's already a string, we can use it as is, otherwise we stringify.
            requestData =
              typeof request.content.content === "string"
                ? request.content.content
                : JSON.stringify(request.content.content)
            break

          case "binary":
            if (
              request.content.content instanceof Blob ||
              request.content.content instanceof File
            ) {
              requestData = request.content.content
            } else if (typeof request.content.content === "string") {
              try {
                const base64 =
                  request.content.content.split(",")[1] ||
                  request.content.content
                const binaryString = window.atob(base64)
                const bytes = new Uint8Array(binaryString.length)
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i)
                }
                requestData = new Blob([bytes.buffer])
              } catch (e) {
                console.error("Error converting binary data:", e)
                requestData = request.content.content
              }
            } else {
              requestData = request.content.content
            }
            break

          default:
            requestData = request.content.content
        }
      }

      const extensionResponse =
        await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
          url: request.url,
          method: request.method,
          headers: request.headers ?? {},
          data: requestData,
          wantsBinary: true,
        })

      const endTime = Date.now()

      const headersSize = JSON.stringify(extensionResponse.headers).length
      const bodySize = extensionResponse.data?.byteLength || 0
      const totalSize = headersSize + bodySize

      const timingMeta = extensionResponse.timeData
        ? {
            start: extensionResponse.timeData.startTime,
            end: extensionResponse.timeData.endTime,
          }
        : {
            start: startTime,
            end: endTime,
          }

      return E.right({
        id: request.id,
        status: extensionResponse.status,
        statusText: extensionResponse.statusText,
        version: request.version,
        headers: extensionResponse.headers,
        body: body.body(
          extensionResponse.data,
          extensionResponse.headers["content-type"]
        ),
        meta: {
          timing: timingMeta,
          size: {
            headers: headersSize,
            body: bodySize,
            total: totalSize,
          },
        },
      })
    } catch (e) {
      console.error(e)

      if (e instanceof Error && "response" in e) {
        const response = (e as any).response
        if (response) {
          const headersSize = JSON.stringify(response.headers).length
          const bodySize = response.data?.byteLength || 0
          const totalSize = headersSize + bodySize

          const timingMeta = response.timeData
            ? {
                start: response.timeData.startTime,
                end: response.timeData.endTime,
              }
            : {
                // Fallback timing - at least show it took some time,
                // this is mainly for cross compat with other interceptor settings.
                start: Date.now() - 1,
                end: Date.now(),
              }

          return E.right({
            id: request.id,
            status: response.status,
            statusText: response.statusText,
            version: request.version,
            headers: response.headers,
            body: body.body(response.data, response.headers["content-type"]),
            meta: {
              timing: timingMeta,
              size: {
                headers: headersSize,
                body: bodySize,
                total: totalSize,
              },
            },
          })
        }
      }

      return E.left({
        humanMessage: {
          heading: (t) => t("error.extension.heading"),
          description: (t) => t("error.extension.description"),
        },
        error: {
          kind: "extension",
          message: e instanceof Error ? e.message : "Unknown error",
        },
      })
    }
  }

  public execute(
    request: RelayRequest
  ): ExecutionResult<KernelInterceptorError> {
    if (this._extensionStatus.value !== "available") {
      return {
        cancel: async () => {
          // Nothing to cancel if extension is not available
        },
        response: Promise.resolve(
          E.left({
            humanMessage: {
              heading: (t: ReturnType<typeof getI18n>) =>
                t("error.extension.heading"),
              description: (t: ReturnType<typeof getI18n>) =>
                t("error.extension.description"),
            },
            error: {
              kind: "extension",
              message: "Extension not available",
            },
          })
        ),
      }
    }

    const extensionExecution = {
      cancel: async () => {
        window.__POSTWOMAN_EXTENSION_HOOK__?.cancelRequest()
      },
      response: this.executeExtensionRequest(preProcessRelayRequest(request)),
    }

    return extensionExecution
  }
}
