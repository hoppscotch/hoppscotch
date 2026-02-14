import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { OpenAPIV3_1 } from "openapi-types"

/**
 * Convert Hoppscotch template variables `<<var>>` to OpenAPI path parameters `{var}`
 */
function convertTemplateVars(path: string): string {
  return path.replace(/<<(\w+)>>/g, "{$1}")
}

/**
 * Extract base URL and path from a full endpoint URL.
 * Returns { server, path } where path starts with `/`.
 */
function parseEndpoint(endpoint: string): { server: string; path: string } {
  const converted = convertTemplateVars(endpoint)

  try {
    const url = new URL(converted)
    const server = `${url.protocol}//${url.host}`
    const path = decodeURIComponent(url.pathname) || "/"
    return { server, path }
  } catch {
    // Not a valid URL — treat the whole thing as a path
    const path = converted.startsWith("/") ? converted : `/${converted}`
    return { server: "", path }
  }
}

/**
 * Create a safe operationId from a request name
 */
function sanitizeOperationId(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
}

/**
 * Convert request body to OpenAPI requestBody
 */
function convertBody(
  body: HoppRESTRequest["body"]
): OpenAPIV3_1.RequestBodyObject | undefined {
  if (!body || body.contentType === null) return undefined

  if (body.contentType === "multipart/form-data") {
    const properties: Record<string, OpenAPIV3_1.SchemaObject> = {}
    const bodyEntries = Array.isArray(body.body) ? body.body : []

    for (const entry of bodyEntries) {
      if (!entry.active) continue
      properties[entry.key] = entry.isFile
        ? { type: "string", format: "binary" }
        : { type: "string", example: entry.value }
    }

    return {
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties,
          },
        },
      },
    }
  }

  if (body.contentType === "application/x-www-form-urlencoded") {
    const bodyStr = typeof body.body === "string" ? body.body : ""
    const properties: Record<string, OpenAPIV3_1.SchemaObject> = {}

    if (bodyStr) {
      for (const pair of bodyStr.split("&")) {
        const [key, value] = pair.split("=").map(decodeURIComponent)
        if (key) {
          properties[key] = { type: "string", example: value ?? "" }
        }
      }
    }

    return {
      content: {
        "application/x-www-form-urlencoded": {
          schema: {
            type: "object",
            properties,
          },
        },
      },
    }
  }

  if (body.contentType === "application/octet-stream") {
    return {
      content: {
        "application/octet-stream": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    }
  }

  // Text-based content types (JSON, XML, HTML, plain text, etc.)
  const bodyStr = typeof body.body === "string" ? body.body : ""

  const mediaTypeObj: OpenAPIV3_1.MediaTypeObject = {}
  if (bodyStr) {
    if (body.contentType.includes("json")) {
      try {
        mediaTypeObj.example = JSON.parse(bodyStr)
      } catch {
        mediaTypeObj.example = bodyStr
      }
    } else {
      mediaTypeObj.example = bodyStr
    }
  }

  return {
    content: {
      [body.contentType]: mediaTypeObj,
    },
  }
}

/**
 * Convert request auth to an OpenAPI security scheme entry.
 * Returns { schemeName, schemeObject, securityRequirement } or null if auth should be skipped.
 */
function convertAuth(auth: HoppRESTRequest["auth"]): {
  schemeName: string
  scheme: OpenAPIV3_1.SecuritySchemeObject
} | null {
  if (!auth.authActive) return null

  switch (auth.authType) {
    case "basic":
      return {
        schemeName: "basicAuth",
        scheme: { type: "http", scheme: "basic" },
      }
    case "bearer":
      return {
        schemeName: "bearerAuth",
        scheme: { type: "http", scheme: "bearer" },
      }
    case "api-key": {
      const addTo = auth.addTo === "QUERY_PARAMS" ? "query" : "header"
      const name = `apiKey_${addTo}_${auth.key || "key"}`
      return {
        schemeName: name,
        scheme: {
          type: "apiKey",
          in: addTo,
          name: auth.key || "api_key",
        },
      }
    }
    case "jwt":
      return {
        schemeName: "jwtAuth",
        scheme: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      }
    case "digest":
      return {
        schemeName: "digestAuth",
        scheme: { type: "http", scheme: "digest" },
      }
    case "aws-signature":
      return {
        schemeName: "awsSigV4",
        scheme: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "AWS Signature Version 4",
        },
      }
    case "hawk":
      return {
        schemeName: "hawkAuth",
        scheme: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Hawk authentication",
        },
      }
    case "akamai-eg":
      return {
        schemeName: "akamaiEdgeGrid",
        scheme: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Akamai EdgeGrid authentication",
        },
      }
    case "oauth-2": {
      const flows: OpenAPIV3_1.OAuthFlowsObject = {}
      const grantInfo = auth.grantTypeInfo

      switch (grantInfo.grantType) {
        case "AUTHORIZATION_CODE":
          flows.authorizationCode = {
            authorizationUrl: grantInfo.authEndpoint || "",
            tokenUrl: grantInfo.tokenEndpoint || "",
            scopes: grantInfo.scopes
              ? Object.fromEntries(
                  grantInfo.scopes.split(" ").map((s: string) => [s, ""])
                )
              : {},
          }
          break
        case "CLIENT_CREDENTIALS":
          flows.clientCredentials = {
            tokenUrl: grantInfo.tokenEndpoint || "",
            scopes: grantInfo.scopes
              ? Object.fromEntries(
                  grantInfo.scopes.split(" ").map((s: string) => [s, ""])
                )
              : {},
          }
          break
        case "PASSWORD":
          flows.password = {
            tokenUrl: grantInfo.tokenEndpoint || "",
            scopes: grantInfo.scopes
              ? Object.fromEntries(
                  grantInfo.scopes.split(" ").map((s: string) => [s, ""])
                )
              : {},
          }
          break
        case "IMPLICIT":
          flows.implicit = {
            authorizationUrl: grantInfo.authEndpoint || "",
            scopes: grantInfo.scopes
              ? Object.fromEntries(
                  grantInfo.scopes.split(" ").map((s: string) => [s, ""])
                )
              : {},
          }
          break
      }

      return {
        schemeName: "oauth2",
        scheme: { type: "oauth2", flows },
      }
    }
    default:
      return null
  }
}

/**
 * Convert saved responses from a request to OpenAPI response objects
 */
function convertResponses(
  responses: HoppRESTRequest["responses"]
): OpenAPIV3_1.ResponsesObject {
  if (!responses || Object.keys(responses).length === 0) {
    return { "200": { description: "Successful response" } }
  }

  const result: OpenAPIV3_1.ResponsesObject = {}

  for (const [, response] of Object.entries(responses)) {
    const statusCode = response.code?.toString() ?? response.status ?? "200"

    const responseObj: OpenAPIV3_1.ResponseObject = {
      description: response.name || `${statusCode} response`,
    }

    if (response.headers && response.headers.length > 0) {
      responseObj.headers = {}
      for (const header of response.headers) {
        if (header.key) {
          responseObj.headers[header.key] = {
            schema: { type: "string" },
            example: header.value,
          }
        }
      }
    }

    if (response.body) {
      // Try to detect content type from response headers
      const contentTypeHeader = response.headers?.find(
        (h) => h.key.toLowerCase() === "content-type"
      )
      const contentType = contentTypeHeader?.value || "application/json"

      const mediaType: OpenAPIV3_1.MediaTypeObject = {}
      if (contentType.includes("json")) {
        try {
          mediaType.example = JSON.parse(response.body)
        } catch {
          mediaType.example = response.body
        }
      } else {
        mediaType.example = response.body
      }

      responseObj.content = { [contentType]: mediaType }
    }

    result[statusCode] = responseObj
  }

  return result
}

/**
 * Convert a HoppCollection to an OpenAPI 3.1.0 document.
 * Returns the document along with any data-loss warnings.
 */
export function hoppCollectionToOpenAPI(collection: HoppCollection): {
  doc: OpenAPIV3_1.Document
  warnings: string[]
} {
  const paths: OpenAPIV3_1.PathsObject = {}
  const tags: OpenAPIV3_1.TagObject[] = []
  const securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {}
  const servers = new Set<string>()
  const lossyAuthTypes = new Set(["digest", "hawk", "akamai-eg"])
  let hasScripts = false
  let hasLossyAuth = false

  function processRequests(
    requests: HoppRESTRequest[],
    tagPath: string | null
  ) {
    for (const request of requests) {
      const { server, path } = parseEndpoint(request.endpoint)
      if (server) servers.add(server)

      const method = request.method.toLowerCase()

      const parameters: OpenAPIV3_1.ParameterObject[] = []

      // Query params
      for (const param of request.params) {
        if (!param.active || !param.key) continue
        parameters.push({
          name: param.key,
          in: "query",
          schema: { type: "string" },
          example: param.value || undefined,
          description: param.description || undefined,
        })
      }

      // Headers (request-level)
      const requestHeaderKeys = new Set<string>()
      for (const header of request.headers) {
        if (!header.active || !header.key) continue
        requestHeaderKeys.add(header.key.toLowerCase())
        parameters.push({
          name: header.key,
          in: "header",
          schema: { type: "string" },
          example: header.value || undefined,
          description: header.description || undefined,
        })
      }

      // Collection-level headers (skip if request already defines the same key)
      for (const header of collection.headers) {
        if (!header.active || !header.key) continue
        if (requestHeaderKeys.has(header.key.toLowerCase())) continue
        parameters.push({
          name: header.key,
          in: "header",
          schema: { type: "string" },
          example: header.value || undefined,
          description: header.description || undefined,
        })
      }

      // Path variables
      for (const variable of request.requestVariables) {
        if (!variable.key) continue
        parameters.push({
          name: variable.key,
          in: "path",
          required: true,
          schema: { type: "string" },
          example: variable.value || undefined,
        })
      }

      const operation: OpenAPIV3_1.OperationObject = {
        summary: request.name,
        responses: convertResponses(request.responses),
      }

      if (request.description) {
        operation.description = request.description
      }

      operation.operationId = sanitizeOperationId(request.name)

      if (tagPath) {
        operation.tags = [tagPath]
      }

      if (parameters.length > 0) {
        operation.parameters = parameters
      }

      const requestBody = convertBody(request.body)
      if (requestBody) {
        operation.requestBody = requestBody
      }

      // Auth
      const authResult = convertAuth(request.auth)
      if (authResult) {
        securitySchemes[authResult.schemeName] = authResult.scheme
        operation.security = [{ [authResult.schemeName]: [] }]
      }

      // Track warnings
      if (request.preRequestScript || request.testScript) {
        hasScripts = true
      }
      if (
        request.auth.authActive &&
        lossyAuthTypes.has(request.auth.authType)
      ) {
        hasLossyAuth = true
      }

      if (!paths[path]) {
        paths[path] = {}
      }

      ;(paths[path] as Record<string, OpenAPIV3_1.OperationObject>)[method] =
        operation
    }
  }

  function processFolders(
    folders: HoppCollection[],
    parentPath: string | null
  ) {
    for (const folder of folders) {
      const tagPath = parentPath ? `${parentPath}/${folder.name}` : folder.name

      tags.push({ name: tagPath })

      processRequests(folder.requests as HoppRESTRequest[], tagPath)
      processFolders(folder.folders, tagPath)
    }
  }

  // Process root-level requests (no tag)
  processRequests(collection.requests as HoppRESTRequest[], null)

  // Process folders recursively
  processFolders(collection.folders, null)

  const doc: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: {
      title: collection.name,
      description: collection.description ?? undefined,
      version: "1.0.0",
    },
    paths,
  }

  if (servers.size > 0) {
    doc.servers = Array.from(servers).map((url) => ({ url }))
  }

  if (tags.length > 0) {
    doc.tags = tags
  }

  // Collection-level auth → global security
  const collectionAuth = convertAuth(collection.auth as HoppRESTRequest["auth"])
  if (collectionAuth) {
    securitySchemes[collectionAuth.schemeName] = collectionAuth.scheme
    doc.security = [{ [collectionAuth.schemeName]: [] }]
  }
  if (
    collection.auth.authActive &&
    lossyAuthTypes.has(collection.auth.authType)
  ) {
    hasLossyAuth = true
  }

  if (Object.keys(securitySchemes).length > 0) {
    doc.components = { securitySchemes }
  }

  const warnings: string[] = []
  if (hasScripts) {
    warnings.push(
      "Pre-request and test scripts were not included in the OpenAPI export."
    )
  }
  if (hasLossyAuth) {
    warnings.push(
      "Some auth types (Digest, HAWK, Akamai EdgeGrid) were exported with limited detail."
    )
  }

  return { doc, warnings }
}
