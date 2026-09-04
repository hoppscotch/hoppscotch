import type { VersionedAPI } from "@type/versioning"
import {
  type RelayV1,
  type RelayRequest,
  type RelayRequestEvents,
  type RelayEventEmitter,
  type RelayResponse,
  type RelayError,
  body,
  relayRequestToNativeAdapter,
} from "@relay/v/1"
import * as E from "fp-ts/Either"

import {
  execute,
  cancel,
  type Request as _Request,
  type RequestResult,
} from "@hoppscotch/plugin-relay"

// Native execute and cancel use separate Tauri IPC calls. The cancel IPC can
// reach Rust before execute registers the request, so retry that one transient
// error for roughly half a second. All other cancellation failures remain
// immediate.
const CANCEL_REGISTRATION_RETRY_ATTEMPTS = 20
const CANCEL_REGISTRATION_RETRY_DELAY_MS = 25

const isRequestRegistrationPendingError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("Request not found")
}

const cancelNativeRequest = async (
  requestID: number,
  isExecutionSettled: () => boolean
): Promise<void> => {
  for (
    let attempt = 0;
    attempt < CANCEL_REGISTRATION_RETRY_ATTEMPTS;
    attempt++
  ) {
    try {
      await cancel(requestID)
      return
    } catch (error) {
      if (isRequestRegistrationPendingError(error) && isExecutionSettled()) {
        return
      }

      const shouldRetry =
        isRequestRegistrationPendingError(error) &&
        attempt < CANCEL_REGISTRATION_RETRY_ATTEMPTS - 1

      if (!shouldRetry) throw error

      await new Promise<void>((resolve) =>
        setTimeout(resolve, CANCEL_REGISTRATION_RETRY_DELAY_MS)
      )
    }
  }
}

export const implementation: VersionedAPI<RelayV1> = {
  version: { major: 1, minor: 0, patch: 0 },
  api: {
    id: "desktop",
    capabilities: {
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
        "stream",
        "compression",
      ]),
      auth: new Set(["basic", "bearer", "digest", "oauth2", "apikey"]),
      security: new Set([
        "clientcertificates",
        "cacertificates",
        "certificatevalidation",
        "hostverification",
        "peerverification",
      ]),
      proxy: new Set(["http", "https", "authentication", "certificates"]),
      advanced: new Set([
        "retry",
        "redirects",
        "timeout",
        "cookies",
        "keepalive",
        "tcpoptions",
        "http2",
        "http3",
      ]),
    },

    canHandle(request: RelayRequest) {
      if (!this.capabilities.method.has(request.method)) {
        return E.left({
          kind: "unsupported_feature",
          feature: "method",
          message: `Method ${request.method} is not supported`,
          relay: "desktop",
        })
      }

      if (
        request.content &&
        !this.capabilities.content.has(request.content.kind)
      ) {
        return E.left({
          kind: "unsupported_feature",
          feature: "content",
          message: `Content type ${request.content.kind} is not supported`,
          relay: "desktop",
        })
      }

      if (request.auth && !this.capabilities.auth.has(request.auth.kind)) {
        return E.left({
          kind: "unsupported_feature",
          feature: "authentication",
          message: `Authentication type ${request.auth.kind} is not supported`,
          relay: "desktop",
        })
      }

      if (
        request.security?.certificates &&
        !this.capabilities.security.has("clientcertificates")
      ) {
        return E.left({
          kind: "unsupported_feature",
          feature: "security",
          message: "Client certificates are not supported",
          relay: "desktop",
        })
      }

      if (
        request.proxy &&
        !this.capabilities.proxy.has(
          request.proxy.url.startsWith("https") ? "https" : "http"
        )
      ) {
        return E.left({
          kind: "unsupported_feature",
          feature: "proxy",
          message: `Proxy protocol ${request.proxy.url.split(":")[0]} is not supported`,
          relay: "desktop",
        })
      }

      return E.right(true)
    },

    execute(request: RelayRequest) {
      const emitter: RelayEventEmitter<RelayRequestEvents> = {
        on: () => () => {},
        once: () => () => {},
        off: () => {},
      }
      let nativeExecutionStarted = false
      let nativeExecutionSettled = false
      let cancellationRequested = false
      let cancellationPromise: Promise<void> | null = null

      const cancelRequest = () => {
        cancellationRequested = true
        if (!nativeExecutionStarted) return Promise.resolve()

        cancellationPromise ??= cancelNativeRequest(
          request.id,
          () => nativeExecutionSettled
        )
        return cancellationPromise
      }

      const responsePromise = relayRequestToNativeAdapter(request)
        .then(async (request) => {
          // SAFETY: Type assertion is safe because:
          // 1. The capabilities system prevents requests with unsupported methods from reaching this point
          // 2. Content types not supported by the plugin are filtered by capabilities
          // 3. Authentication methods are validated through capabilities
          // 4. The plugin's Request type is a subset of our Request type
          const pluginRequest = {
            id: request.id,
            url: request.url,
            method: request.method,
            version: request.version,
            headers: request.headers,
            params: request.params,
            content: request.content,
            auth: request.auth,
            security: request.security,
            proxy: request.proxy,
            meta: request.meta,
          }

          const response = execute(pluginRequest).finally(() => {
            nativeExecutionSettled = true
          })
          nativeExecutionStarted = true
          if (cancellationRequested) await cancelRequest()
          return response
        })
        .then((result: RequestResult): E.Either<RelayError, RelayResponse> => {
          if (result.kind === "success") {
            const response: RelayResponse = {
              id: result.response.id,
              status: result.response.status,
              statusText: result.response.statusText,
              version: result.response.version,
              headers: result.response.headers,
              cookies: result.response.cookies,
              body: body.body(
                result.response.body.body,
                result.response.body.mediaType
              ),
              meta: {
                timing: {
                  start: result.response.meta.timing.start,
                  end: result.response.meta.timing.end,
                },
                size: result.response.meta.size,
              },
            }
            return E.right(response)
          }
          return E.left(result.error)
        })
        .catch((error: unknown): E.Either<RelayError, RelayResponse> => {
          const networkError: RelayError = {
            kind: "network",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
            cause: error,
          }
          return E.left(networkError)
        })

      return {
        cancel: cancelRequest,
        emitter,
        response: responsePromise,
      }
    },
  },
}
