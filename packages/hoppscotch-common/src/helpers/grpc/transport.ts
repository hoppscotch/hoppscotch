import type { GRPCMetadata } from "@hoppscotch/data"
import type { RelayRequest, RelayResponse } from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import type {
  ExecutionResult,
  KernelInterceptorError,
} from "~/services/kernel-interceptor.service"
import { decodeGRPCResponseBody } from "./proto"
import { frameGRPCMessage, parseGRPCResponse } from "./framing"
import type {
  GRPCMethodDefinition,
  GRPCResponseMetadata,
  GRPCUnaryResponse,
} from "./types"

const STATUS_TEXT: Record<number, string> = {
  0: "OK",
  1: "CANCELLED",
  2: "UNKNOWN",
  3: "INVALID_ARGUMENT",
  4: "DEADLINE_EXCEEDED",
  5: "NOT_FOUND",
  6: "ALREADY_EXISTS",
  7: "PERMISSION_DENIED",
  8: "RESOURCE_EXHAUSTED",
  9: "FAILED_PRECONDITION",
  10: "ABORTED",
  11: "OUT_OF_RANGE",
  12: "UNIMPLEMENTED",
  13: "INTERNAL",
  14: "UNAVAILABLE",
  15: "DATA_LOSS",
  16: "UNAUTHENTICATED",
}

type ExecuteRelay = (
  request: RelayRequest
) => ExecutionResult<KernelInterceptorError>

export type ExecuteGRPCUnaryOptions = {
  baseURL: string
  method: GRPCMethodDefinition
  body: Uint8Array
  metadata: GRPCMetadata[]
  execute: ExecuteRelay
}

const metadataToHeaders = (metadata: GRPCMetadata[]): Record<string, string> =>
  Object.fromEntries(
    metadata
      .filter((entry) => entry.active && entry.key.trim())
      .map((entry) => [entry.key.trim(), entry.value])
  )

const responseHeaders = (response: RelayResponse): GRPCResponseMetadata[] =>
  Object.entries(response.headers).map(([key, value]) => ({
    key: key.toLowerCase(),
    value,
  }))

const findMetadata = (
  metadata: GRPCResponseMetadata[],
  key: string
): string | undefined =>
  metadata.find((entry) => entry.key.toLowerCase() === key)?.value

const decodeStatusMessage = (message: string | undefined): string => {
  if (!message) return ""
  try {
    return decodeURIComponent(message)
  } catch {
    return message
  }
}

const GRPC_TRAILER_NAMES = new Set([
  "grpc-status",
  "grpc-message",
  "grpc-status-details-bin",
])

const grpcStatusFromHTTPStatus = (status: number): number => {
  if (status === 400) return 13
  if (status === 401) return 16
  if (status === 403) return 7
  if (status === 404) return 12
  if ([429, 502, 503, 504].includes(status)) return 14
  return 2
}

const transformResponse = (
  response: RelayResponse,
  method: GRPCMethodDefinition
): GRPCUnaryResponse => {
  const responseMetadata = responseHeaders(response)
  const trailers = responseMetadata.filter((entry) =>
    GRPC_TRAILER_NAMES.has(entry.key.toLowerCase())
  )
  const metadata = responseMetadata.filter(
    (entry) => !GRPC_TRAILER_NAMES.has(entry.key.toLowerCase())
  )
  const rawStatus = findMetadata(responseMetadata, "grpc-status")
  const status =
    rawStatus === undefined
      ? grpcStatusFromHTTPStatus(response.status)
      : Number(rawStatus)
  const statusText = STATUS_TEXT[status] ?? `STATUS_${status}`
  const statusMessage = decodeStatusMessage(
    findMetadata(responseMetadata, "grpc-message")
  )

  if (!Number.isInteger(status)) {
    throw new Error(`Invalid gRPC status: ${rawStatus}`)
  }

  if (status !== 0) {
    throw new Error(
      statusMessage ? `${statusText}: ${statusMessage}` : statusText
    )
  }

  const parsed = parseGRPCResponse(response.body.body)

  if (parsed.messages.length !== 1) {
    throw new Error(
      `Unary gRPC response must contain exactly one message; received ${parsed.messages.length}`
    )
  }

  return {
    status,
    statusText,
    message: decodeGRPCResponseBody(method.responseType, parsed.messages[0]),
    metadata,
    trailers,
    duration: response.meta.timing.end - response.meta.timing.start,
    size: response.meta.size.body,
  }
}

export function executeGRPCUnary(options: ExecuteGRPCUnaryOptions): {
  cancel: () => Promise<void>
  response: Promise<E.Either<KernelInterceptorError | Error, GRPCUnaryResponse>>
} {
  const endpoint = `${options.baseURL.replace(/\/+$/, "")}${options.method.path}`
  const execution = options.execute({
    id: Date.now(),
    url: endpoint,
    method: "POST",
    version: "HTTP/2.0",
    headers: {
      ...metadataToHeaders(options.metadata),
      accept: "application/grpc",
      "content-type": "application/grpc",
      te: "trailers",
    },
    content: {
      kind: "binary",
      content: frameGRPCMessage(options.body),
      mediaType: "application/grpc",
    },
  })

  return {
    cancel: execution.cancel,
    response: execution.response.then((result) =>
      E.isLeft(result)
        ? E.left(result.left)
        : E.tryCatch(
            () => transformResponse(result.right, options.method),
            (error) =>
              error instanceof Error ? error : new Error(String(error))
          )
    ),
  }
}
