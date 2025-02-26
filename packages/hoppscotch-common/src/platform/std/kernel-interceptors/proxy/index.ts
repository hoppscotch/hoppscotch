import { markRaw } from "vue"
import type {
  FormDataValue,
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
import { pipe } from "fp-ts/function"
import { getI18n } from "~/modules/i18n"
import { v4 } from "uuid"
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
    let wantsBinary = false
    let requestData = ""
    if (request.content) {
      if (request.content.kind === "text" || request.content.kind === "xml") {
        requestData = request.content.content
      } else if (request.content.kind === "json") {
        requestData = JSON.stringify(request.content.content)
      } else if (
        request.content.kind === "multipart" ||
        request.content.kind === "form"
      ) {
        wantsBinary = true
        const formData = new FormData()
        request.content.content.forEach(
          (values: FormDataValue[], key: string) => {
            values.forEach((value: FormDataValue) => {
              if (value.kind === "text") {
                formData.append(key, value.value)
              } else {
                const blob = new Blob([value.data], { type: value.contentType })
                formData.append(key, blob, value.filename)
              }
            })
          }
        )
        requestData = formData.toString()
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

  public execute(req: RelayRequest): ExecutionResult<KernelInterceptorError> {
    const settings = this.store.getSettings()
    const accessToken = settings.accessToken
    const proxyUrl = settings.proxyUrl

    const proxyRequest = this.constructProxyRequest(req, accessToken)

    const content: ContentType = {
      kind: "json",
      content: proxyRequest,
      mediaType: MediaType.APPLICATION_JSON,
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
              "multipart-part-key": `proxyRequestData-${v4()}`,
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
          E.map((res) => {
            const proxyResponse =
              res.body.mediaType === MediaType.TEXT_PLAIN
                ? (JSON.parse(
                    new TextDecoder().decode(new Uint8Array(res.body.body))
                  ) as ProxyResponse)
                : null

            if (!proxyResponse?.success) {
              return E.left({
                kind: "network",
                message: "Proxy request failed",
              })
            }

            if (proxyResponse.isBinary) {
              const binaryData = decodeB64StringToArrayBuffer(
                proxyResponse.data
              )

              return E.right({
                ...res,
                content: {
                  kind: "binary",
                  content: new Uint8Array(binaryData),
                  mediaType:
                    proxyResponse.headers["content-type"] ||
                    "application/octet-stream",
                },
              })
            }

            return E.right({
              ...res,
              status: proxyResponse.status,
              statusText: proxyResponse.statusText,
              headers: proxyResponse.headers,
              body: {
                body: proxyResponse.data,
                mediaType: "text/plain",
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
