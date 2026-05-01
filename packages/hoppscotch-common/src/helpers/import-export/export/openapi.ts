import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { OpenAPIV3_1 } from "openapi-types"

type AuthLike = HoppRESTRequest["auth"]

/**
 * OpenAPI 3.1 PathItem permits only this fixed set of HTTP method keys.
 * Anything else makes the document invalid and must be skipped.
 */
const OPENAPI_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
])

/**
 * OpenAPI 3.1 §4.8.14: Content-Type, Accept, and Authorization
 * are expressed via requestBody/responses/security, not header parameters.
 */
const SKIP_HEADER_NAMES = new Set(["content-type", "accept", "authorization"])

/**
 * Convert Hoppscotch template variables `<<var>>` to OpenAPI path parameters `{var}`
 */
function convertTemplateVars(path: string): string {
  return path.replace(/<<([a-zA-Z0-9_.-]+)>>/g, "{$1}")
}

/**
 * Extract base URL, path, and any URL-embedded query params from an endpoint.
 *
 * Template variables (`<<var>>`) are converted to OpenAPI `{var}` *before*
 * URL parsing — so the WHATWG parser only has to encode ASCII braces (which
 * it turns into `%7B`/`%7D`). Afterwards we decode only those brace pairs,
 * deliberately preserving any other percent-encoding the user intentionally
 * placed in the URL (e.g. `%2F` to keep a slash inside a single path segment).
 */
function parseEndpoint(endpoint: string): {
  server: string
  path: string
  queryParams: Array<{ key: string; value: string }>
} {
  let converted = convertTemplateVars(endpoint)

  // Protocol-relative URL (`//host/path`) — `new URL` would reject it.
  // Default to https so it still emits a valid server + path pair.
  if (converted.startsWith("//") && !converted.startsWith("///")) {
    converted = `https:${converted}`
  }

  try {
    const url = new URL(converted)
    const server = `${url.protocol}//${url.host}`
    // `new URL` already strips the fragment from `pathname`, so no extra work
    // is needed for absolute URLs.
    const path = url.pathname.replace(/%7B/gi, "{").replace(/%7D/gi, "}") || "/"
    const queryParams: Array<{ key: string; value: string }> = []
    for (const [key, value] of url.searchParams) {
      queryParams.push({ key, value })
    }
    return { server, path, queryParams }
  } catch {
    // Not a valid absolute URL — strip any fragment and query string so they
    // don't end up inside the OpenAPI path key.
    let raw = converted
    const fragIdx = raw.indexOf("#")
    if (fragIdx >= 0) raw = raw.slice(0, fragIdx)

    const queryParams: Array<{ key: string; value: string }> = []
    const queryIdx = raw.indexOf("?")
    if (queryIdx >= 0) {
      const queryStr = raw.slice(queryIdx + 1)
      raw = raw.slice(0, queryIdx)
      try {
        for (const [key, value] of new URLSearchParams(queryStr)) {
          queryParams.push({ key, value })
        }
      } catch {
        // ignore malformed query string
      }
    }

    // A Hoppscotch endpoint that starts with a template variable like
    // `<<baseUrl>>/pets` is the convention for "use the env-provided host."
    // After convertTemplateVars that leading variable is `{baseUrl}`. Split
    // it off as the server (in original `<<var>>` syntax for round-trip
    // through the importer) so it doesn't end up inside the OpenAPI path key,
    // which would cause `<<baseUrl>>/<<baseUrl>>/pets` doubling on reimport.
    const leadingVarMatch = /^\{([a-zA-Z0-9_.-]+)\}(.*)$/.exec(raw)
    if (leadingVarMatch) {
      const varName = leadingVarMatch[1]
      const rest = leadingVarMatch[2] || ""
      const pathPart = rest.startsWith("/") ? rest : rest ? `/${rest}` : "/"
      return { server: `<<${varName}>>`, path: pathPart, queryParams }
    }

    const pathRaw = raw.startsWith("/") ? raw : `/${raw}`
    return { server: "", path: pathRaw, queryParams }
  }
}

/**
 * Resolve effective auth by walking parent inheritance: a request/folder with
 * `authType: "inherit"` adopts its nearest non-inherit ancestor; an explicit
 * `none/basic/...` overrides regardless of what the ancestor specifies.
 */
function resolveEffectiveAuth(
  ownAuth: AuthLike,
  inheritedAuth: AuthLike | null
): AuthLike | null {
  if (ownAuth.authType === "inherit") return inheritedAuth
  return ownAuth
}

/**
 * Compare two auths for OpenAPI export equivalence — i.e. would they emit the
 * same security scheme? Used so the exporter can skip per-operation security
 * when it would just duplicate the doc-level default. Credential VALUES are
 * not compared (they're never emitted to the spec anyway).
 */
function authsMatchForOpenAPI(a: AuthLike | null, b: AuthLike | null): boolean {
  const aActive = a?.authActive === true
  const bActive = b?.authActive === true
  if (!aActive && !bActive) return true
  if (aActive !== bActive) return false
  // Both active here.
  if (a!.authType === "none" && b!.authType === "none") return true
  if (a!.authType !== b!.authType) return false
  // Same type — for OpenAPI emission what matters is the resulting scheme
  // identity AND the requested scopes (OAuth2 ops with different scopes
  // are distinct security requirements even when sharing a scheme).
  const aResult = convertAuth(a as HoppRESTRequest["auth"])
  const bResult = convertAuth(b as HoppRESTRequest["auth"])
  if (aResult?.schemeName !== bResult?.schemeName) return false
  const aScopes = [...(aResult?.scopes ?? [])].sort().join(" ")
  const bScopes = [...(bResult?.scopes ?? [])].sort().join(" ")
  return aScopes === bScopes
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

    // Skip emission when there are no active entries — an empty `properties`
    // object produces an OpenAPI media object that some validators reject and
    // misleads importers into creating an empty multipart body.
    if (Object.keys(properties).length === 0) return undefined

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
    const mediaTypeObj: OpenAPIV3_1.MediaTypeObject = {
      schema: {
        type: "string",
        format: "binary",
      },
    }
    // Hopp's schema permits octet-stream body to be `File | null`, but users
    // occasionally save a string snapshot. Surface it as an example rather
    // than silently discarding the data.
    if (typeof body.body === "string" && body.body.length > 0) {
      mediaTypeObj.example = body.body
    }
    return {
      content: {
        "application/octet-stream": mediaTypeObj,
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
      const scopes = parseScopes(grantInfo.scopes)

      // OpenAPI 3.1 §4.8.30 requires `tokenUrl`/`authorizationUrl` to be
      // non-empty URLs for the corresponding flow object. Skip flows whose
      // endpoint(s) are missing rather than emit invalid (empty-URL) flows.
      switch (grantInfo.grantType) {
        case "AUTHORIZATION_CODE":
          if (grantInfo.authEndpoint && grantInfo.tokenEndpoint) {
            flows.authorizationCode = {
              authorizationUrl: grantInfo.authEndpoint,
              tokenUrl: grantInfo.tokenEndpoint,
              scopes,
            }
          }
          break
        case "CLIENT_CREDENTIALS":
          if (grantInfo.authEndpoint) {
            flows.clientCredentials = {
              tokenUrl: grantInfo.authEndpoint,
              scopes,
            }
          }
          break
        case "PASSWORD":
          if (grantInfo.authEndpoint) {
            flows.password = {
              tokenUrl: grantInfo.authEndpoint,
              scopes,
            }
          }
          break
        case "IMPLICIT":
          if (grantInfo.authEndpoint) {
            flows.implicit = {
              authorizationUrl: grantInfo.authEndpoint,
              scopes,
            }
          }
          break
      }

      // If no flow could be emitted, the resulting securityScheme would be
      // `{ type: "oauth2", flows: {} }` — invalid per spec. Return null and
      // let the caller flag it as unsupported (lossy).
      if (Object.keys(flows).length === 0) return null

      const scopeKeys = Object.keys(scopes)
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
 * Register a security scheme in the schemes map and return the name it was
 * registered under (which may be suffixed if a non-OAuth2 collision occurred).
 *
 * For OAuth2 schemes with the same name (all OAuth2 auth reuses "oauth2"),
 * flows are merged by grant type, and scopes are unioned within a matching
 * flow type so per-operation `security` references remain valid.
 *
 * For non-OAuth2 schemes, identical schemes reuse the existing name; differing
 * schemes are registered under a numeric suffix to avoid silent overwrite.
 */
function registerSecurityScheme(
  securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject>,
  schemeName: string,
  scheme: OpenAPIV3_1.SecuritySchemeObject
): string {
  const existing = securitySchemes[schemeName]

  if (!existing) {
    securitySchemes[schemeName] = scheme
    return schemeName
  }

  if (existing.type === "oauth2" && scheme.type === "oauth2") {
    type MergeableFlow = {
      authorizationUrl?: string
      tokenUrl?: string
      refreshUrl?: string
      scopes: Record<string, string>
    }
    const existingFlows = existing.flows as Record<string, MergeableFlow>
    const newFlows = scheme.flows as Record<string, MergeableFlow>

    for (const [flowType, newFlow] of Object.entries(newFlows)) {
      const existingFlow = existingFlows[flowType]
      if (!existingFlow) {
        existingFlows[flowType] = newFlow
        continue
      }
      existingFlow.scopes = { ...existingFlow.scopes, ...newFlow.scopes }
    }

    return schemeName
  }

  // Non-OAuth2: identical schemes share a name; differing schemes get suffixed.
  const equalSchemes = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b)

  if (equalSchemes(existing, scheme)) {
    return schemeName
  }

  let counter = 2
  for (;;) {
    const candidate = `${schemeName}_${counter}`
    const candidateExisting = securitySchemes[candidate]
    if (!candidateExisting) {
      securitySchemes[candidate] = scheme
      return candidate
    }
    if (equalSchemes(candidateExisting, scheme)) {
      return candidate
    }
    counter++
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
    // OpenAPI's `responses` map is keyed by HTTP status code; a saved
    // response without a code can't be addressed and is ambiguous, skip it.
    if (response.code == null) continue
    const statusCode = response.code.toString()

    const responseObj: OpenAPIV3_1.ResponseObject = {
      description: response.name?.trim() || `${statusCode} response`,
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

    result[statusCode] = responseObj
  }

  return result
}

/**
 * Convert a HoppCollection to an OpenAPI 3.1.0 document.
 */
export function hoppCollectionToOpenAPI(collection: HoppCollection): {
  doc: OpenAPIV3_1.Document
} {
  const paths: OpenAPIV3_1.PathsObject = {}
  const tags: OpenAPIV3_1.TagObject[] = []
  const usedTagNames = new Set<string>()
  const securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {}
  const servers = new Set<string>()
  const usedOperationIds = new Set<string>()

  /**
   * Resolve a `<<varName>>` server placeholder to the variable's actual value
   * if one is in scope. Defensive: skips variables flagged `secret` so we
   * don't leak credentials into an exported spec.
   */
  const resolveServerPlaceholder = (
    server: string,
    variableValues: Map<string, string>
  ): string => {
    const match = /^<<([a-zA-Z0-9_.-]+)>>$/.exec(server)
    if (!match) return server
    const value = variableValues.get(match[1])
    return value && value.length > 0 ? value : server
  }

  /**
   * Build the effective variable map for the current scope by walking ancestor
   * variable arrays from root → leaf, with deeper levels overriding shallower.
   * Secret variables are excluded so resolveServerPlaceholder never substitutes
   * them into the doc.
   */
  const buildVariableValues = (
    variableLayers: ReadonlyArray<HoppCollection["variables"]>
  ): Map<string, string> => {
    const result = new Map<string, string>()
    for (const layer of variableLayers) {
      for (const v of layer) {
        if ((v as { secret?: boolean }).secret) continue
        const value =
          (v as { currentValue?: string }).currentValue ||
          (v as { initialValue?: string }).initialValue ||
          ""
        if (value) result.set(v.key, value)
      }
    }
    return result
  }

  /** Collect the keys of every secret variable in scope (any layer). */
  const collectSecretKeys = (
    variableLayers: ReadonlyArray<HoppCollection["variables"]>
  ): Set<string> => {
    const result = new Set<string>()
    for (const layer of variableLayers) {
      for (const v of layer) {
        if ((v as { secret?: boolean }).secret) result.add(v.key)
      }
    }
    return result
  }

  /**
   * Substitute `<<var>>` tokens in a value with their resolved (non-secret)
   * values. Returns `undefined` if any secret variable appears in the string —
   * the param's `example` field should be omitted entirely rather than leak
   * a credential placeholder into the exported spec.
   */
  const resolveExampleValue = (
    value: string | undefined,
    variableValues: Map<string, string>,
    secretKeys: Set<string>
  ): string | undefined => {
    if (!value) return undefined
    let containsSecret = false
    const out = value.replace(/<<([a-zA-Z0-9_.-]+)>>/g, (_match, name) => {
      if (secretKeys.has(name)) {
        containsSecret = true
        return ""
      }
      return variableValues.get(name) ?? `<<${name}>>`
    })
    if (containsSecret) return undefined
    return out
  }

  function processRequests(
    requests: HoppRESTRequest[],
    tagPath: string | null,
    inheritedHeaders: HoppCollection["headers"][],
    inheritedAuth: AuthLike | null,
    inheritedVariables: ReadonlyArray<HoppCollection["variables"]>,
    docLevelAuth: AuthLike | null
  ) {
    const variableValues = buildVariableValues(inheritedVariables)
    const secretKeys = collectSecretKeys(inheritedVariables)
    for (const request of requests) {
      const {
        server,
        path: rawPath,
        queryParams: urlQueryParams,
      } = parseEndpoint(request.endpoint)
      const method = request.method.toLowerCase()

      // Substitute non-secret runtime variables that landed inside the path
      // (e.g. `<<env>>/api/<<region>>/users` -> `/prod/api/us-east-1/users`).
      // True path templates — vars listed in `requestVariables` — are kept
      // as `{name}` so they round-trip and remain consumer-supplied. Secret
      // vars are also kept as templates rather than substituted to avoid
      // leaking credentials into the spec.
      const requestVarKeys = new Set(
        request.requestVariables
          .filter((v) => v.active && v.key)
          .map((v) => v.key)
      )
      const path = rawPath.replace(
        /\{([a-zA-Z0-9_.-]+)\}/g,
        (token, name: string) => {
          if (requestVarKeys.has(name)) return token
          if (secretKeys.has(name)) return token
          const resolved = variableValues.get(name)
          return resolved !== undefined ? resolved : token
        }
      )

      // Skip methods OpenAPI 3.1 doesn't recognize as PathItem keys —
      // emitting them would produce an invalid document.
      if (!OPENAPI_METHODS.has(method)) continue

      // Skip duplicate (path, method) — OpenAPI cannot represent two
      // operations with the same key. Keep the first seen; drop the rest.
      const pathItem = (paths[path] = (paths[path] ??
        {}) as OpenAPIV3_1.PathItemObject) as Record<
        string,
        OpenAPIV3_1.OperationObject
      >
      if (pathItem[method]) continue

      if (server) servers.add(resolveServerPlaceholder(server, variableValues))

      const parameters: OpenAPIV3_1.ParameterObject[] = []
      // OpenAPI requires unique (name, in) per operation — dedupe as we go,
      // first-write wins (mirrors the existing "child-overrides-parent" rule
      // for inherited headers).
      const seenParamKeys = new Set<string>()
      const pushParam = (param: OpenAPIV3_1.ParameterObject) => {
        const key = `${param.in}::${param.name.toLowerCase()}`
        if (seenParamKeys.has(key)) return
        seenParamKeys.add(key)
        parameters.push(param)
      }

      // Explicit request-level query params first (so they take precedence
      // over duplicates encoded in the URL itself).
      for (const param of request.params) {
        if (!param.active || !param.key) continue
        pushParam({
          name: param.key,
          in: "query",
          schema: { type: "string" },
          example: resolveExampleValue(param.value, variableValues, secretKeys),
          description: param.description || undefined,
        })
      }

      // Query params embedded in the endpoint URL itself.
      for (const { key, value } of urlQueryParams) {
        if (!key) continue
        pushParam({
          name: key,
          in: "query",
          schema: { type: "string" },
          example: resolveExampleValue(value, variableValues, secretKeys),
        })
      }

      // Request-level headers
      for (const header of request.headers) {
        if (!header.active || !header.key) continue
        if (SKIP_HEADER_NAMES.has(header.key.toLowerCase())) continue
        pushParam({
          name: header.key,
          in: "header",
          schema: { type: "string" },
          example: resolveExampleValue(
            header.value,
            variableValues,
            secretKeys
          ),
          description: header.description || undefined,
        })
      }

      // Inherited headers (nearest ancestor first; first-write-wins via dedup)
      for (const headers of inheritedHeaders) {
        for (const header of headers) {
          if (!header.active || !header.key) continue
          if (SKIP_HEADER_NAMES.has(header.key.toLowerCase())) continue
          pushParam({
            name: header.key,
            in: "header",
            schema: { type: "string" },
            example: resolveExampleValue(
              header.value,
              variableValues,
              secretKeys
            ),
            description: header.description || undefined,
          })
        }
      }

      // Path variables from requestVariables
      const definedPathParams = new Set<string>()
      for (const variable of request.requestVariables) {
        if (!variable.active || !variable.key) continue
        definedPathParams.add(variable.key)
        pushParam({
          name: variable.key,
          in: "path",
          required: true,
          schema: { type: "string" },
          example: resolveExampleValue(
            variable.value,
            variableValues,
            secretKeys
          ),
        })
      }

      // Auto-generate path params for any {var} in the path not already defined
      const pathParamMatches = path.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)
      for (const match of pathParamMatches) {
        const paramName = match[1]
        if (definedPathParams.has(paramName)) continue
        definedPathParams.add(paramName)
        pushParam({
          name: paramName,
          in: "path",
          required: true,
          schema: { type: "string" },
        })
      }

      const operation: OpenAPIV3_1.OperationObject = {
        summary: request.name,
        responses: convertResponses(request.responses),
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

      // Effective auth = nearest non-inherit ancestor (or own auth if explicit).
      // Folder/collection auth is now respected via inheritedAuth.
      const effectiveAuth = resolveEffectiveAuth(request.auth, inheritedAuth)
      // Only emit `operation.security` when the request's effective auth
      // *differs* from the doc-level auth. If they match, OpenAPI's natural
      // inheritance from `doc.security` covers it — and skipping the emit
      // is what makes round-tripping `request.auth = inherit` come back as
      // `inherit` rather than as a duplicated copy on every request.
      if (
        effectiveAuth?.authActive &&
        !authsMatchForOpenAPI(effectiveAuth, docLevelAuth)
      ) {
        if (effectiveAuth.authType === "none") {
          operation.security = []
        } else {
          const authResult = convertAuth(effectiveAuth)
          if (authResult) {
            const name = registerSecurityScheme(
              securitySchemes,
              authResult.schemeName,
              authResult.scheme
            )
            operation.security = [{ [name]: authResult.scopes }]
          }
        }
      } else if (
        // Special case: collection has auth but this request explicitly opts
        // out (`authActive: false` on a non-inherit type). Emit `[]` so the
        // operation is exempted from doc.security at runtime.
        docLevelAuth?.authActive &&
        request.auth.authType !== "inherit" &&
        !request.auth.authActive
      ) {
        operation.security = []
      }

      pathItem[method] = operation
    }
  }

  function processFolders(
    folders: HoppCollection[],
    parentPath: string | null,
    inheritedHeaders: HoppCollection["headers"][],
    inheritedAuth: AuthLike | null,
    inheritedVariables: ReadonlyArray<HoppCollection["variables"]>,
    docLevelAuth: AuthLike | null
  ) {
    for (const folder of folders) {
      const tagPath = parentPath ? `${parentPath}/${folder.name}` : folder.name
      const folderHeaders = [folder.headers, ...inheritedHeaders]
      const folderAuth = resolveEffectiveAuth(
        folder.auth as AuthLike,
        inheritedAuth
      )
      const folderVariables = [...inheritedVariables, folder.variables]

      if (!usedTagNames.has(tagPath)) {
        usedTagNames.add(tagPath)
        const tag: OpenAPIV3_1.TagObject = { name: tagPath }
        if (folder.description) tag.description = folder.description
        tags.push(tag)
      }

      processRequests(
        folder.requests as HoppRESTRequest[],
        tagPath,
        folderHeaders,
        folderAuth,
        folderVariables,
        docLevelAuth
      )
      processFolders(
        folder.folders,
        tagPath,
        folderHeaders,
        folderAuth,
        folderVariables,
        docLevelAuth
      )
    }
  }

  const rootHeaders = [collection.headers]
  const collectionAuthAsRequest = collection.auth as AuthLike
  // Root inheritance: a top-level "inherit" has no parent, so treat as no auth.
  const rootInheritedAuth: AuthLike | null =
    collectionAuthAsRequest.authType === "inherit"
      ? null
      : collectionAuthAsRequest

  const rootVariables: ReadonlyArray<HoppCollection["variables"]> = [
    collection.variables,
  ]
  // The "doc-level auth" is what the importer will set as collection.auth,
  // mirrored from `doc.security`. Operations whose effective auth matches it
  // can omit `operation.security` and let OpenAPI's inheritance kick in.
  const docLevelAuth: AuthLike | null = rootInheritedAuth?.authActive
    ? rootInheritedAuth
    : null

  processRequests(
    collection.requests as HoppRESTRequest[],
    null,
    rootHeaders,
    rootInheritedAuth,
    rootVariables,
    docLevelAuth
  )
  processFolders(
    collection.folders,
    null,
    rootHeaders,
    rootInheritedAuth,
    rootVariables,
    docLevelAuth
  )

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
    // Mark the document so the importer knows tag names use slash-as-folder
    // separator. Round-trip stays exact even when there's only a single
    // nested folder (which the heuristic alone couldn't detect).
    ;(doc as Record<string, unknown>)["x-hoppscotch-folder-tags"] = "slash"
  }

  // Collection-level auth → global security (only when explicit and non-none)
  if (rootInheritedAuth?.authActive) {
    if (rootInheritedAuth.authType !== "none") {
      const collectionAuth = convertAuth(rootInheritedAuth)
      if (collectionAuth) {
        const name = registerSecurityScheme(
          securitySchemes,
          collectionAuth.schemeName,
          collectionAuth.scheme
        )
        doc.security = [{ [name]: collectionAuth.scopes }]
      }
    }
  }

  if (Object.keys(securitySchemes).length > 0) {
    doc.components = { securitySchemes }
  }

  return { doc }
}

/**
 * Wrap multiple top-level collections into a single OpenAPI 3.1 document.
 * Each collection becomes a top-level folder of a synthetic root with the
 * given workspace name, so the resulting tag tree mirrors the workspace
 * structure and the document remains round-trippable through the importer.
 *
 * If two collections share the same (method, path) tuple, OpenAPI's single
 * `paths` map can only represent one operation per pair — the rest are
 * silently dropped by `hoppCollectionToOpenAPI`. The chooser modal already
 * surfaces this lossiness category upfront, so no per-export toast is needed.
 */
export function hoppCollectionsToOpenAPI(
  workspaceName: string,
  collections: HoppCollection[]
): { doc: OpenAPIV3_1.Document } {
  const root = makeCollection({
    name: workspaceName,
    folders: collections,
    requests: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
  })
  return hoppCollectionToOpenAPI(root)
}
