import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"

import { Service } from "dioc"
import type { RelayRequest } from "@hoppscotch/kernel"

import { Relay } from "~/kernel/relay"
import type {
  KernelInterceptor,
  ExecutionResult,
  KernelInterceptorError,
} from "~/services/kernel-interceptor.service"

import { getI18n } from "~/modules/i18n"
import { preProcessRelayRequest } from "~/helpers/functional/process-request"

import InterceptorsErrorPlaceholder from "~/components/interceptors/ErrorPlaceholder.vue"

/**
 * Detects if an error is likely a CORS error
 * CORS errors typically:
 * - Have messages like "Failed to fetch", "NetworkError", or mention CORS
 * - Are TypeError instances (in browsers)
 * - Don't have a response (error.response is undefined for axios errors)
 */
function isCorsError(error: any): boolean {
  const message = error?.message || ""
  const lowerMessage = message.toLowerCase()

  // Check for common CORS error patterns
  return (
    error?.kind === "network" &&
    (lowerMessage.includes("failed to fetch") ||
      lowerMessage.includes("cors") ||
      lowerMessage.includes("cross-origin") ||
      lowerMessage.includes("access to fetch") ||
      lowerMessage.includes("networkerror") ||
      // CORS errors in browsers typically show as TypeError with no response
      (error?.cause?.name === "TypeError" && !error?.cause?.response) ||
      // Check if error message is empty or generic, which often happens with CORS
      lowerMessage === "" ||
      lowerMessage === "network error" ||
      // Axios errors without a response often indicate CORS
      (error?.cause?.code === "ERR_NETWORK" && !error?.cause?.response))
  )
}

export class BrowserKernelInterceptorService
  extends Service
  implements KernelInterceptor
{
  public static readonly ID = "BROWSER_KERNEL_INTERCEPTOR_SERVICE"

  public readonly id = "browser"
  public readonly name = (t: ReturnType<typeof getI18n>) =>
    t("interceptor.browser.name")
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
    content: new Set([
      "text",
      "json",
      "xml",
      "form",
      "multipart",
      "urlencoded",
    ]),
    auth: new Set(["basic", "bearer", "apikey"]),
    security: new Set([]),
    proxy: new Set([]),
    advanced: new Set([]),
  } as const

  public execute(
    request: RelayRequest
  ): ExecutionResult<KernelInterceptorError> {
    const processedRequest = preProcessRelayRequest(request)
    const relayExecution = Relay.execute(processedRequest)

    const response = pipe(relayExecution.response, (promise) =>
      promise.then((either) =>
        pipe(
          either,
          E.mapLeft((error): KernelInterceptorError => {
            // Check if this is a CORS error for network errors
            const isCors = isCorsError(error)

            const humanMessage = {
              heading: (t: ReturnType<typeof getI18n>) => {
                // Special case: CORS errors should show CORS-specific heading
                if (isCors) {
                  return t("error.cors.heading")
                }

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
                // Special case: CORS errors should show CORS-specific description
                if (isCors) {
                  return [
                    t("error.cors.description"),
                    "",
                    t("error.cors.explanation"),
                    "",
                    t("error.cors.solutions.heading"),
                    `• ${t("error.cors.solutions.option1")}`,
                    `• ${t("error.cors.solutions.option2")}`,
                    `• ${t("error.cors.solutions.option3")}`,
                    `• ${t("error.cors.solutions.option4")}`,
                  ].join("\n")
                }

                switch (error.kind) {
                  case "network":
                    return t("error.network.description", {
                      message: error.message,
                      cause: error.cause ?? t("error.unknown.cause"),
                    })
                  case "timeout":
                    return t("error.timeout.description", {
                      message: error.message,
                      phase: error.phase ?? t("error.unknown.phase"),
                    })
                  case "certificate":
                    return t("error.certificate.description", {
                      message: error.message,
                      cause: error.cause ?? t("error.unknown.cause"),
                    })
                  case "auth":
                    return t("error.auth.description", {
                      message: error.message,
                      cause: error.cause ?? t("error.unknown.cause"),
                    })
                  case "proxy":
                    return t("error.proxy.description", {
                      message: error.message,
                      cause: error.cause ?? t("error.unknown.cause"),
                    })
                  case "parse":
                    return t("error.parse.description", {
                      message: error.message,
                      cause: error.cause ?? t("error.unknown.cause"),
                    })
                  case "version":
                    return t("error.version.description", {
                      message: error.message,
                      cause: error.cause ?? t("error.unknown.cause"),
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
            return {
              humanMessage,
              error,
              component: InterceptorsErrorPlaceholder,
            }
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
