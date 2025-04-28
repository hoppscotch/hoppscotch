import { markRaw } from "vue"
import type {
  RelayRequest,
  ContentType,
  Method,
  Version,
} from "@hoppscotch/kernel"
import { MediaType } from "@hoppscotch/kernel"
import { Service } from "dioc"
import { Relay } from "~/kernel/relay"
import SettingsProxy from "~/components/settings/Proxy.vue"
import { KernelInterceptorProxyStore } from "./store"
import type {
  KernelInterceptor,
  ExecutionResult,
  KernelInterceptorError,
} from "~/services/kernel-interceptor.service"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { getI18n } from "~/modules/i18n"
import { v4 } from "uuid"

import { preProcessRelayRequest } from "~/helpers/functional/process-request"
import { parseBytesToJSON } from "~/helpers/functional/json"
import { decodeB64StringToArrayBuffer } from "~/helpers/utils/b64"

type ProxyRequest = {
  url: string
  method: string
  headers: Record<string, string>
  params: Record<string, string>
  data: string
  wantsBinary: boolean
  accessToken: string
  auth?: {
    username: string
    password: string
  }
}

type ProxyResponse = {
  success: boolean
  isBinary: boolean
  status: number
  data: string
  statusText: string
  headers: Record<string, string>
}

export class ProxyKernelInterceptorService
  extends Service
  implements KernelInterceptor
{
  public static readonly ID = "KERNEL_PROXY_INTERCEPTOR_SERVICE"
  private readonly store = this.bind(KernelInterceptorProxyStore)

  public readonly id = "proxy"
  public readonly name = (t: ReturnType<typeof getI18n>) =>
    t("interceptor.proxy.name")
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
    header: new Set(["stringvalue"]),
    content: new Set(["text"]),
    auth: new Set(["basic"]),
    security: new Set([]),
    proxy: new Set([]),
    advanced: new Set([]),
  } as const
  public readonly settingsEntry = markRaw({
    title: (t: ReturnType<typeof getI18n>) =>
      t("interceptor.proxy.settings_title"),
    component: SettingsProxy,
  })

  private constructProxyRequest(
    request: RelayRequest,
    accessToken: string
  ): ProxyRequest {
    // NOTE: This should be conditional but for now setting it to true for backwards compat,
    // see std/interceptor/proxy.ts for more info.
    const wantsBinary = true
    let requestData: any = null

    // This is required for backwards compatibility with current proxyscotch impl
    if (request.content) {
      switch (request.content.kind) {
        case "json":
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
            // This is rather rare but just in case
            try {
              const base64 =
                request.content.content.split(",")[1] || request.content.content
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

        case "multipart":
          // `multipart` has separate handling in `execute`,
          // where we combine request with request body
          // so removing that part right now
          requestData = ""
          break

        default:
          requestData = request.content.content
      }
    }

    return {
      accessToken,
      wantsBinary,
      url: request.url,
      method: request.method,
      headers: request.headers,
      params: request.params,
      data: requestData,
      auth:
        request.auth?.kind === "basic"
          ? {
              username: request.auth.username,
              password: request.auth.password,
            }
          : undefined,
    }
  }

  public execute(
    request: RelayRequest
  ): ExecutionResult<KernelInterceptorError> {
    const settings = this.store.getSettings()
    const accessToken = settings.accessToken
    const proxyUrl = settings.proxyUrl

    const processedRequest = preProcessRelayRequest(request)

    let content: ContentType
    const multipartKey = `proxyRequestData-${v4()}`

    if (
      processedRequest.content &&
      processedRequest.content.kind === "multipart" &&
      processedRequest.content.content instanceof FormData
    ) {
      const modifiedRequest = { ...processedRequest }

      const proxyRequest = this.constructProxyRequest(
        modifiedRequest,
        accessToken
      )

      const formData = processedRequest.content.content as FormData
      const newFormData = new FormData()

      // @ts-expect-error: `formData.entries` does exist but isn't visible,
      // see `"lib": ["ESNext", "DOM"],` in `tsconfig.json`
      for (const [key, value] of formData.entries()) {
        newFormData.append(key, value)
      }

      const proxyRequestString = JSON.stringify(proxyRequest)
      newFormData.append(multipartKey, proxyRequestString)

      content = {
        kind: "multipart",
        content: newFormData,
        mediaType: MediaType.MULTIPART_FORM_DATA,
      }
    } else {
      const proxyRequest = this.constructProxyRequest(
        processedRequest,
        accessToken
      )

      content = {
        kind: "json",
        content: proxyRequest,
        mediaType: MediaType.APPLICATION_JSON,
      }
    }

    const proxyRelayRequest: RelayRequest = {
      id: Date.now(),
      url: proxyUrl,
      method: "POST" as Method,
      version: "HTTP/1.1" as Version,
      headers: {
        "content-type": content.mediaType,
        ...(content.kind === "multipart"
          ? {
              "multipart-part-key": multipartKey,
            }
          : {}),
      },
      content,
    }

    const relayExecution = Relay.execute(proxyRelayRequest)

    const response = pipe(relayExecution.response, (promise) =>
      promise.then((either) =>
        pipe(
          either,
          E.mapLeft((error): KernelInterceptorError => {
            const humanMessage = {
              heading: (t: ReturnType<typeof getI18n>) => {
                switch (error.kind) {
                  case "network":
                    return t("error.network.heading")
                  case "timeout":
                    return t("error.timeout.heading")
                  case "certificate":
                    return t("error.certificate.heading")
                  case "auth":
                    return t("error.auth.heading")
                  case "proxy":
                    return t("error.proxy.heading")
                  case "parse":
                    return t("error.parse.heading")
                  case "version":
                    return t("error.version.heading")
                  case "abort":
                    return t("error.aborted.heading")
                  default:
                    return t("error.unknown.heading")
                }
              },
              description: (t: ReturnType<typeof getI18n>) => {
                switch (error.kind) {
                  case "network":
                    return t("error.network.description", {
                      message: error.message,
                    })
                  case "timeout":
                    return t("error.timeout.description", {
                      phase: error.phase ?? t("error.unknown.phase"),
                    })
                  case "certificate":
                    return t("error.certificate.description", {
                      message: error.message,
                    })
                  case "auth":
                    return t("error.auth.description", {
                      message: error.message,
                    })
                  case "proxy":
                    return t("error.proxy.description", {
                      message: error.message,
                    })
                  case "parse":
                    return t("error.parse.description", {
                      message: error.message,
                    })
                  case "version":
                    return t("error.version.description", {
                      message: error.message,
                    })
                  case "abort":
                    return t("error.aborted.description", {
                      message: error.message,
                    })
                  default:
                    return t("error.unknown.description")
                }
              },
            }
            return { humanMessage, error }
          }),
          E.chain((res) => {
            const proxyResponse = parseBytesToJSON<ProxyResponse>(res.body.body)

            if (O.isNone(proxyResponse)) {
              return E.left({
                humanMessage: {
                  heading: (t) => t("error.network.heading"),
                  description: (t) =>
                    t("error.network.description", {
                      message: "Proxy request failed",
                      cause: "Proxy server may be unresponsive",
                    }),
                },
                error: {
                  kind: "network",
                  message: "Proxy request failed",
                },
              })
            }

            const parsedProxyResponse = proxyResponse.value

            if (!parsedProxyResponse?.success) {
              return E.left({
                humanMessage: {
                  heading: (t) => t("error.network.heading"),
                  description: (t) =>
                    t("error.network.description", {
                      message: "Proxy request failed",
                      cause: "Proxy server may be unresponsive",
                    }),
                },
                error: {
                  kind: "network",
                  message: "Proxy request failed",
                },
              })
            }

            // NOTE: This should be conditional but seems to be hit always,
            // see std/interceptor/proxy.ts for more info. Also see the above similar note.
            if (parsedProxyResponse.isBinary) {
              const decodedData = new Uint8Array(
                decodeB64StringToArrayBuffer(parsedProxyResponse.data)
              )

              // NOTE: This is also for backwards compat,
              // better solution would be to ask for raw bytes from proxyscotch.
              const jsonResult = parseBytesToJSON(decodedData)

              if (O.isSome(jsonResult)) {
                return E.right({
                  ...res,
                  status: parsedProxyResponse.status,
                  statusText: parsedProxyResponse.statusText,
                  headers: parsedProxyResponse.headers,
                  body: {
                    body: new TextEncoder().encode(
                      JSON.stringify(jsonResult.value)
                    ),
                    mediaType: "application/json",
                  },
                })
              }
              return E.right({
                ...res,
                status: parsedProxyResponse.status,
                statusText: parsedProxyResponse.statusText,
                headers: parsedProxyResponse.headers,
                body: {
                  body: decodedData,
                  mediaType:
                    parsedProxyResponse.headers["content-type"] ||
                    "application/octet-stream",
                },
              })
            }

            return E.right({
              ...res,
              status: parsedProxyResponse.status,
              statusText: parsedProxyResponse.statusText,
              headers: parsedProxyResponse.headers,
              body: {
                body: new TextEncoder().encode(parsedProxyResponse.data),
                mediaType:
                  parsedProxyResponse.headers["content-type"] || "text/plain",
              },
            })
          })
        )
      )
    )

    return {
      cancel: relayExecution.cancel,
      response,
    }
  }
}
