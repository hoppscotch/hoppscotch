import { Service } from "dioc"
import { markRaw } from "vue"
import {
  body,
  relayRequestToNativeAdapter,
  RelayRequest,
  RelayResponse,
  RelayCapabilities,
} from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import axios, { CancelTokenSource } from "axios"
import {
  postProcessRelayRequest,
  preProcessRelayRequest,
} from "~/helpers/functional/process-request"
import type { getI18n } from "~/modules/i18n"
import {
  KernelInterceptor,
  KernelInterceptorError,
  ExecutionResult,
} from "~/services/kernel-interceptor.service"
import { KernelInterceptorAgentStore } from "./store"
import SettingsAgent from "~/components/settings/Agent.vue"
import SettingsAgentSubtitle from "~/components/settings/AgentSubtitle.vue"
import InterceptorsErrorPlaceholder from "~/components/settings/InterceptorErrorPlaceholder.vue"
import { CookieJarService } from "~/services/cookie-jar.service"

export class AgentKernelInterceptorService
  extends Service
  implements KernelInterceptor
{
  public static readonly ID = "AGENT_KERNEL_INTERCEPTOR_SERVICE"

  private store = this.bind(KernelInterceptorAgentStore)
  private readonly cookieJar = this.bind(CookieJarService)

  public readonly id = "agent"
  public readonly name = (t: ReturnType<typeof getI18n>) =>
    t("interceptor.agent.name")
  public readonly settingsEntry = markRaw({
    title: (t: ReturnType<typeof getI18n>) =>
      t("interceptor.agent.settings_title"),
    component: SettingsAgent,
  })
  public readonly subtitle = markRaw(SettingsAgentSubtitle)
  public selectable = { type: "selectable" as const }
  public readonly capabilities: RelayCapabilities = {
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
    auth: new Set(["basic", "bearer", "apikey", "digest", "aws", "hawk"]),
    security: new Set([
      "clientcertificates",
      "cacertificates",
      "certificatevalidation",
      "hostverification",
      "peerverification",
    ]),
    proxy: new Set(["http", "https", "authentication", "certificates"]),
    advanced: new Set(["redirects", "cookies", "localaccess"]),
  } as const

  public execute(request: RelayRequest): ExecutionResult {
    const reqID = Date.now()
    const cancelToken = axios.CancelToken.source()

    return {
      cancel: async () => {
        cancelToken.cancel()
        await this.store.cancelRequest(reqID)
      },
      response: pipe(
        this.executeRequest(request, reqID, cancelToken),
        (promise) =>
          promise.then((either) =>
            pipe(
              either,
              E.mapLeft((error): KernelInterceptorError => {
                if (error === "cancellation") return "cancellation"

                return {
                  humanMessage: {
                    heading: (t) => t("error.network_fail"),
                    description: (t) => t("helpers.network_fail"),
                  },
                  error,
                  component: InterceptorsErrorPlaceholder,
                }
              })
            )
          )
      ),
    }
  }

  private async executeRequest(
    request: RelayRequest,
    reqID: number,
    cancelToken: CancelTokenSource
  ): Promise<E.Either<"cancellation" | Error, RelayResponse>> {
    try {
      await this.store.checkAgentStatus()

      if (!this.store.isAgentRunning.value || !this.store.isAuthKeyPresent()) {
        throw new Error("Agent not running")
      }

      const effectiveRequest = this.store.completeRequest(
        preProcessRelayRequest(request)
      )

      // A caller opts a request out of the shared cookie jar by setting
      // `meta.options.cookies` to false. The desktop auth module sets it
      // on its own bearer-authenticated backend calls so the interceptor
      // skips both attaching a captured auth cookie to them and capturing
      // one from their responses. Without that, a stale or blank
      // `access_token` cookie was read in preference to the bearer token
      // and desktop login stalled. Read from the original request because
      // `completeRequest` rebuilds `meta` from domain settings.
      const useCookieJar = request.meta?.options?.cookies !== false

      if (useCookieJar) {
        await this.cookieJar.applyCookiesToRequest(effectiveRequest)
      }

      const existingUserAgentHeader = Object.keys(
        effectiveRequest.headers || {}
      ).find((header) => header.toLowerCase() === "user-agent")

      // A temporary workaround to add a User-Agent header to the request
      // This will be removed once the agent is updated to add User-Agent header by default
      const effectiveRequestWithUserAgent = {
        ...effectiveRequest,
        headers: {
          ...effectiveRequest.headers,
          "User-Agent": existingUserAgentHeader
            ? effectiveRequest.headers[existingUserAgentHeader]
            : "HoppscotchKernel/0.2.0",
        },
      }

      const nativeRequest = await relayRequestToNativeAdapter(
        effectiveRequestWithUserAgent
      )
      const postProcessedRequest = postProcessRelayRequest(nativeRequest)

      const [nonceB16, encryptedReq] = await this.store.encryptRequest(
        postProcessedRequest,
        reqID
      )

      const response = await axios.post(
        "http://localhost:9119/execute",
        encryptedReq,
        {
          headers: {
            Authorization: `Bearer ${this.store.authKey.value}`,
            "X-Hopp-Nonce": nonceB16,
            "Content-Type": "application/octet-stream",
          },
          cancelToken: cancelToken.token,
          responseType: "arraybuffer",
        }
      )

      const responseNonceB16 = response.headers["x-hopp-nonce"]
      const decryptedResponse = await this.store.decryptResponse(
        responseNonceB16,
        response.data
      )

      const transformedBody = body.body(
        decryptedResponse.body.body,
        decryptedResponse.body.mediaType
      )

      // Process Set-Cookie headers for multiHeaders support
      const multiHeaders: Array<{ key: string; value: string }> = []
      if (decryptedResponse.headers) {
        for (const [key, value] of Object.entries(decryptedResponse.headers)) {
          if (key.toLowerCase() === "set-cookie") {
            // Split concatenated Set-Cookie headers
            const cookieStrings = value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
            for (const cookieString of cookieStrings) {
              multiHeaders.push({ key: "Set-Cookie", value: cookieString })
            }
          } else {
            multiHeaders.push({ key, value })
          }
        }
      }

      const transformedResponse = {
        ...decryptedResponse,
        body: { ...transformedBody },
        multiHeaders: multiHeaders.length > 0 ? multiHeaders : undefined,
      }

      if (useCookieJar) {
        await this.cookieJar.captureResponseCookies(
          transformedResponse,
          effectiveRequest.url
        )
      }

      return E.right(transformedResponse)
    } catch (e) {
      if (axios.isCancel(e)) {
        return E.left("cancellation")
      }

      return E.left(e instanceof Error ? e : new Error("Unknown error"))
    }
  }
}
