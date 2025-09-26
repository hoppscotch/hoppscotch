import type { VersionedAPI } from '@type/versioning'
import {
    type RelayV1,
    type RelayRequest,
    type RelayRequestEvents,
    type RelayEventEmitter,
    type RelayResponse,
    type RelayError,
    body,
    relayRequestToNativeAdapter,
} from '@relay/v/1'
import * as E from 'fp-ts/Either'

import {
    execute,
    cancel,
    type Request,
    type RequestResult
} from '@hoppscotch/plugin-relay'

// Extended type to represent the adapted request before narrowing to the plugin Request
// This mirrors RelayRequest.options so we can access it in a type-safe way.
interface AdaptedRequest extends Request {
  options?: {
    timeout?: number
    followRedirects?: boolean
    maxRedirects?: number
    decompress?: boolean
    cookies?: boolean
    keepAlive?: boolean
    tcpNoDelay?: boolean
    ipVersion?: 'v4' | 'v6' | 'any'
  }
}

// Local extension allowing follow_redirects which may not yet be in upstream Request typings
interface PluginRequestWithRedirect extends Request { follow_redirects?: boolean }

export const implementation: VersionedAPI<RelayV1> = {
    version: { major: 1, minor: 0, patch: 0 },
    api: {
        id: 'desktop',
        capabilities: {
            method: new Set([
                'GET',
                'POST',
                'PUT',
                'DELETE',
                'PATCH',
                'HEAD',
                'OPTIONS'
            ]),
            header: new Set([
                'stringvalue',
                'arrayvalue',
                'multivalue'
            ]),
            content: new Set([
                'text',
                'json',
                'xml',
                'form',
                'binary',
                'multipart',
                'urlencoded',
                'stream',
                'compression'
            ]),
            auth: new Set([
                'basic',
                'bearer',
                'digest',
                'oauth2',
                'apikey'
            ]),
            security: new Set([
                'clientcertificates',
                'cacertificates',
                'certificatevalidation',
                'hostverification',
                'peerverification'
            ]),
            proxy: new Set([
                'http',
                'https',
                'authentication',
                'certificates'
            ]),
            advanced: new Set([
                'retry',
                'redirects',
                'timeout',
                'cookies',
                'keepalive',
                'tcpoptions',
                'http2',
                'http3'
            ])
        },

        canHandle(request: RelayRequest) {
            if (!this.capabilities.method.has(request.method)) {
                return E.left({
                    kind: "unsupported_feature",
                    feature: "method",
                    message: `Method ${request.method} is not supported`,
                    relay: "desktop"
                })
            }

            if (request.content && !this.capabilities.content.has(request.content.kind)) {
                return E.left({
                    kind: "unsupported_feature",
                    feature: "content",
                    message: `Content type ${request.content.kind} is not supported`,
                    relay: "desktop"
                })
            }

            if (request.auth && !this.capabilities.auth.has(request.auth.kind)) {
                return E.left({
                    kind: "unsupported_feature",
                    feature: "authentication",
                    message: `Authentication type ${request.auth.kind} is not supported`,
                    relay: "desktop"
                })
            }

            if (request.security?.certificates && !this.capabilities.security.has('clientcertificates')) {
                return E.left({
                    kind: "unsupported_feature",
                    feature: "security",
                    message: "Client certificates are not supported",
                    relay: "desktop"
                })
            }

            if (request.proxy && !this.capabilities.proxy.has(request.proxy.url.startsWith('https') ? 'https' : 'http')) {
                return E.left({
                    kind: "unsupported_feature",
                    feature: "proxy",
                    message: `Proxy protocol ${request.proxy.url.split(':')[0]} is not supported`,
                    relay: "desktop"
                })
            }

            return E.right(true)
        },

        execute(request: RelayRequest) {
            const emitter: RelayEventEmitter<RelayRequestEvents> = {
                on: () => () => {},
                once: () => () => {},
                off: () => {}
            }

            const responsePromise = relayRequestToNativeAdapter(request)
              .then((adaptedRequest) => {
                const req = adaptedRequest as AdaptedRequest
                // Map the RelayRequest.options.followRedirects (if present) to the plugin's follow_redirects
                const pluginRequest: PluginRequestWithRedirect = {
                  id: req.id,
                  url: req.url,
                  method: req.method,
                  version: req.version,
                  headers: req.headers,
                  params: req.params,
                  content: req.content,
                  auth: req.auth,
                  security: req.security,
                  proxy: req.proxy,
                  follow_redirects: req.options?.followRedirects,
                }

                return execute(pluginRequest as Request)
              })
                .then((result: RequestResult): E.Either<RelayError, RelayResponse> => {
                    if (result.kind === 'success') {
                        const response: RelayResponse = {
                            id: result.response.id,
                            status: result.response.status,
                            statusText: result.response.statusText,
                            version: result.response.version,
                            headers: result.response.headers,
                            cookies: result.response.cookies,
                            body: body.body(result.response.body.body, result.response.body.mediaType),
                            meta: {
                                timing: {
                                    start: result.response.meta.timing.start,
                                    end: result.response.meta.timing.end,
                                },
                                size: result.response.meta.size,
                            }
                        }
                        return E.right(response)
                    }
                    return E.left(result.error)
                })
                .catch((error: unknown): E.Either<RelayError, RelayResponse> => {
                    const networkError: RelayError = {
                        kind: 'network',
                        message: error instanceof Error ? error.message : 'Unknown error occurred',
                        cause: error
                    }
                    return E.left(networkError)
                })

            return {
                cancel: async () => { await cancel(request.id) },
                emitter,
                response: responsePromise
            }
        }
    }
}
