import { Request, Response } from '@hoppscotch/plugin-relay'
import type { VersionedAPI } from '@type/versioning'

export type PluginRequest = Request
export type PluginResponse = Response

import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

export type Method =
    | "GET"        // Retrieve resource
    | "POST"       // Create resource
    | "PUT"        // Replace resource
    | "DELETE"     // Remove resource
    | "PATCH"      // Modify resource
    | "HEAD"       // GET without body
    | "OPTIONS"    // Get allowed methods
    | "CONNECT"    // Create tunnel
    | "TRACE"      // Loop-back test

export type Version = "HTTP/1.0" | "HTTP/1.1" | "HTTP/2.0" | "HTTP/3.0"

export type StatusCode =
    | 100  // Continue
    | 101  // Switching Protocols
    | 102  // Processing
    | 103  // Early Hints
    | 200  // OK
    | 201  // Created
    | 202  // Accepted
    | 203  // Non-Authoritative Info
    | 204  // No Content
    | 205  // Reset Content
    | 206  // Partial Content
    | 207  // Multi-Status
    | 208  // Already Reported
    | 226  // IM Used
    | 300  // Multiple Choices
    | 301  // Moved Permanently
    | 302  // Found
    | 303  // See Other
    | 304  // Not Modified
    | 305  // Use Proxy
    | 306  // Switch Proxy
    | 307  // Temporary Redirect
    | 308  // Permanent Redirect
    | 400  // Bad Request
    | 401  // Unauthorized
    | 402  // Payment Required
    | 403  // Forbidden
    | 404  // Not Found
    | 405  // Method Not Allowed
    | 406  // Not Acceptable
    | 407  // Proxy Auth Required
    | 408  // Request Timeout
    | 409  // Conflict
    | 410  // Gone
    | 411  // Length Required
    | 412  // Precondition Failed
    | 413  // Payload Too Large
    | 414  // URI Too Long
    | 415  // Unsupported Media
    | 416  // Range Not Satisfiable
    | 417  // Expectation Failed
    | 418  // I'm a teapot
    | 421  // Misdirected Request
    | 422  // Unprocessable Entity
    | 423  // Locked
    | 424  // Failed Dependency
    | 425  // Too Early
    | 426  // Upgrade Required
    | 428  // Precondition Required
    | 429  // Too Many Requests
    | 431  // Headers Too Large
    | 451  // Unavailable Legal
    | 500  // Server Error
    | 501  // Not Implemented
    | 502  // Bad Gateway
    | 503  // Service Unavailable
    | 504  // Gateway Timeout
    | 505  // HTTP Ver. Not Supported
    | 506  // Variant Negotiates
    | 507  // Insufficient Storage
    | 508  // Loop Detected
    | 510  // Not Extended
    | 511  // Network Auth Required

export type FormDataValue =
    | { kind: "text"; value: string }
    | { kind: "file"; filename: string; contentType: string; data: Uint8Array }

export enum MediaType {
    TEXT_PLAIN = "text/plain",
    TEXT_HTML = "text/html",
    TEXT_CSS = "text/css",
    TEXT_CSV = "text/csv",
    APPLICATION_JSON = "application/json",
    APPLICATION_LD_JSON = "application/ld+json",
    APPLICATION_XML = "application/xml",
    TEXT_XML = "text/xml",
    APPLICATION_FORM = "application/x-www-form-urlencoded",
    APPLICATION_OCTET = "application/octet-stream",
    MULTIPART_FORM = "multipart/form-data"
}

export type ContentType =
    | { kind: "text"; content: string; mediaType: MediaType | string }
    | { kind: "json"; content: unknown; mediaType: MediaType | string }
    | { kind: "xml"; content: string; mediaType: MediaType | string }
    | { kind: "form"; content: FormData; mediaType: MediaType | string }
    | { kind: "binary"; content: Uint8Array; mediaType: MediaType | string; filename?: string }
    | { kind: "multipart"; content: FormData; mediaType: MediaType | string }
    | { kind: "urlencoded"; content: string; mediaType: MediaType | string }
    | { kind: "stream"; content: ReadableStream; mediaType: MediaType | string }
    // TODO: Considering adding a "raw" kind for explicit pass-through content in the future,
    // not required at the moment tho, needs some plumbing on the relay side.
    // | { kind: "raw"; content: string; mediaType: MediaType | string }

export interface RelayResponseBody {
    body: Uint8Array
    mediaType: MediaType | string
}

export type AuthType =
    | { kind: "none" }
    | { kind: "basic"; username: string; password: string }
    | { kind: "bearer"; token: string }
    | {
        kind: "digest"
        username: string
        password: string
        realm?: string
        nonce?: string
        opaque?: string
        algorithm?: "MD5" | "SHA-256" | "SHA-512"
        qop?: "auth" | "auth-int"
        nc?: string
        cnonce?: string
    }
    | {
        kind: "oauth2"
        grantType:
        | {
            kind: "authorization_code"
            authEndpoint: string
            tokenEndpoint: string
            clientId: string
            clientSecret?: string
        }
        | {
            kind: "client_credentials"
            tokenEndpoint: string
            clientId: string
            clientSecret?: string
        }
        | {
            kind: "password"
            tokenEndpoint: string
            username: string
            password: string
        }
        | {
            kind: "implicit"
            authEndpoint: string
            clientId: string
        }
        accessToken?: string
        refreshToken?: string
    }
    | {
        kind: "apikey"
        key: string
        value: string
        in: "header" | "query"
    }
    | {
        kind: "aws"
        accessKey: string
        secretKey: string
        region: string
        service: string
        sessionToken?: string
        in: "header" | "query"
    }

export type CertificateType =
    | {
        kind: "pem"
        cert: Uint8Array
        key: Uint8Array
    }
    | {
        kind: "pfx"
        data: Uint8Array
        password: string
    }

export interface RelayRequestEvents {
    progress: {
        phase: 'upload' | 'download'
        loaded: number
        total?: number
    }
    stateChange: {
        state: 'preparing' | 'connecting' | 'sending' | 'waiting' | 'receiving' | 'done'
    }
    authChallenge: {
        type: 'basic' | 'digest' | 'oauth2'
        params: Record<string, string>
    }
    cookieReceived: {
        domain: string
        name: string
        value: string
        path?: string
        expires?: Date
        secure?: boolean
        httpOnly?: boolean
        sameSite?: 'Strict' | 'Lax' | 'None'
    }
    error: {
        phase: 'preparation' | 'connection' | 'request' | 'response'
        error: RelayError
    }
}

export type RelayEventEmitter<T> = {
    on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): () => void
    once<K extends keyof T>(event: K, handler: (payload: T[K]) => void): () => void
    off<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void
}

// NOTE: RelayCapabilities and their corresponding objects being two separate types
// even with sometimes identical contents is intentional.
export type MethodCapability =
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'PATCH'
    | 'HEAD'
    | 'OPTIONS'
    | 'CONNECT'
    | 'TRACE'

export type HeaderCapability =
    | 'stringvalue'
    | 'arrayvalue'
    | 'multivalue'

export type ContentCapability =
    | 'text'
    | 'json'
    | 'xml'
    | 'form'
    | 'binary'
    | 'multipart'
    | 'urlencoded'
    | 'stream'
    | 'compression'

export type AuthCapability =
    | 'none'
    | 'basic'
    | 'bearer'
    | 'digest'
    | 'oauth2'
    | 'apikey'
    | 'aws'
    | 'mtls'

export type SecurityCapability =
    | 'clientcertificates'
    | 'cacertificates'
    | 'certificatevalidation'
    | 'hostverification'
    | 'peerverification'

export type ProxyCapability =
    | 'http'
    | 'https'
    | 'socks'
    | 'authentication'
    | 'certificates'

export type AdvancedCapability =
    | 'retry'
    | 'redirects'
    | 'timeout'
    | 'cookies'
    | 'keepalive'
    | 'tcpoptions'
    | 'ipv6'
    | 'http2'
    | 'http3'
    | 'localaccess'

export interface RelayCapabilities {
    method: Set<MethodCapability>
    header: Set<HeaderCapability>
    content: Set<ContentCapability>
    auth: Set<AuthCapability>
    security: Set<SecurityCapability>
    proxy: Set<ProxyCapability>
    advanced: Set<AdvancedCapability>
}

export type UnsupportedFeatureError = {
    kind: "unsupported_feature"
    feature: string
    message: string
    relay: string
    alternatives?: Array<{
        relay: string
        description: string
    }>
}

export type RelayError =
    | UnsupportedFeatureError
    | { kind: "network"; message: string; cause?: unknown }
    | { kind: "timeout"; message: string; phase?: "connect" | "tls" | "response" }
    | { kind: "certificate"; message: string; cause?: unknown }
    | { kind: "auth"; message: string; cause?: unknown }
    | { kind: "proxy"; message: string; cause?: unknown }
    | { kind: "parse"; message: string; cause?: unknown }
    | { kind: "version"; message: string; cause?: unknown }
    | { kind: "abort"; message: string }

export interface RelayRequest {
    id: number
    url: string
    method: Method
    version: Version
    headers?: Record<string, string>
    params?: Record<string, string>
    content?: ContentType
    auth?: AuthType

    security?: {
        certificates?: {
            client?: CertificateType
            ca?: Array<Uint8Array>
        }
        verifyHost?: boolean
        verifyPeer?: boolean
    }

    proxy?: {
        url: string
        auth?: {
            username: string
            password: string
        }
        certificates?: {
            ca?: Uint8Array[]
            client?: CertificateType
        }
    }

    meta?: {
        timing?: {
            connect?: number
            request?: number
            tls?: number
        }
        retry?: {
            count: number
            delay: number
        }
        options?: {
            timeout?: number
            followRedirects?: boolean
            maxRedirects?: number
            decompress?: boolean
            cookies?: boolean
            keepAlive?: boolean
            tcpNoDelay?: boolean
            ipVersion?: "v4" | "v6" | "any"
        }
        http2?: {
            settings: Record<string, number>
            pushPromise: boolean
        }
        http3?: {
            quicConfig: Record<string, unknown>
        }
    }
}

export interface RelayResponse {
    id: number
    status: StatusCode
    statusText: string
    version: Version
    headers: Record<string, string>
    cookies?: Array<{
        name: string
        value: string
        domain?: string
        path?: string
        expires?: Date
        secure?: boolean
        httpOnly?: boolean
        sameSite?: 'Strict' | 'Lax' | 'None'
    }>
    body: RelayResponseBody

    meta: {
        timing: {
            start: number
            end: number
            phases?: {
                dns?: number
                connect?: number
                tls?: number
                send?: number
                wait?: number
                receive?: number
            }
        }
        size: {
            headers: number
            body: number
            total: number
        }
        tls?: {
            version: string
            cipher: string
            certificates?: Array<{
                subject: string
                issuer: string
                validFrom: string
                validTo: string
            }>
        }
        http2?: {
            settings: Record<string, number>
            pushPromise: boolean
        }
        http3?: {
            quicConfig: Record<string, unknown>
        }
        redirects?: Array<{
            url: string
            status: StatusCode
            version: Version
            headers: Record<string, string>
        }>
    }
}

export interface RelayV1 {
    readonly id: string
    readonly capabilities: RelayCapabilities

    canHandle(request: RelayRequest): E.Either<UnsupportedFeatureError, true>

    execute(
        request: RelayRequest
    ): {
        cancel: () => Promise<void>
        emitter: RelayEventEmitter<RelayRequestEvents>
        response: Promise<E.Either<RelayError, RelayResponse>>
    }
}

export const hasCapability = <T>(capabilities: Set<T>, capability: T): boolean =>
    capabilities.has(capability)

export function findSuitableRelay(
    request: RelayRequest,
    relays: RelayV1[]
): E.Either<UnsupportedFeatureError, RelayV1> {
    for (const relay of relays) {
        const result = relay.canHandle(request)
        if (E.isRight(result)) {
            return E.right(relay)
        }
    }

    const errors = relays
        .map(i => i.canHandle(request))
        .filter(E.isLeft)
        .map(e => e.left)

    return E.left(errors[0])
}

export const body = {
    body: (
        body: ArrayBuffer | Uint8Array,
        contentType?: MediaType | string
    ): RelayResponseBody => ({
        body: new Uint8Array(body),
        mediaType: typeof contentType === 'string'
            ? Object.values(MediaType).find(t => contentType.includes(t)) ?? MediaType.APPLICATION_OCTET
            : contentType ?? MediaType.APPLICATION_OCTET
    }),
}

export const transform = {
    text: (content: string): string => content,
    json: <T>(content: T): T => content,
    xml: (content: string): string => content,
    form: (content: FormData): FormData => content,
    binary: (content: Uint8Array): Uint8Array => content,
    multipart: (content: FormData): FormData => content,
    stream: (content: ReadableStream): ReadableStream => content,
    urlencoded: (arg: string | Record<string, any>): string =>
        pipe(
            arg,
            (input) => typeof input === 'string'
                ? O.some(input)
                : O.none,
            O.getOrElse(() => {
                const params = new URLSearchParams()
                const obj = arg as Record<string, any>

                Object.entries(obj)
                    .filter(([_, value]) => value !== undefined && value !== null)
                    .forEach(([key, value]) =>
                        params.append(key, value.toString())
                    )

                return params.toString()
            })
        )
}

/**
 * Content factory functions for creating standardized HTTP request content.
 *
 * The `kind` field determines how content is processed, basically
 * - Web (Axios + JS): `kind` is ignored, relying on Axios' auto-detect
 * - Desktop (`relay` + Rust): `kind` routes to processing `fn` in `relay`
 *
 * NOTE: `mediaType` field sets the HTTP `Content-Type` header in both.
 *
 * There are a bunch of reasons for separating routing and `Content-Type`,
 * see `relay` code for more info.
 * Essentially this allows for flexible scenarios like:
 * - Sending pre-stringified JSON as text to avoid double-encoding
 * - Using custom vendor media types with standard processing
 * - Future processing evolution without breaking HTTP contracts
 */
export const content = {
    /**
     * Creates text content. Useful for:
     * - Plain text
     * - Pre-stringified JSON (to avoid encoding escapes)
     * - Custom text formats
     */
    text: (
        content: string,
        mediaType?: MediaType | string
    ): ContentType => ({
        kind: "text",
        content: transform.text(content),
        mediaType: mediaType ?? MediaType.TEXT_PLAIN
    }),

    /**
     * Creates JSON content with automatic serialization.
     * Note: If you already have a JSON string, consider using `text()`
     * with `APPLICATION_JSON` mediaType to avoid double-encoding.
     */
    json: <T>(
        content: T,
        mediaType?: MediaType | string
    ): ContentType => ({
        kind: "json",
        content: transform.json(content),
        mediaType: mediaType ?? MediaType.APPLICATION_JSON
    }),

    /**
     * Creates XML content. Currently processed as text.
     */
    xml: (
        content: string,
        mediaType?: MediaType | string
    ): ContentType => ({
        kind: "xml",
        content: transform.xml(content),
        mediaType: mediaType ?? MediaType.APPLICATION_XML
    }),

    /**
     * Creates form-encoded content from FormData.
     */
    form: (content: FormData, mediaType?: MediaType | string): ContentType => ({
        kind: "form",
        content: transform.form(content),
        mediaType: mediaType ?? MediaType.APPLICATION_FORM
    }),

    /**
     * Creates binary content. Supports any binary format.
     */
    binary: (
        content: Uint8Array,
        mediaType: MediaType | string = MediaType.APPLICATION_OCTET,
        filename?: string
    ): ContentType => ({
        kind: "binary",
        content: transform.binary(content),
        mediaType,
        filename
    }),

    /**
     * Creates multipart form content with file upload support.
     */
    multipart: (content: FormData, mediaType?: MediaType | string): ContentType => ({
        kind: "multipart",
        content: transform.multipart(content),
        mediaType: mediaType ?? MediaType.MULTIPART_FORM
    }),

    /**
     * Creates URL-encoded content from string or object.
     */
    urlencoded: (content: string | Record<string, any>, mediaType?: MediaType | string): ContentType => ({
        kind: "urlencoded",
        content: transform.urlencoded(content),
        mediaType: mediaType ?? MediaType.APPLICATION_FORM
    }),

    /**
     * Creates streaming content for large payloads.
     */
    stream: (content: ReadableStream, mediaType: MediaType | string): ContentType => ({
        kind: "stream",
        content: transform.stream(content),
        mediaType
    })

    // TODO: Raw content type for pass-through scenarios:
    // raw: (content: string, mediaType: MediaType | string): ContentType => ({
    //     kind: "raw",
    //     content,
    //     mediaType
    // })
}

/**
 * Executable usage examples for content factory functions
 * usage / patterns / executable guarantees.
 *
 * These examples show API usage patterns but also act as compile-time
 * guarantees that the API works as documented. If the content factory functions
 * change in breaking ways, these examples will fail to type-check,
 * these aren't exactly docs nor tests but a mix,
 * and these also prevent documentations drift.
 *
 * Pattern borrowed from Rust's documentation tests where executable code examples are
 * embedded alongside API definitions.
 * See: https://doc.rust-lang.org/rustdoc/write-documentation/documentation-tests.html
 *
 * Since TypeScript lacks built-in doc-tests, this provides somewhat similar
 * guarantees, essentially serving as
 * - discoverable docs that devs can copy-paste or import, and also
 * - type-checked contracts so these cannot become outdated since they're actual
 *   executable code validated at compile time.
 */
export const examples = {
    // Avoid double-encoding of pre-stringified JSON
    preStringifiedJson: content.text(
        '{"message": "Hello \\"world\\"", "path": "C:\\\\Users\\\\file.txt"}',
        MediaType.APPLICATION_JSON
    ),

    // Vendor-specific JSON formats
    jsonApi: content.json(
        { data: { type: "users", id: "1" } },
        "application/vnd.api+json"
    ),

    // Custom XML schema
    soapXml: content.xml(
        '<soap:Envelope>...</soap:Envelope>',
        "application/soap+xml"
    ),

    // Custom binary format
    customBinary: content.binary(
        new Uint8Array([0x89, 0x50, 0x4E, 0x47]),
        "image/png"
    ),

    // Backwards compatible - uses defaults
    standardJson: content.json({ name: "John" }),
    standardText: content.text("Hello world")
}


/**
 * Helper function to convert standard `FormData` to array of arrays `[string, FormDataValue[]][]`
 *
 * This implementation uses a Map to maintain insertion order of form fields,
 * required for certain multipart/form-data requests where field order matters.
 *
 * JavaScript Maps maintain insertion order (ECMAScript 2015+) unlike plain objects
 * before ES2015 ("own properties") where property enumeration order was not guaranteed,
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#description
 * > Although the keys of an ordinary Object are ordered now,
 * > this was not always the case, and the order is complex.
 * > As a result, it's best not to rely on property order.
 *
 * This preserves the original field order as per RFC 7578 section 5.2.
 * See: https://datatracker.ietf.org/doc/html/rfc7578#section-5.2
 * > Form processors given forms with a well-defined ordering SHOULD send back results in order.
 */
const makeFormDataSerializable = async (formData: FormData): Promise<[string, FormDataValue[]][]> => {
    const m = new Map<string, FormDataValue[]>()

    // @ts-expect-error: `formData.entries` does exist but isn't visible,
    // see `"lib": ["ESNext", "DOM"],` in `tsconfig.json`
    for (const [key, value] of formData.entries()) {
        if (value instanceof File || value instanceof Blob) {
            const buffer = await value.arrayBuffer()
            const fileEntry: FormDataValue = {
                kind: "file",
                filename: value instanceof File ? value.name : "unknown",
                contentType: value.type || "application/octet-stream",
                data: new Uint8Array(buffer)
            }

            if (m.has(key)) {
                m.get(key)!.push(fileEntry)
            } else {
                m.set(key, [fileEntry])
            }
        } else {
            const textEntry: FormDataValue = {
                kind: "text",
                value: value.toString()
            }

            if (m.has(key)) {
                m.get(key)!.push(textEntry)
            } else {
                m.set(key, [textEntry])
            }
        }
    }

    return Array.from(m.entries())
}

// Helper function to adapt a relay request to work with the plugin
export const relayRequestToNativeAdapter = async (request: RelayRequest): Promise<Request> => {
    const adaptedRequest = { ...request };

    if (adaptedRequest.content?.kind === "multipart" && adaptedRequest.content.content instanceof FormData) {
        const serializableFormData = await makeFormDataSerializable(adaptedRequest.content.content);

        adaptedRequest.content = {
            ...adaptedRequest.content,
            // Replace with the converted form data
            // SAFETY: Type assertion is necessary here because the plugin system expects
            // types similar to Map<string, FormDataValue[]> instead of FormData.
            // Then convert the `Map` to simpler nested `Array` of `Array` structure for better compatibility
            // `Maps` it seems like are serialized differently across platforms and serialization libraries,
            // while `Array` of `Array` tend to maintain more consistent behavior by the sheer ubiquity of it.
            // @ts-expect-error: This is intentional to work around SuperJSON serialization
            content: serializableFormData
        };
    }

    return adaptedRequest as Request;
}

export const v1: VersionedAPI<RelayV1> = {
    version: { major: 1, minor: 0, patch: 0 },
    api: {
        id: "default",
        capabilities: {
            method: new Set<MethodCapability>(),
            header: new Set<HeaderCapability>(),
            content: new Set<ContentCapability>(),
            auth: new Set<AuthCapability>(),
            security: new Set<SecurityCapability>(),
            proxy: new Set<ProxyCapability>(),
            advanced: new Set<AdvancedCapability>()
        },
        canHandle: () => E.left({
            kind: "unsupported_feature",
            feature: "execution",
            message: "Default relay cannot handle requests",
            relay: "default"
        }),
        execute: () => ({
            cancel: async () => {},
            emitter: {
                on: () => () => {},
                once: () => () => {},
                off: () => {}
            },
            response: Promise.resolve(
                E.left({
                    kind: "version",
                    message: "Not implemented"
                })
            )
        })
    }
}
