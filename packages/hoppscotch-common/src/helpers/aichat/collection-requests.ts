import { getDefaultRESTRequest, type HoppRESTRequest } from "@hoppscotch/data"
import {
  applyChatBody,
  CHAT_HTTP_METHODS,
  CHAT_STRING_BODY_CONTENT_TYPES,
} from "./commands"

export type CollectionRequestDefinition = {
  name: string
  method: string
  url: string
  headers?: Array<{ key: string; value: string }>
  params?: Array<{ key: string; value: string }>
  body?: string
  contentType?: string
  preRequestScript?: string
  testScript?: string
}

type ParseResult =
  { definitions: CollectionRequestDefinition[] } | { error: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

const parsePairs = (
  value: unknown,
  field: "headers" | "params",
  requestNumber: number
): { pairs: Array<{ key: string; value: string }> } | { error: string } => {
  if (value === undefined) return { pairs: [] }
  if (!Array.isArray(value)) {
    return {
      error: `Request ${requestNumber} ${field} must be an array of key/value pairs.`,
    }
  }

  const pairs: Array<{ key: string; value: string }> = []
  for (const pair of value) {
    if (
      !isRecord(pair) ||
      typeof pair.key !== "string" ||
      !pair.key.trim() ||
      typeof pair.value !== "string"
    ) {
      return {
        error: `Request ${requestNumber} ${field} must contain non-empty string keys and string values.`,
      }
    }
    pairs.push({ key: pair.key.trim(), value: pair.value })
  }

  return { pairs }
}

/**
 * Validates model-supplied request definitions before any collection mutation
 * happens, keeping a malformed batch from creating a partial collection.
 */
export function parseCollectionRequestDefinitions(value: unknown): ParseResult {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Provide at least one request definition." }
  }

  const definitions: CollectionRequestDefinition[] = []
  const names = new Set<string>()

  for (const [index, candidate] of value.entries()) {
    const requestNumber = index + 1
    if (!isRecord(candidate)) {
      return { error: `Request ${requestNumber} must be an object.` }
    }

    const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
    const method =
      typeof candidate.method === "string" ? candidate.method.toUpperCase() : ""
    const url = typeof candidate.url === "string" ? candidate.url.trim() : ""

    if (!name || !method || !url) {
      return {
        error: `Request ${requestNumber} must include a name, HTTP method, and URL.`,
      }
    }
    if (!CHAT_HTTP_METHODS.includes(method)) {
      return {
        error: `Request ${requestNumber} has an unsupported HTTP method "${method}".`,
      }
    }

    const normalizedName = name.toLowerCase()
    if (names.has(normalizedName)) {
      return { error: `Request names must be unique; "${name}" is repeated.` }
    }
    names.add(normalizedName)

    const headers = parsePairs(candidate.headers, "headers", requestNumber)
    if ("error" in headers) return headers
    const params = parsePairs(candidate.params, "params", requestNumber)
    if ("error" in params) return params

    if (candidate.body !== undefined && typeof candidate.body !== "string") {
      return { error: `Request ${requestNumber} body must be a string.` }
    }
    if (
      candidate.contentType !== undefined &&
      (typeof candidate.contentType !== "string" ||
        !CHAT_STRING_BODY_CONTENT_TYPES.includes(candidate.contentType))
    ) {
      return {
        error: `Request ${requestNumber} has an unsupported content type.`,
      }
    }
    if (candidate.contentType !== undefined && candidate.body === undefined) {
      return {
        error: `Request ${requestNumber} must include a body when setting its content type.`,
      }
    }
    if (
      candidate.preRequestScript !== undefined &&
      typeof candidate.preRequestScript !== "string"
    ) {
      return {
        error: `Request ${requestNumber} pre-request script must be a string.`,
      }
    }
    if (
      candidate.testScript !== undefined &&
      typeof candidate.testScript !== "string"
    ) {
      return { error: `Request ${requestNumber} test script must be a string.` }
    }

    definitions.push({
      name,
      method,
      url,
      ...(candidate.headers !== undefined ? { headers: headers.pairs } : {}),
      ...(candidate.params !== undefined ? { params: params.pairs } : {}),
      ...(candidate.body !== undefined ? { body: candidate.body } : {}),
      ...(candidate.contentType !== undefined
        ? { contentType: candidate.contentType }
        : {}),
      ...(candidate.preRequestScript !== undefined
        ? { preRequestScript: candidate.preRequestScript }
        : {}),
      ...(candidate.testScript !== undefined
        ? { testScript: candidate.testScript }
        : {}),
    })
  }

  return { definitions }
}

/**
 * Produces a complete REST request for a collection, retaining stable request
 * identity and saved examples when an existing request is being updated.
 */
export function buildCollectionRequest(
  definition: CollectionRequestDefinition,
  existing?: HoppRESTRequest
): HoppRESTRequest {
  const request = getDefaultRESTRequest()

  if (existing) {
    request.id = existing.id
    request._ref_id = existing._ref_id
    request.responses = existing.responses
    request.description = existing.description
    request.auth = existing.auth
    request.requestVariables = existing.requestVariables
  }

  request.name = definition.name
  request.method = definition.method
  request.endpoint = definition.url
  if (definition.headers !== undefined) {
    request.headers = definition.headers.map(({ key, value }) => ({
      key,
      value,
      active: true,
      description: "",
    }))
  } else if (existing) {
    request.headers = existing.headers.map((header) => ({ ...header }))
  }
  if (definition.params !== undefined) {
    request.params = definition.params.map(({ key, value }) => ({
      key,
      value,
      active: true,
      description: "",
    }))
  } else if (existing) {
    request.params = existing.params.map((param) => ({ ...param }))
  }
  request.preRequestScript =
    definition.preRequestScript ?? existing?.preRequestScript ?? ""
  request.testScript = definition.testScript ?? existing?.testScript ?? ""

  if (definition.body !== undefined) {
    const existingContentType =
      existing?.body &&
      "contentType" in existing.body &&
      typeof existing.body.contentType === "string"
        ? existing.body.contentType
        : undefined
    applyChatBody(
      request,
      definition.body,
      definition.contentType ?? existingContentType
    )
  } else if (existing) {
    request.body = existing.body
  }

  return request
}
