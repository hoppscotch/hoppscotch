import { computed, markRaw } from "vue"
import { Service } from "dioc"
import type { RelayRequest, RelayResponse } from "@hoppscotch/kernel"
import { body } from "@hoppscotch/kernel"
import SettingsExtension from "~/components/settings/Extension.vue"
import SettingsExtensionSubtitle from "~/components/settings/ExtensionSubtitle.vue"
import { KernelInterceptorExtensionStore } from "./store"
import type {
  KernelInterceptor,
  ExecutionResult,
  KernelInterceptorError,
} from "~/services/kernel-interceptor.service"
import * as E from "fp-ts/Either"
import { getI18n } from "~/modules/i18n"
import { until } from "@vueuse/core"
import { preProcessRelayRequest } from "~/helpers/functional/preprocess"
import { browserIsChrome, browserIsFirefox } from "~/helpers/utils/userAgent"

export const cancelRunningExtensionRequest = async () => {
  window.__POSTWOMAN_EXTENSION_HOOK__?.cancelRequest()
}

export class ExtensionKernelInterceptorService
  extends Service
  implements KernelInterceptor
{
  public static readonly ID = "KERNEL_EXTENSION_INTERCEPTOR_SERVICE"
  private readonly store = this.bind(KernelInterceptorExtensionStore)

  public readonly id = "extension"
  public readonly name = (t: ReturnType<typeof getI18n>) => {
    const version = this.extensionVersion.value

    if (this.extensionStatus.value === "available" && version) {
      return `${t("settings.extensions")}: v${version.major}.${version.minor}`
    }
    return `${t("settings.extensions")}: ${t("settings.extension_ver_not_reported")}`
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

  public readonly settingsEntry = markRaw({
    title: (t: ReturnType<typeof getI18n>) => t("settings.extensions"),
    component: SettingsExtension,
  })

  public readonly subtitle = markRaw(SettingsExtensionSubtitle)

  public readonly extensionStatus = computed(
    () => this.store.getSettings().status
  )

  public readonly extensionVersion = computed(
    () => this.store.getSettings().extensionVersion
  )

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

  private async executeExtensionRequest(
    request: RelayRequest
  ): Promise<E.Either<KernelInterceptorError, RelayResponse>> {
    await until(() => this.store.getSettings().status).not.toBe("waiting")

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
      const extensionResponse =
        await window.__POSTWOMAN_EXTENSION_HOOK__.sendRequest({
          url: request.url,
          method: request.method,
          headers: request.headers,
          data: request.content?.content,
          wantsBinary: true,
        })

      return E.right({
        status: extensionResponse.status,
        statusText: extensionResponse.statusText,
        headers: extensionResponse.headers,
        body: body.body(
          extensionResponse.data,
          extensionResponse.headers["content-type"]
        ),
      })
    } catch (e) {
      console.error(e)

      if (e instanceof Error && "response" in e) {
        const response = (e as any).response
        if (response) {
          return E.right({
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: body.body(response.data, response.headers["content-type"]),
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
    const extensionExecution = {
      cancel: async () => {
        window.__POSTWOMAN_EXTENSION_HOOK__?.cancelRequest()
      },
      response: this.executeExtensionRequest(preProcessRelayRequest(request)),
    }

    return extensionExecution
  }
}
