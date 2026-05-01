import {
  OpenAPI,
  OpenAPIV2,
  OpenAPIV3,
  OpenAPIV3_1 as OpenAPIV31,
} from "openapi-types"
import SwaggerParser from "@apidevtools/swagger-parser"
import yaml from "js-yaml"
import {
  FormDataKeyValue,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  knownContentTypes,
  makeRESTRequest,
  HoppCollection,
  makeCollection,
  HoppRESTRequestVariable,
  HoppRESTRequest,
  HoppRESTRequestResponses,
  HoppRESTResponseOriginalRequest,
  makeHoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import { pipe, flow } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as S from "fp-ts/string"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import * as RA from "fp-ts/ReadonlyArray"
import * as E from "fp-ts/Either"
import { IMPORTER_INVALID_FILE_FORMAT } from ".."
import { cloneDeep } from "lodash-es"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"
import { isNumeric } from "~/helpers/utils/number"
import {
  generateRequestBodyExampleFromOpenAPIV2Body,
  generateRequestBodyExampleFromOpenAPIV2BodySchema as generateV2ExampleFromSchemaObject,
} from "./example-generators/v2"
import { generateRequestBodyExampleFromMediaObject as generateV3Example } from "./example-generators/v3"
import { generateRequestBodyExampleFromMediaObject as generateV31Example } from "./example-generators/v31"

export const OPENAPI_DEREF_ERROR = "openapi/deref_error" as const

const worker = new Worker(
  new URL("../workers/openapi-import-worker.ts", import.meta.url),
  {
    type: "module",
  }
)

const safeParseJSON = (str: string) => O.tryCatch(() => JSON.parse(str))

const safeParseYAML = (str: string) => O.tryCatch(() => yaml.load(str))

const objectHasProperty = <T extends string>(
  obj: unknown,
  propName: T
  // eslint-disable-next-line
): obj is { [propName in T]: unknown } =>
  !!obj &&
  typeof obj === "object" &&
  Object.prototype.hasOwnProperty.call(obj, propName)

// Helper function to check for unresolved references in a document
const hasUnresolvedRefs = (obj: unknown, visited = new WeakSet()): boolean => {
  // Handle non-objects or null
  if (!obj || typeof obj !== "object") return false

  // Check for circular references
  if (visited.has(obj)) return false

  // Add current object to visited set
  visited.add(obj)

  // Check if current object has $ref property
  if ("$ref" in obj && typeof obj.$ref === "string") return true

  // Check arrays
  if (Array.isArray(obj)) {
    return obj.some((item) => hasUnresolvedRefs(item, visited))
  }

  // Check object properties
  return Object.values(obj).some((value) => hasUnresolvedRefs(value, visited))
}

// basic validation for OpenAPI V2 Document
const isOpenAPIV2Document = (doc: unknown): doc is OpenAPIV2.Document => {
  return (
    objectHasProperty(doc, "swagger") &&
    typeof doc.swagger === "string" &&
    doc.swagger === "2.0"
  )
}

// basic validation for OpenAPI V3 Document
const isOpenAPIV3Document = (
  doc: unknown
): doc is OpenAPIV3.Document | OpenAPIV31.Document => {
  return (
    objectHasProperty(doc, "openapi") &&
    typeof doc.openapi === "string" &&
    doc.openapi.startsWith("3.")
  )
}

type OpenAPIPathInfoType =
  | OpenAPIV2.PathItemObject<Record<string, unknown>>
  | OpenAPIV3.PathItemObject<Record<string, unknown>>
  | OpenAPIV31.PathItemObject<Record<string, unknown>>

type OpenAPIParamsType =
  | OpenAPIV2.ParameterObject
  | OpenAPIV3.ParameterObject
  | OpenAPIV31.ParameterObject

type OpenAPIOperationType =
  | OpenAPIV2.OperationObject
  | OpenAPIV3.OperationObject
  | OpenAPIV31.OperationObject

// Resolve request name: operationId > summary > title > "Untitled Request"
const getOpenAPIOperationName = (info: OpenAPIOperationType): string => {
  const title =
    objectHasProperty(info, "title") && typeof info.title === "string"
      ? info.title
      : undefined

  // OpenAPI semantics: `summary` is the short human-readable name shown in
  // tools like Swagger UI; `operationId` is a machine identifier (no spaces,
  // typically code-gen-friendly). Prefer the human-readable one for the
  // Hoppscotch request name; fall back to operationId only if summary is
  // missing. Otherwise round-tripping turns "Get Pet" into "Get_Pet".
  const candidates: Array<string | undefined> = [
    info.summary,
    info.operationId,
    title,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim()
      if (trimmed !== "") {
        return trimmed
      }
    }
  }

  return "Untitled Request"
}

// Removes the OpenAPI Path Templating to the Hoppscotch Templating (<< ? >>)
const replaceOpenApiPathTemplating = flow(
  S.replace(/{/g, "<<"),
  S.replace(/}/g, ">>")
)

/**
 * Read an example/default value off an OpenAPI param-like object and return
 * it as a string. Used by query/header/path parsers so values round-trip.
 *
 * Sources tried, in order:
 *   - `example` (OpenAPI 3.x — what our exporter writes)
 *   - first entry of `examples` (OpenAPI 3.x alternative)
 *   - `x-example` (common Swagger 2.0 extension)
 *   - `default` (Swagger 2.0 — `default` carries the example value, while
 *     OpenAPI 3.x reserves it for schema defaults; v2 docs in the wild
 *     overwhelmingly use `default` for both)
 *   - `schema.default` (OpenAPI 3.x schema-level default)
 */
const readParamExampleAsString = (param: unknown): string => {
  if (typeof param !== "object" || param === null) return ""
  const p = param as {
    example?: unknown
    examples?: unknown
    "x-example"?: unknown
    default?: unknown
    schema?: { default?: unknown }
  }
  const stringify = (v: unknown): string =>
    typeof v === "string" ? v : String(v)

  if (p.example !== undefined && p.example !== null) return stringify(p.example)

  if (p.examples && typeof p.examples === "object") {
    const first = Object.values(p.examples as Record<string, unknown>)[0]
    if (first && typeof first === "object") {
      const v = (first as { value?: unknown }).value
      if (v !== undefined && v !== null) return stringify(v)
    }
  }

  if (p["x-example"] !== undefined && p["x-example"] !== null) {
    return stringify(p["x-example"])
  }

  if (p.default !== undefined && p.default !== null) return stringify(p.default)

  if (p.schema?.default !== undefined && p.schema?.default !== null) {
    return stringify(p.schema.default)
  }

  return ""
}

const parseOpenAPIParams = (params: OpenAPIParamsType[]): HoppRESTParam[] =>
  pipe(
    params,

    A.filterMap(
      flow(
        O.fromPredicate((param) => param.in === "query"),
        O.map(
          (param) =>
            <HoppRESTParam>{
              key: param.name,
              value: readParamExampleAsString(param),
              active: true,
              description: param.description ?? "",
            }
        )
      )
    )
  )

const parseOpenAPIVariables = (
  variables: OpenAPIParamsType[]
): HoppRESTRequestVariable[] =>
  pipe(
    variables,

    A.filterMap(
      flow(
        O.fromPredicate((param) => param.in === "path"),
        O.map(
          (param) =>
            <HoppRESTRequestVariable>{
              key: param.name,
              value: readParamExampleAsString(param),
              active: true,
            }
        )
      )
    )
  )

const parseOpenAPIV3Responses = (
  doc: OpenAPI.Document,
  op: OpenAPIV3.OperationObject | OpenAPIV31.OperationObject,
  originalRequest: HoppRESTResponseOriginalRequest
): HoppRESTRequestResponses => {
  const responses = op.responses
  if (!responses) return {}

  const res: HoppRESTRequestResponses = {}

  for (const [key, value] of Object.entries(responses)) {
    const response = value as
      | OpenAPIV3.ResponseObject
      | OpenAPIV31.ResponseObject

    const contentType = Object.keys(response.content ?? {})[0]
    const mediaObject = response.content?.[contentType] as
      | OpenAPIV3.MediaTypeObject
      | OpenAPIV31.MediaTypeObject
      | undefined

    const name = response.description ?? key

    const code = isNumeric(key) ? Number(key) : 200

    const status = getStatusCodeReasonPhrase(code)

    const headers: HoppRESTHeader[] = [
      {
        key: "content-type",
        value: contentType ?? "application/json",
        description: "",
        active: true,
      },
    ]

    let stringifiedBody = ""
    // Track whether an explicit example was found (even if empty string)
    // to avoid overwriting valid empty examples with schema-generated content
    let hasExplicitExample = false

    if (mediaObject) {
      // Priority: example > examples > generate from schema
      if (mediaObject.example !== undefined) {
        // Direct example on media object
        hasExplicitExample = true
        try {
          stringifiedBody =
            typeof mediaObject.example === "string"
              ? mediaObject.example
              : JSON.stringify(mediaObject.example, null, 2)
        } catch (_e) {
          stringifiedBody = ""
        }
      } else if (
        mediaObject.examples &&
        Object.keys(mediaObject.examples).length > 0
      ) {
        // Examples object (OpenAPI v3 format)
        const firstExampleKey = Object.keys(mediaObject.examples)[0]
        const firstExample = mediaObject.examples[firstExampleKey]

        // Skip if this is an unresolved reference
        if (firstExample && "$ref" in firstExample) {
          // Reference wasn't dereferenced, fall through to schema generation
        } else {
          // Handle Example Object (with value property) or direct value
          const exampleValue =
            firstExample && "value" in firstExample
              ? firstExample.value
              : firstExample

          hasExplicitExample = true
          try {
            stringifiedBody =
              typeof exampleValue === "string"
                ? exampleValue
                : JSON.stringify(exampleValue, null, 2)
          } catch (_e) {
            stringifiedBody = ""
          }
        }
      }

      // Only stringify if an example was generated (undefined indicates failure, null and other values are valid)
      if (!hasExplicitExample && mediaObject.schema) {
        // Generate example from schema as fallback
        try {
          let generatedExample: string | number | boolean | null | object
          if (isOpenAPIV31Document(doc)) {
            generatedExample = generateV31Example(
              mediaObject as OpenAPIV31.MediaTypeObject
            )
          } else {
            generatedExample = generateV3Example(
              mediaObject as OpenAPIV3.MediaTypeObject
            )
          }

          // Only stringify if we got a valid example (null is valid in OpenAPI v3.1)
          if (generatedExample !== undefined) {
            stringifiedBody =
              typeof generatedExample === "string"
                ? generatedExample
                : JSON.stringify(generatedExample, null, 2)
          }
        } catch (_e) {
          // If generation fails, leave body empty
          stringifiedBody = ""
        }
      }
    }

    res[name] = {
      name,
      status,
      code,
      headers,
      body: stringifiedBody,
      originalRequest,
    }
  }

  return res
}

const parseOpenAPIV2Responses = (
  op: OpenAPIV2.OperationObject,
  originalRequest: HoppRESTResponseOriginalRequest
): HoppRESTRequestResponses => {
  const responses = op.responses

  if (!responses) return {}

  const res: HoppRESTRequestResponses = {}

  for (const [key, value] of Object.entries(responses)) {
    const response = value as OpenAPIV2.ResponseObject

    // Get content type from examples or default to application/json
    const contentType = Object.keys(response.examples ?? {})[0]

    const name = response.description ?? key

    const code = isNumeric(Number(key)) ? Number(key) : 200
    const status = getStatusCodeReasonPhrase(code)

    const headers: HoppRESTHeader[] = [
      {
        key: "content-type",
        value: contentType ?? "application/json",
        description: "",
        active: true,
      },
    ]

    let stringifiedBody = ""

    // Priority: examples > generate from schema
    if (response.examples && contentType) {
      // Use the example for the content type
      const exampleBody = response.examples[contentType]
      try {
        stringifiedBody =
          typeof exampleBody === "string"
            ? exampleBody
            : JSON.stringify(exampleBody, null, 2)
      } catch (_e) {
        stringifiedBody = ""
      }
    } else if (response.schema) {
      // Generate example from schema as fallback
      try {
        const generatedExample = generateV2ExampleFromSchemaObject(
          response.schema
        )
        if (generatedExample !== undefined) {
          stringifiedBody =
            typeof generatedExample === "string"
              ? generatedExample
              : JSON.stringify(generatedExample, null, 2)
        }
      } catch (_e) {
        // If generation fails, leave body empty
        stringifiedBody = ""
      }
    }

    res[name] = {
      name,
      status,
      code,
      headers,
      body: stringifiedBody,
      originalRequest,
    }
  }

  return res
}

const parseOpenAPIResponses = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType,
  originalRequest: HoppRESTResponseOriginalRequest
): HoppRESTRequestResponses =>
  isOpenAPIV3Operation(doc, op)
    ? parseOpenAPIV3Responses(doc, op, originalRequest)
    : parseOpenAPIV2Responses(op, originalRequest)

const parseOpenAPIHeaders = (params: OpenAPIParamsType[]): HoppRESTHeader[] =>
  pipe(
    params,

    A.filterMap(
      flow(
        O.fromPredicate((param) => param.in === "header"),
        O.map((header) => {
          return <HoppRESTParam>{
            key: header.name,
            value: readParamExampleAsString(header),
            active: true,
            description: header.description ?? "",
          }
        })
      )
    )
  )

const parseOpenAPIV2Body = (op: OpenAPIV2.OperationObject): HoppRESTReqBody => {
  const obj = (op.consumes ?? [])[0] as string | undefined

  // Not a content-type Hoppscotch supports
  if (!obj || !(obj in knownContentTypes))
    return { contentType: null, body: null }

  // For form data types, extract form fields
  if (
    obj === "multipart/form-data" ||
    obj === "application/x-www-form-urlencoded"
  ) {
    const formDataValues = pipe(
      (op.parameters ?? []) as OpenAPIV2.Parameter[],

      A.filterMap(
        flow(
          O.fromPredicate((param) => param.in === "formData"),
          O.map((param) => {
            const isFile = param.type === "file"
            // Files don't carry a default text value; for non-file fields,
            // pull `default`/`example`/`x-example` so values round-trip.
            // FormDataKeyValue's discriminated union requires `Blob[]` when
            // `isFile: true` and `string` when `false`.
            return <FormDataKeyValue>(isFile
              ? { key: param.name, isFile: true, value: [], active: true }
              : {
                  key: param.name,
                  isFile: false,
                  value: readParamExampleAsString(param),
                  active: true,
                })
          })
        )
      )
    )

    return obj === "application/x-www-form-urlencoded"
      ? {
          contentType: obj,
          body: formDataValues
            .map(({ key, value }) => `${key}: ${value ?? ""}`)
            .join("\n"),
        }
      : { contentType: obj, body: formDataValues }
  }

  // For other content types (JSON, XML, etc.)
  const bodyParam = (op.parameters ?? []).find(
    (param) => (param as OpenAPIV2.Parameter).in === "body"
  ) as OpenAPIV2.InBodyParameterObject | undefined

  if (bodyParam) {
    const result = generateRequestBodyExampleFromOpenAPIV2Body(op)
    if (result) {
      return {
        contentType: obj as any,
        body: result,
      }
    }
  }

  // Fallback to empty body for textual content types
  return { contentType: obj as any, body: "" }
}

const parseOpenAPIV3BodyFormData = (
  contentType: "multipart/form-data" | "application/x-www-form-urlencoded",
  mediaObj: OpenAPIV3.MediaTypeObject | OpenAPIV31.MediaTypeObject
): HoppRESTReqBody => {
  const schema = mediaObj.schema as
    | OpenAPIV3.SchemaObject
    | OpenAPIV31.SchemaObject
    | undefined

  if (!schema || schema.type !== "object") {
    return contentType === "application/x-www-form-urlencoded"
      ? { contentType, body: "" }
      : { contentType, body: [] }
  }

  const properties = (schema.properties ?? {}) as Record<
    string,
    { format?: string; example?: unknown }
  >
  const keys = Object.keys(properties)

  if (contentType === "application/x-www-form-urlencoded") {
    return {
      contentType,
      body: keys
        .map((key) => {
          const example = properties[key]?.example
          const value =
            example !== undefined && example !== null ? String(example) : ""
          return `${key}: ${value}`
        })
        .join("\n"),
    }
  }
  return {
    contentType,
    body: keys.map((key) => {
      const prop = properties[key]
      const isFile = prop?.format === "binary"
      // FormDataKeyValue requires `Blob[]` for files and `string` for others.
      if (isFile) {
        return <FormDataKeyValue>{ key, isFile: true, value: [], active: true }
      }
      const example = prop?.example
      const value =
        example !== undefined && example !== null ? String(example) : ""
      return <FormDataKeyValue>{
        key,
        isFile: false,
        value,
        active: true,
      }
    }),
  }
}

const parseOpenAPIV3Body = (
  doc: OpenAPI.Document,
  op: OpenAPIV3.OperationObject | OpenAPIV31.OperationObject
): HoppRESTReqBody => {
  const objs = Object.entries(
    (
      op.requestBody as
        | OpenAPIV3.RequestBodyObject
        | OpenAPIV31.RequestBodyObject
        | undefined
    )?.content ?? {}
  )

  if (objs.length === 0) return { contentType: null, body: null }

  // We only take the first definition
  const [contentType, media]: [
    string,
    OpenAPIV3.MediaTypeObject | OpenAPIV31.MediaTypeObject,
  ] = objs[0]

  if (!(contentType in knownContentTypes))
    return { contentType: null, body: null }

  // Handle form data types
  if (
    contentType === "multipart/form-data" ||
    contentType === "application/x-www-form-urlencoded"
  )
    return parseOpenAPIV3BodyFormData(contentType, media)

  // Binary uploads have no string body; the schema requires `File | null`.
  if (contentType === "application/octet-stream") {
    return { contentType, body: null } as HoppRESTReqBody
  }

  // For other content types (JSON, XML, etc.), try to generate sample from schema
  if (media.schema) {
    try {
      let sampleBody: string | number | boolean | null | object
      if (isOpenAPIV31Document(doc)) {
        sampleBody = generateV31Example(media as OpenAPIV31.MediaTypeObject)
      } else {
        sampleBody = generateV3Example(media as OpenAPIV3.MediaTypeObject)
      }

      return {
        contentType,
        body:
          typeof sampleBody === "string"
            ? sampleBody
            : JSON.stringify(sampleBody, null, 2),
      } as HoppRESTReqBody
    } catch (_e) {
      // If we can't generate a sample, check for examples
      if (media.example !== undefined) {
        return {
          contentType,
          body:
            typeof media.example === "string"
              ? media.example
              : JSON.stringify(media.example, null, 2),
        } as HoppRESTReqBody
      }
      // Fallback to empty body
      return { contentType, body: "" } as HoppRESTReqBody
    }
  }

  // Check for examples if no schema
  if (media.example !== undefined) {
    return {
      contentType,
      body:
        typeof media.example === "string"
          ? media.example
          : JSON.stringify(media.example, null, 2),
    } as HoppRESTReqBody
  }

  // Check for examples array (OpenAPI v3 supports multiple examples)
  if (media.examples && Object.keys(media.examples).length > 0) {
    const firstExampleKey = Object.keys(media.examples)[0]
    const firstExample = media.examples[firstExampleKey]

    // Skip if this is an unresolved reference
    if (firstExample && "$ref" in firstExample) {
      // Reference wasn't dereferenced, return empty body
      return { contentType, body: "" } as HoppRESTReqBody
    }

    // Handle Example Object (with value property) or direct value
    const exampleValue =
      "value" in firstExample ? firstExample.value : firstExample

    return {
      contentType,
      body:
        typeof exampleValue === "string"
          ? exampleValue
          : JSON.stringify(exampleValue, null, 2),
    } as HoppRESTReqBody
  }

  // Fallback to empty body for textual content types
  return { contentType, body: "" } as HoppRESTReqBody
}

const isOpenAPIV3Operation = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType
): op is OpenAPIV3.OperationObject | OpenAPIV31.OperationObject =>
  objectHasProperty(doc, "openapi") &&
  typeof doc.openapi === "string" &&
  doc.openapi.startsWith("3.")

const isOpenAPIV31Document = (
  doc: OpenAPI.Document
): doc is OpenAPIV31.Document =>
  objectHasProperty(doc, "openapi") &&
  typeof doc.openapi === "string" &&
  doc.openapi.startsWith("3.1")

const parseOpenAPIBody = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType
): HoppRESTReqBody =>
  isOpenAPIV3Operation(doc, op)
    ? parseOpenAPIV3Body(doc, op)
    : parseOpenAPIV2Body(op)

const resolveOpenAPIV3SecurityObj = (
  scheme: OpenAPIV3.SecuritySchemeObject | OpenAPIV31.SecuritySchemeObject,
  _schemeData: string[] // Used for OAuth to pass params
): HoppRESTAuth => {
  if (scheme.type === "http") {
    if (scheme.scheme === "basic") {
      // Basic
      return { authType: "basic", authActive: true, username: "", password: "" }
    } else if (scheme.scheme === "bearer") {
      // Bearer
      return { authType: "bearer", authActive: true, token: "" }
    }
    // Unknown/Unsupported Scheme
    return { authType: "none", authActive: true }
  } else if (scheme.type === "apiKey") {
    if (scheme.in === "header") {
      return {
        authType: "api-key",
        authActive: true,
        addTo: "HEADERS",
        key: scheme.name,
        value: "",
      }
    } else if (scheme.in === "query") {
      return {
        authType: "api-key",
        authActive: true,
        addTo: "QUERY_PARAMS",
        key: scheme.name,
        value: "",
      }
    }
  } else if (scheme.type === "oauth2") {
    // NOTE: We select flow on a first come basis on this order, authorizationCode > implicit > password > clientCredentials
    if (scheme.flows.authorizationCode) {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          grantType: "AUTHORIZATION_CODE",
          authEndpoint: scheme.flows.authorizationCode.authorizationUrl ?? "",
          clientID: "",
          scopes: _schemeData.join(" "),
          token: "",
          isPKCE: false,
          tokenEndpoint: scheme.flows.authorizationCode.tokenUrl ?? "",
          clientSecret: "",
          authRequestParams: [],
          refreshRequestParams: [],
          tokenRequestParams: [],
        },
        addTo: "HEADERS",
      }
    } else if (scheme.flows.implicit) {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          grantType: "IMPLICIT",
          authEndpoint: scheme.flows.implicit.authorizationUrl ?? "",
          clientID: "",
          token: "",
          scopes: _schemeData.join(" "),
          authRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }
    } else if (scheme.flows.password) {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          grantType: "PASSWORD",
          clientID: "",
          authEndpoint: scheme.flows.password.tokenUrl,
          clientSecret: "",
          password: "",
          username: "",
          token: "",
          scopes: _schemeData.join(" "),
          refreshRequestParams: [],
          tokenRequestParams: [],
        },
        addTo: "HEADERS",
      }
    } else if (scheme.flows.clientCredentials) {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          grantType: "CLIENT_CREDENTIALS",
          authEndpoint: scheme.flows.clientCredentials.tokenUrl ?? "",
          clientID: "",
          clientSecret: "",
          scopes: _schemeData.join(" "),
          token: "",
          clientAuthentication: "IN_BODY",
          refreshRequestParams: [],
          tokenRequestParams: [],
        },
        addTo: "HEADERS",
      }
    }
    return {
      authType: "oauth-2",
      authActive: true,
      grantTypeInfo: {
        grantType: "AUTHORIZATION_CODE",
        authEndpoint: "",
        clientID: "",
        scopes: _schemeData.join(" "),
        token: "",
        isPKCE: false,
        tokenEndpoint: "",
        clientSecret: "",
        authRequestParams: [],
        refreshRequestParams: [],
        tokenRequestParams: [],
      },
      addTo: "HEADERS",
    }
  } else if (scheme.type === "openIdConnect") {
    return {
      authType: "oauth-2",
      authActive: true,
      grantTypeInfo: {
        grantType: "AUTHORIZATION_CODE",
        authEndpoint: "",
        clientID: "",
        scopes: _schemeData.join(" "),
        token: "",
        isPKCE: false,
        tokenEndpoint: "",
        clientSecret: "",
        authRequestParams: [],
        refreshRequestParams: [],
        tokenRequestParams: [],
      },
      addTo: "HEADERS",
    }
  }

  return { authType: "none", authActive: true }
}

const resolveOpenAPIV3SecurityScheme = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document,
  schemeName: string,
  schemeData: string[]
): HoppRESTAuth => {
  const scheme = doc.components?.securitySchemes?.[schemeName] as
    | OpenAPIV3.SecuritySchemeObject
    | undefined

  if (!scheme) return { authType: "none", authActive: true }
  return resolveOpenAPIV3SecurityObj(scheme, schemeData)
}

const resolveOpenAPIV3Security = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document,
  security:
    | OpenAPIV3.SecurityRequirementObject[]
    | OpenAPIV31.SecurityRequirementObject[]
): HoppRESTAuth => {
  // NOTE: Hoppscotch only considers the first security requirement
  const sec = security[0] as OpenAPIV3.SecurityRequirementObject | undefined

  if (!sec) return { authType: "none", authActive: true }

  // NOTE: We only consider the first security condition within the first condition
  const [schemeName, schemeData] = (Object.entries(sec)[0] ?? [
    undefined,
    undefined,
  ]) as [string | undefined, string[] | undefined]

  if (!schemeName || !schemeData) return { authType: "none", authActive: true }

  return resolveOpenAPIV3SecurityScheme(doc, schemeName, schemeData)
}

/**
 * Per-operation auth resolution.
 *
 * Returns ONLY the override for a single operation:
 *   - `op.security` undefined         → `inherit` (defer to collection-level)
 *   - `op.security = []`              → `none, active` (explicit opt-out per
 *                                       OpenAPI 3.1 §4.8.10: "an empty array
 *                                       can be used [to remove] a top-level
 *                                       security declaration")
 *   - `op.security = [{schemeA: …}]`  → resolve `schemeA`
 *
 * The doc-level fallback used to live here. It now lives in
 * `parseCollectionLevelAuthV3` so the collection-vs-request distinction
 * round-trips correctly.
 */
const parseOpenAPIV3Auth = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document,
  op: OpenAPIV3.OperationObject | OpenAPIV31.OperationObject
): HoppRESTAuth => {
  if (op.security === undefined) {
    return { authType: "inherit", authActive: true }
  }
  if (op.security.length === 0) {
    return { authType: "none", authActive: true }
  }
  return resolveOpenAPIV3Security(doc, op.security)
}

/**
 * Doc-level auth resolution. Mirrors the per-op logic but reads `doc.security`
 * — gives the collection a single source of truth that all `inherit`-typed
 * requests can defer to.
 */
const parseCollectionLevelAuthV3 = (
  doc: OpenAPIV3.Document | OpenAPIV31.Document
): HoppRESTAuth => {
  if (doc.security === undefined) {
    return { authType: "inherit", authActive: true }
  }
  if (doc.security.length === 0) {
    return { authType: "none", authActive: true }
  }
  return resolveOpenAPIV3Security(doc, doc.security)
}

const resolveOpenAPIV2SecurityScheme = (
  scheme: OpenAPIV2.SecuritySchemeObject,
  _schemeData: string[]
): HoppRESTAuth => {
  if (scheme.type === "basic") {
    return { authType: "basic", authActive: true, username: "", password: "" }
  } else if (scheme.type === "apiKey") {
    // V2 only supports in: header and in: query
    return {
      authType: "api-key",
      addTo: scheme.in === "header" ? "HEADERS" : "QUERY_PARAMS",
      authActive: true,
      key: scheme.name,
      value: "",
    }
  } else if (scheme.type === "oauth2") {
    // NOTE: We select flow on a first come basis on this order, accessCode > implicit > password > application
    if (scheme.flow === "accessCode") {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          authEndpoint: scheme.authorizationUrl ?? "",
          clientID: "",
          clientSecret: "",
          grantType: "AUTHORIZATION_CODE",
          scopes: _schemeData.join(" "),
          token: "",
          isPKCE: false,
          tokenEndpoint: scheme.tokenUrl ?? "",
          authRequestParams: [],
          refreshRequestParams: [],
          tokenRequestParams: [],
        },
        addTo: "HEADERS",
      }
    } else if (scheme.flow === "implicit") {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          authEndpoint: scheme.authorizationUrl ?? "",
          clientID: "",
          grantType: "IMPLICIT",
          scopes: _schemeData.join(" "),
          token: "",
          authRequestParams: [],
          refreshRequestParams: [],
        },
        addTo: "HEADERS",
      }
    } else if (scheme.flow === "application") {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          authEndpoint: scheme.tokenUrl ?? "",
          clientID: "",
          clientSecret: "",
          grantType: "CLIENT_CREDENTIALS",
          scopes: _schemeData.join(" "),
          token: "",
          clientAuthentication: "IN_BODY",
          refreshRequestParams: [],
          tokenRequestParams: [],
        },
        addTo: "HEADERS",
      }
    } else if (scheme.flow === "password") {
      return {
        authType: "oauth-2",
        authActive: true,
        grantTypeInfo: {
          grantType: "PASSWORD",
          authEndpoint: scheme.tokenUrl ?? "",
          clientID: "",
          clientSecret: "",
          password: "",
          scopes: _schemeData.join(" "),
          token: "",
          username: "",
          refreshRequestParams: [],
          tokenRequestParams: [],
        },
        addTo: "HEADERS",
      }
    }
    return {
      authType: "oauth-2",
      authActive: true,
      grantTypeInfo: {
        authEndpoint: "",
        clientID: "",
        clientSecret: "",
        grantType: "AUTHORIZATION_CODE",
        scopes: _schemeData.join(" "),
        token: "",
        isPKCE: false,
        tokenEndpoint: "",
        authRequestParams: [],
        refreshRequestParams: [],
        tokenRequestParams: [],
      },
      addTo: "HEADERS",
    }
  }

  return { authType: "none", authActive: true }
}

const resolveOpenAPIV2SecurityDef = (
  doc: OpenAPIV2.Document,
  schemeName: string,
  schemeData: string[]
): HoppRESTAuth => {
  const scheme = Object.entries(doc.securityDefinitions ?? {}).find(
    ([name]) => schemeName === name
  )

  if (!scheme) return { authType: "none", authActive: true }

  const schemeObj = scheme[1]

  return resolveOpenAPIV2SecurityScheme(schemeObj, schemeData)
}

const resolveOpenAPIV2Security = (
  doc: OpenAPIV2.Document,
  security: OpenAPIV2.SecurityRequirementObject[]
): HoppRESTAuth => {
  // NOTE: Hoppscotch only considers the first security requirement
  const sec = security[0] as OpenAPIV2.SecurityRequirementObject | undefined

  if (!sec) return { authType: "none", authActive: true }

  // NOTE: We only consider the first security condition within the first condition
  const [schemeName, schemeData] = (Object.entries(sec)[0] ?? [
    undefined,
    undefined,
  ]) as [string | undefined, string[] | undefined]

  if (!schemeName || !schemeData) return { authType: "none", authActive: true }

  return resolveOpenAPIV2SecurityDef(doc, schemeName, schemeData)
}

const parseOpenAPIV2Auth = (
  doc: OpenAPIV2.Document,
  op: OpenAPIV2.OperationObject
): HoppRESTAuth => {
  if (op.security === undefined) {
    return { authType: "inherit", authActive: true }
  }
  if (op.security.length === 0) {
    return { authType: "none", authActive: true }
  }
  return resolveOpenAPIV2Security(doc, op.security)
}

const parseCollectionLevelAuthV2 = (doc: OpenAPIV2.Document): HoppRESTAuth => {
  if (doc.security === undefined) {
    return { authType: "inherit", authActive: true }
  }
  if (doc.security.length === 0) {
    return { authType: "none", authActive: true }
  }
  return resolveOpenAPIV2Security(doc, doc.security)
}

/**
 * Resolves the doc-level (collection-level) auth from any supported OpenAPI
 * version. Used once per imported document.
 */
const parseCollectionLevelAuth = (doc: OpenAPI.Document): HoppRESTAuth => {
  if (objectHasProperty(doc, "swagger")) {
    return parseCollectionLevelAuthV2(doc as OpenAPIV2.Document)
  }
  return parseCollectionLevelAuthV3(
    doc as OpenAPIV3.Document | OpenAPIV31.Document
  )
}

const parseOpenAPIAuth = (
  doc: OpenAPI.Document,
  op: OpenAPIOperationType
): HoppRESTAuth =>
  isOpenAPIV3Operation(doc, op)
    ? parseOpenAPIV3Auth(doc as OpenAPIV3.Document | OpenAPIV31.Document, op)
    : parseOpenAPIV2Auth(doc as OpenAPIV2.Document, op)

/**
 * Resolve a doc-level base URL.
 *
 * Returns:
 * - `prefix`: the string each endpoint is prefixed with. Always
 *   `<<baseUrl>>` (Hoppscotch's collection-variable convention) so users get
 *   a single place to edit the host instead of a hardcoded URL repeated
 *   across every request.
 * - `baseUrlValue`: the resolved real URL if the doc declared one (so the
 *   importer can seed a `baseUrl` collection variable with it), or `null`
 *   if the doc had no `servers`/`host` to learn from.
 */
const parseOpenAPIUrl = (
  doc: OpenAPI.Document | OpenAPIV2.Document | OpenAPIV3.Document
): { prefix: string; baseUrlValue: string | null } => {
  const prefix = "<<baseUrl>>"

  // OpenAPI V2 — host + basePath at the doc root, with `schemes` providing
  // the protocol(s). Without a scheme prefix the value isn't a usable URL,
  // so default to `https` (common practice for public APIs) when missing.
  if (objectHasProperty(doc, "swagger")) {
    const host = doc.host?.trim() ?? ""
    const basePath = doc.basePath?.trim() ?? ""
    if (!host && !basePath) return { prefix, baseUrlValue: null }
    const scheme = doc.schemes?.[0] ?? "https"
    const baseUrl = host
      ? `${scheme}://${host}${basePath}`
      : `${scheme}://${basePath.replace(/^\//, "")}`
    return { prefix, baseUrlValue: baseUrl }
  }

  // OpenAPI V3 — first entry of `servers`.
  if (objectHasProperty(doc, "servers")) {
    const serverUrl = doc.servers?.[0]?.url
    if (!serverUrl || serverUrl === "./") {
      return { prefix, baseUrlValue: null }
    }
    // Don't seed a `baseUrl` variable whose value is itself a Hoppscotch
    // placeholder (`<<X>>`). That would create a variable referencing another
    // variable, which is confusing and round-trips badly. The placeholder will
    // simply pass through to the endpoint.
    if (/^<<[a-zA-Z0-9_.-]+>>$/.test(serverUrl)) {
      return { prefix: serverUrl, baseUrlValue: null }
    }
    return { prefix, baseUrlValue: serverUrl }
  }

  return { prefix, baseUrlValue: null }
}

const convertPathToHoppReqs = (
  doc: OpenAPI.Document,
  pathName: string,
  pathObj: OpenAPIPathInfoType
) =>
  pipe(
    ["get", "head", "post", "put", "delete", "options", "patch"] as const,

    // Filter and map out path info
    RA.filterMap(
      flow(
        O.fromPredicate((method) => !!pathObj[method]),
        O.map((method) => ({ method, info: pathObj[method]! }))
      )
    ),

    // Construct request object
    RA.map(({ method, info }) => {
      const { prefix: openAPIUrl } = parseOpenAPIUrl(doc)
      const openAPIPath = replaceOpenApiPathTemplating(pathName)

      const endpoint =
        openAPIUrl.endsWith("/") && openAPIPath.startsWith("/")
          ? openAPIUrl + openAPIPath.slice(1)
          : openAPIUrl + openAPIPath

      const res: {
        request: HoppRESTRequest
        metadata: {
          tags: string[]
        }
      } = {
        request: makeRESTRequest({
          name: getOpenAPIOperationName(info),
          description: info.description ?? null,
          method: method.toUpperCase(),
          endpoint,

          // We don't need to worry about reference types as the Dereferencing pass should remove them
          params: parseOpenAPIParams(
            (info.parameters as OpenAPIParamsType[] | undefined) ?? []
          ),
          headers: parseOpenAPIHeaders(
            (info.parameters as OpenAPIParamsType[] | undefined) ?? []
          ),

          auth: parseOpenAPIAuth(doc, info),

          body: parseOpenAPIBody(doc, info),

          preRequestScript: "",
          testScript: "",

          requestVariables: parseOpenAPIVariables(
            (info.parameters as OpenAPIParamsType[] | undefined) ?? []
          ),

          responses: parseOpenAPIResponses(
            doc,
            info,
            makeHoppRESTResponseOriginalRequest({
              name: getOpenAPIOperationName(info),
              auth: parseOpenAPIAuth(doc, info),
              body: parseOpenAPIBody(doc, info),
              endpoint,
              // We don't need to worry about reference types as the Dereferencing pass should remove them
              params: parseOpenAPIParams(
                (info.parameters as OpenAPIParamsType[] | undefined) ?? []
              ),
              headers: parseOpenAPIHeaders(
                (info.parameters as OpenAPIParamsType[] | undefined) ?? []
              ),
              method: method.toUpperCase(),
              requestVariables: parseOpenAPIVariables(
                (info.parameters as OpenAPIParamsType[] | undefined) ?? []
              ),
            })
          ),
        }),
        metadata: {
          tags: info.tags ?? [],
        },
      }

      return res
    }),

    // Disable Readonly
    RA.toArray
  )

/**
 * Hoppscotch's OpenAPI export encodes nested folders as `/`-separated tag paths
 * (`API/Users` = folder `Users` inside folder `API`). On import we want to
 * reverse that — but slash-as-nesting is a convention, not a spec feature, so
 * we only split when the tag set actually looks hierarchical or the document
 * was produced by Hoppscotch (carrying our explicit marker).
 *
 * Heuristic: split iff at least one pair of tags has a strict segment-prefix
 * relationship (e.g. `API` and `API/Users`, or `API/Users` and `API/Posts`
 * which both share `API`). Single tags with literal slashes like `OAuth/PKCE`
 * are kept flat to avoid mis-importing third-party docs.
 */
const HOPP_FOLDER_TAGS_MARKER = "x-hoppscotch-folder-tags"

export const splitTagSegments = (tag: string): string[] =>
  tag
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

const tagNameToFolderSegments = (
  tagName: string,
  shouldSplit: boolean
): string[] => {
  if (shouldSplit) return splitTagSegments(tagName)
  return tagName.length > 0 ? [tagName] : []
}

export const hasSharedTagPathPrefix = (allTagNames: string[]): boolean => {
  const splits = allTagNames.map(splitTagSegments).filter((s) => s.length > 0)
  if (splits.length < 2) return false

  const sep = " "
  const fullPaths = new Set(splits.map((segs) => segs.join(sep)))

  // (a) any tag has another tag as a strict ancestor
  for (const segs of splits) {
    for (let i = 1; i < segs.length; i++) {
      if (fullPaths.has(segs.slice(0, i).join(sep))) return true
    }
  }

  // (b) two tags share a non-empty segment prefix
  const seenPrefixes = new Set<string>()
  for (const segs of splits) {
    for (let i = 1; i < segs.length; i++) {
      const prefix = segs.slice(0, i).join(sep)
      if (seenPrefixes.has(prefix)) return true
      seenPrefixes.add(prefix)
    }
  }

  return false
}

const docHasFolderTagsMarker = (doc: unknown): boolean =>
  typeof doc === "object" &&
  doc !== null &&
  (doc as Record<string, unknown>)[HOPP_FOLDER_TAGS_MARKER] === "slash"

/**
 * Among the operation's tags, pick the single canonical placement:
 * the deepest (longest) split-segments list, ties broken by first occurrence.
 * Avoids placing a request in `API` when it's also tagged `API/Users`.
 */
export const pickRequestFolderSegments = (
  tags: string[],
  shouldSplit: boolean
): string[] => {
  const segLists = tags
    .map((t) => tagNameToFolderSegments(t, shouldSplit))
    .filter((s) => s.length > 0)
  if (segLists.length === 0) return []
  return segLists.reduce((best, cur) => (cur.length > best.length ? cur : best))
}

type FolderTreeNode = {
  name: string
  description: string | null
  requests: HoppRESTRequest[]
  children: Map<string, FolderTreeNode>
}

const createFolderTreeNode = (name: string): FolderTreeNode => ({
  name,
  description: null,
  requests: [],
  children: new Map(),
})

const getOrCreateFolderNode = (
  root: FolderTreeNode,
  segments: string[]
): FolderTreeNode => {
  let node = root
  for (const seg of segments) {
    let child = node.children.get(seg)
    if (!child) {
      child = createFolderTreeNode(seg)
      node.children.set(seg, child)
    }
    node = child
  }
  return node
}

const folderTreeNodeToCollection = (node: FolderTreeNode): HoppCollection =>
  makeCollection({
    name: node.name,
    description: node.description,
    requests: node.requests,
    folders: [...node.children.values()].map(folderTreeNodeToCollection),
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    preRequestScript: "",
    testScript: "",
  })

const collectOpenApiTagNames = (
  doc: OpenAPI.Document,
  paths: Array<{ metadata: { tags: string[] } }>
): Set<string> => {
  const names = new Set<string>()
  for (const { metadata } of paths) {
    for (const t of metadata.tags) names.add(t)
  }
  if ("tags" in doc && Array.isArray(doc.tags)) {
    for (const t of doc.tags) {
      if (t && typeof t.name === "string") names.add(t.name)
    }
  }
  return names
}

const extractTagDescriptions = (
  doc: OpenAPI.Document
): Record<string, string> => {
  const result: Record<string, string> = {}
  if ("tags" in doc && Array.isArray(doc.tags)) {
    for (const tag of doc.tags as Array<{
      name?: unknown
      description?: unknown
    }>) {
      if (typeof tag.name === "string" && typeof tag.description === "string") {
        result[tag.name] = tag.description
      }
    }
  }
  return result
}

export const convertOpenApiDocsToHopp = (
  docs: OpenAPI.Document[]
): TE.TaskEither<string, HoppCollection[]> => {
  // checking for unresolved references before conversion
  for (const doc of docs) {
    if (hasUnresolvedRefs(doc)) {
      console.warn(
        "Document contains unresolved references which may affect import quality"
      )
      // continue anyway to provide a best-effort import
    }
  }

  const collections = docs.map((doc) => {
    const paths = Object.entries(doc.paths ?? {}).flatMap(
      ([pathName, pathObj]) => convertPathToHoppReqs(doc, pathName, pathObj)
    )
    const allTagNames = collectOpenApiTagNames(doc, paths)
    const tagDescriptions = extractTagDescriptions(doc)
    const { baseUrlValue } = parseOpenAPIUrl(doc)

    // Decide whether to interpret `/` as folder nesting: either an explicit
    // marker from a Hoppscotch export, or the tag set has clear hierarchical
    // structure.
    const shouldSplitTags =
      docHasFolderTagsMarker(doc) || hasSharedTagPathPrefix([...allTagNames])

    const root = createFolderTreeNode("")
    const requestsWithoutTags: HoppRESTRequest[] = []

    // Apply tag descriptions at their (possibly nested) folder level.
    for (const tagName of allTagNames) {
      const desc = tagDescriptions[tagName]
      if (!desc) continue
      const segs = tagNameToFolderSegments(tagName, shouldSplitTags)
      if (segs.length === 0) continue
      const node = getOrCreateFolderNode(root, segs)
      // First description wins if multiple tags collapse to the same path
      // (e.g. `API//Users` and `API/Users` after normalization).
      if (node.description === null) node.description = desc
    }

    // Place each operation at its canonical folder. Multi-tag operations land
    // at one location only (deepest tag); duplicating across folders would
    // break edit semantics on subsequent re-export.
    for (const { metadata, request } of paths) {
      if (metadata.tags.length === 0) {
        requestsWithoutTags.push(request)
        continue
      }
      const targetSegs = pickRequestFolderSegments(
        metadata.tags,
        shouldSplitTags
      )
      if (targetSegs.length === 0) {
        requestsWithoutTags.push(request)
        continue
      }
      const node = getOrCreateFolderNode(root, targetSegs)
      node.requests.push(cloneDeep(request))
    }

    // Seed a `baseUrl` collection variable from the doc's resolved server URL
    // so users have one place to switch hosts (staging/prod/local) instead of
    // every endpoint hardcoding a literal URL.
    const variables =
      baseUrlValue !== null
        ? [
            {
              key: "baseUrl",
              initialValue: baseUrlValue,
              currentValue: baseUrlValue,
              secret: false,
            },
          ]
        : []

    return makeCollection({
      name: doc.info.title,
      description: doc.info.description ?? null,
      folders: [...root.children.values()].map(folderTreeNodeToCollection),
      requests: requestsWithoutTags,
      // Read doc-level security ONCE here so the collection-vs-request
      // structure mirrors the OpenAPI two-layer model. Per-operation reads
      // (in parseOpenAPIV3Auth / parseOpenAPIV2Auth) only return overrides;
      // requests with no override get `inherit` and defer to this value.
      auth: parseCollectionLevelAuth(doc),
      headers: [],
      variables,
      preRequestScript: "",
      testScript: "",
    })
  })

  return TE.of(collections)
}

const parseOpenAPIDocContent = (str: string) =>
  pipe(
    str,
    safeParseJSON,
    O.match(
      () => safeParseYAML(str),
      (data) => O.of(data)
    )
  )

export const hoppOpenAPIImporter = (fileContents: string[]) =>
  pipe(
    // See if we can parse JSON properly
    fileContents,
    A.traverse(O.Applicative)(parseOpenAPIDocContent),
    TE.fromOption(() => {
      return IMPORTER_INVALID_FILE_FORMAT
    }),
    // Try validating, else the importer is invalid file format
    TE.chainW((docArr) => {
      return pipe(
        TE.tryCatch(
          async () => {
            const resultDoc = []

            for (const docObj of docArr) {
              try {
                // More lenient check - if it has paths, we'll try to import it
                const isValidOpenAPISpec =
                  objectHasProperty(docObj, "paths") &&
                  (isOpenAPIV2Document(docObj) ||
                    isOpenAPIV3Document(docObj) ||
                    objectHasProperty(docObj, "info"))

                if (!isValidOpenAPISpec) {
                  throw new Error("INVALID_OPENAPI_SPEC")
                }

                try {
                  const validatedDoc = await validateDocs(docObj)
                  resultDoc.push(validatedDoc)
                } catch (validationError) {
                  // If validation fails but it has basic OpenAPI structure, add it anyway
                  if (objectHasProperty(docObj, "paths")) {
                    resultDoc.push(docObj as OpenAPI.Document)
                  } else {
                    throw validationError
                  }
                }
              } catch (err) {
                if (
                  err instanceof Error &&
                  err.message === "INVALID_OPENAPI_SPEC"
                ) {
                  throw new Error("INVALID_OPENAPI_SPEC")
                }

                if (
                  // @ts-expect-error the type for err is not exported from the library
                  err.files &&
                  // @ts-expect-error the type for err is not exported from the library
                  err.files instanceof SwaggerParser &&
                  // @ts-expect-error the type for err is not exported from the library
                  err.files.schema
                ) {
                  // @ts-expect-error the type for err is not exported from the library
                  resultDoc.push(err.files.schema)
                }
              }
            }
            return resultDoc
          },
          () => {
            return IMPORTER_INVALID_FILE_FORMAT
          }
        )
      )
    }),
    // Deference the references
    TE.chainW((docArr) =>
      pipe(
        TE.tryCatch(
          async () => {
            const resultDoc = []

            for (const docObj of docArr) {
              try {
                const validatedDoc = await dereferenceDocs(docObj)
                resultDoc.push(validatedDoc)
              } catch (_error) {
                // Check if the document has unresolved references
                if (hasUnresolvedRefs(docObj)) {
                  console.warn(
                    "Document contains unresolved references which may affect import quality"
                  )
                }

                // If dereferencing fails, use the original document
                resultDoc.push(docObj)
              }
            }

            return resultDoc
          },
          () => {
            return OPENAPI_DEREF_ERROR
          }
        )
      )
    ),
    TE.chainW(convertOpenApiDocsToHopp)
  )

const validateDocs = (docs: any): Promise<OpenAPI.Document> => {
  return new Promise((resolve, reject) => {
    worker.postMessage({
      type: "validate",
      docs,
    })

    worker.onmessage = (event) => {
      if (event.data.type === "VALIDATION_RESULT") {
        if (E.isLeft(event.data.data)) {
          reject("COULD_NOT_VALIDATE")
        } else {
          resolve(event.data.data.right as OpenAPI.Document)
        }
      }
    }
  })
}

const dereferenceDocs = (docs: any): Promise<OpenAPI.Document> => {
  return new Promise((resolve, reject) => {
    worker.postMessage({
      type: "dereference",
      docs,
    })

    worker.onmessage = (event) => {
      if (event.data.type === "DEREFERENCE_RESULT") {
        if (E.isLeft(event.data.data)) {
          reject("COULD_NOT_DEREFERENCE")
        } else {
          resolve(event.data.data.right as OpenAPI.Document)
        }
      }
    }
  })
}
