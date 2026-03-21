import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { OpenAPIV3_1 } from "openapi-types"

/**
 * Convert Hoppscotch template variables `<<var>>` to OpenAPI path parameters `{var}`
 */
function convertTemplateVars(path: string): string {
  return path.replace(/<<([a-zA-Z0-9_.-]+)>>/g, "{$1}")
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
    let path: string
    // Skip decoding if pathname contains encoded braces (%7B/%7D)
    // to avoid creating spurious path parameters
    const hasEncodedBraces = /%7[Bb]|%7[Dd]/.test(url.pathname)
    try {
      path = hasEncodedBraces
        ? url.pathname || "/"
        : decodeURIComponent(url.pathname) || "/"
    } catch {
      path = url.pathname || "/"
    }
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
 * Parse a space-separated scopes string into an OpenAPI scopes object.
 * Filters out empty/whitespace-only entries.
 */
function parseScopes(scopes: string | undefined): Record<string, string> {
  if (!scopes) return {}
  const entries = scopes
    .split(" ")
    .filter((s) => s.length > 0)
    .map((s) => [s, ""] as const)
  return Object.fromEntries(entries)
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
      if (!entry.active || !entry.key) continue
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
      for (const [key, value] of new URLSearchParams(bodyStr)) {
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
  scopes: string[]
} | null {
  if (!auth.authActive) return null

  switch (auth.authType) {
    case "basic":
      return {
        schemeName: "basicAuth",
        scheme: { type: "http", scheme: "basic" },
        scopes: [],
      }
    case "bearer":
      return {
        schemeName: "bearerAuth",
        scheme: { type: "http", scheme: "bearer" },
        scopes: [],
      }
    case "api-key": {
      const addTo = auth.addTo === "QUERY_PARAMS" ? "query" : "header"
      const sanitizedKey = (auth.key || "key")
        .replace(/[^a-zA-Z0-9.\-_]/g, "_")
        .replace(/_+/g, "_")
      const name = `apiKey_${addTo}_${sanitizedKey}`
      return {
        schemeName: name,
        scheme: {
          type: "apiKey",
          in: addTo,
          name: auth.key || "api_key",
        },
        scopes: [],
      }
    }
    case "jwt":
      return {
        schemeName: "jwtAuth",
        scheme: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        scopes: [],
      }
    case "digest":
      return {
        schemeName: "digestAuth",
        scheme: { type: "http", scheme: "digest" },
        scopes: [],
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
        scopes: [],
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
        scopes: [],
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
        scopes: [],
      }
    case "oauth-2": {
      const flows: OpenAPIV3_1.OAuthFlowsObject = {}
      const grantInfo = auth.grantTypeInfo

      switch (grantInfo.grantType) {
        case "AUTHORIZATION_CODE":
          flows.authorizationCode = {
            authorizationUrl: grantInfo.authEndpoint || "",
            tokenUrl: grantInfo.tokenEndpoint || "",
            scopes: parseScopes(grantInfo.scopes),
          }
          break
        case "CLIENT_CREDENTIALS":
          flows.clientCredentials = {
            tokenUrl: grantInfo.authEndpoint || "",
            scopes: parseScopes(grantInfo.scopes),
          }
          break
        case "PASSWORD":
          flows.password = {
            tokenUrl: grantInfo.authEndpoint || "",
            scopes: parseScopes(grantInfo.scopes),
          }
          break
        case "IMPLICIT":
          flows.implicit = {
            authorizationUrl: grantInfo.authEndpoint || "",
            scopes: parseScopes(grantInfo.scopes),
          }
          break
      }

      const scopeKeys = Object.keys(parseScopes(grantInfo.scopes))
      return {
        schemeName: "oauth2",
        scheme: { type: "oauth2", flows },
        scopes: scopeKeys,
      }
    }
    default:
      return null
  }
}

/**
 * Register a security scheme in the schemes map.
 *
 * For OAuth2 schemes with the same name (all OAuth2 auth reuses "oauth2"),
 * flows are merged by grant type, and scopes are unioned within a matching
 * flow type so per-operation `security` references remain valid.
 *
 * Returns true if a URL conflict was detected within a matching flow type —
 * the caller should flag the export as lossy since the earlier endpoint is
 * silently retained.
 */
function registerSecurityScheme(
  securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject>,
  schemeName: string,
  scheme: OpenAPIV3_1.SecuritySchemeObject
): boolean {
  const existing = securitySchemes[schemeName]
  if (!existing || existing.type !== "oauth2" || scheme.type !== "oauth2") {
    securitySchemes[schemeName] = scheme
    return false
  }

  type MergeableFlow = {
    authorizationUrl?: string
    tokenUrl?: string
    refreshUrl?: string
    scopes: Record<string, string>
  }
  let urlConflict = false
  const existingFlows = existing.flows as Record<string, MergeableFlow>
  const newFlows = scheme.flows as Record<string, MergeableFlow>

  for (const [flowType, newFlow] of Object.entries(newFlows)) {
    const existingFlow = existingFlows[flowType]
    if (!existingFlow) {
      existingFlows[flowType] = newFlow
      continue
    }

    const urlsDiffer =
      (existingFlow.authorizationUrl ?? "") !==
        (newFlow.authorizationUrl ?? "") ||
      (existingFlow.tokenUrl ?? "") !== (newFlow.tokenUrl ?? "") ||
      (existingFlow.refreshUrl ?? "") !== (newFlow.refreshUrl ?? "")
    if (urlsDiffer) {
      urlConflict = true
    }
    existingFlow.scopes = { ...existingFlow.scopes, ...newFlow.scopes }
  }

  return urlConflict
}

/**
 * Convert saved responses from a request to OpenAPI response objects
 */
function convertResponses(responses: HoppRESTRequest["responses"]): {
  responses: OpenAPIV3_1.ResponsesObject
  hasDuplicates: boolean
} {
  if (!responses || Object.keys(responses).length === 0) {
    return {
      responses: { "200": { description: "Successful response" } },
      hasDuplicates: false,
    }
  }

  const result: OpenAPIV3_1.ResponsesObject = {}
  let hasDuplicates = false

  for (const [, response] of Object.entries(responses)) {
    const statusCode = response.code?.toString() ?? "200"

    const responseObj: OpenAPIV3_1.ResponseObject = {
      description: response.name || `${statusCode} response`,
    }

    if (response.headers && response.headers.length > 0) {
      responseObj.headers = {}
      for (const header of response.headers) {
        if (!header.key) continue
        // OpenAPI 3.1 §4.8.17: Content-Type is expressed via the content map key
        if (header.key.toLowerCase() === "content-type") continue
        responseObj.headers[header.key] = {
          schema: { type: "string" },
          example: header.value,
        }
      }
      if (Object.keys(responseObj.headers).length === 0) {
        delete responseObj.headers
      }
    }

    if (response.body) {
      // Try to detect content type from response headers
      const contentTypeHeader = response.headers?.find(
        (h) => h.key.toLowerCase() === "content-type"
      )
      const contentType =
        contentTypeHeader?.value?.split(";")[0].trim() || "application/json"

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

    if (result[statusCode]) {
      hasDuplicates = true
    }
    result[statusCode] = responseObj
  }

  return { responses: result, hasDuplicates }
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
  const usedTagNames = new Set<string>()
  const securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {}
  const servers = new Set<string>()
  const usedOperationIds = new Set<string>()
  const lossyAuthTypes = new Set([
    "digest",
    "hawk",
    "akamai-eg",
    "aws-signature",
  ])
  let hasScripts = false
  let hasLossyAuth = false
  let hasDuplicatePaths = false
  let hasDuplicateResponseCodes = false

  function processRequests(
    requests: HoppRESTRequest[],
    tagPath: string | null,
    inheritedHeaders: HoppCollection["headers"][]
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
      // OpenAPI 3.1 §4.8.14: Content-Type, Accept, and Authorization
      // are expressed via requestBody/responses/security, not header parameters
      const SKIP_HEADER_NAMES = new Set([
        "content-type",
        "accept",
        "authorization",
      ])
      const requestHeaderKeys = new Set<string>()
      for (const header of request.headers) {
        if (!header.active || !header.key) continue
        if (SKIP_HEADER_NAMES.has(header.key.toLowerCase())) continue
        requestHeaderKeys.add(header.key.toLowerCase())
        parameters.push({
          name: header.key,
          in: "header",
          schema: { type: "string" },
          example: header.value || undefined,
          description: header.description || undefined,
        })
      }

      // Inherited headers (nearest ancestor first, skip if already defined)
      for (const headers of inheritedHeaders) {
        for (const header of headers) {
          if (!header.active || !header.key) continue
          if (SKIP_HEADER_NAMES.has(header.key.toLowerCase())) continue
          if (requestHeaderKeys.has(header.key.toLowerCase())) continue
          requestHeaderKeys.add(header.key.toLowerCase())
          parameters.push({
            name: header.key,
            in: "header",
            schema: { type: "string" },
            example: header.value || undefined,
            description: header.description || undefined,
          })
        }
      }

      // Path variables from requestVariables
      const definedPathParams = new Set<string>()
      for (const variable of request.requestVariables) {
        if (!variable.active || !variable.key) continue
        definedPathParams.add(variable.key)
        parameters.push({
          name: variable.key,
          in: "path",
          required: true,
          schema: { type: "string" },
          example: variable.value || undefined,
        })
      }

      // Auto-generate path params for any {var} in the path not already defined
      const pathParamMatches = path.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)
      for (const match of pathParamMatches) {
        const paramName = match[1]
        if (!definedPathParams.has(paramName)) {
          parameters.push({
            name: paramName,
            in: "path",
            required: true,
            schema: { type: "string" },
          })
        }
      }

      const convertedResponses = convertResponses(request.responses)
      if (convertedResponses.hasDuplicates) hasDuplicateResponseCodes = true

      const operation: OpenAPIV3_1.OperationObject = {
        summary: request.name,
        responses: convertedResponses.responses,
      }

      if (request.description) {
        operation.description = request.description
      }

      let operationId =
        sanitizeOperationId(request.name) ||
        `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+|_+$/g, "")}`
      if (usedOperationIds.has(operationId)) {
        let counter = 2
        while (usedOperationIds.has(`${operationId}_${counter}`)) {
          counter++
        }
        operationId = `${operationId}_${counter}`
      }
      usedOperationIds.add(operationId)
      operation.operationId = operationId

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
        if (
          registerSecurityScheme(
            securitySchemes,
            authResult.schemeName,
            authResult.scheme
          )
        ) {
          hasLossyAuth = true
        }
        operation.security = [{ [authResult.schemeName]: authResult.scopes }]
      } else if (request.auth.authActive && request.auth.authType === "none") {
        operation.security = []
      }

      // Track warnings
      const stripModulePrefix = (s: string) =>
        s.startsWith("export {};\n") ? s.slice("export {};\n".length) : s
      if (
        stripModulePrefix(request.preRequestScript).trim() ||
        stripModulePrefix(request.testScript).trim()
      ) {
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

      if (
        (paths[path] as Record<string, OpenAPIV3_1.OperationObject>)[method]
      ) {
        hasDuplicatePaths = true
      }
      ;(paths[path] as Record<string, OpenAPIV3_1.OperationObject>)[method] =
        operation
    }
  }

  function processFolders(
    folders: HoppCollection[],
    parentPath: string | null,
    inheritedHeaders: HoppCollection["headers"][]
  ) {
    for (const folder of folders) {
      const tagPath = parentPath ? `${parentPath}/${folder.name}` : folder.name
      const folderHeaders = [folder.headers, ...inheritedHeaders]

      if (!usedTagNames.has(tagPath)) {
        usedTagNames.add(tagPath)
        tags.push({ name: tagPath })
      }

      processRequests(
        folder.requests as HoppRESTRequest[],
        tagPath,
        folderHeaders
      )
      processFolders(folder.folders, tagPath, folderHeaders)
    }
  }

  const rootHeaders = [collection.headers]

  // Process root-level requests (no tag)
  processRequests(collection.requests as HoppRESTRequest[], null, rootHeaders)

  // Process folders recursively
  processFolders(collection.folders, null, rootHeaders)

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
    if (
      registerSecurityScheme(
        securitySchemes,
        collectionAuth.schemeName,
        collectionAuth.scheme
      )
    ) {
      hasLossyAuth = true
    }
    doc.security = [{ [collectionAuth.schemeName]: collectionAuth.scopes }]
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
    warnings.push("export.openapi_scripts_not_included")
  }
  if (hasLossyAuth) {
    warnings.push("export.openapi_auth_limited_detail")
  }
  if (hasDuplicatePaths) {
    warnings.push("export.openapi_duplicate_paths")
  }
  if (hasDuplicateResponseCodes) {
    warnings.push("export.openapi_duplicate_response_codes")
  }

  return { doc, warnings }
}
