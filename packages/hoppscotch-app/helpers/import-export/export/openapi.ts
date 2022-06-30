import {
  HoppRESTRequest,
  HoppCollection,
  HoppRESTReqBody,
  knownContentTypes,
  HoppRESTReqBodyFormData,
  HoppRESTHeader,
  HoppRESTParam,
  FormDataKeyValue,
  HoppRESTReqBodyNonFormData,
  HoppRestReqBodyEmpty,
  HoppRESTAuth,
  makeRESTRequest,
} from "@hoppscotch/data"
import { pipe, flow } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import { OpenAPIV3 } from "openapi-types"
import isPlainObject from "lodash/isPlainObject"
import omit from "lodash/omit"
import { HoppExporter } from "."
import { tupleToRecord } from "~/helpers/functional/record"
import { safeParseJSON, jsonToBlob } from "~/helpers/functional/json"
import { objHasProperty } from "~/helpers/functional/object"
import { getCombinedEnvVariables } from "~/helpers/preRequest"
import {
  getEffectiveRESTRequest,
  resolvesEnvsInBody,
} from "~/helpers/utils/EffectiveURL"

const convertHoppFormDataEntryToOAFormDataEntry = (
  entry: FormDataKeyValue
): [string, OpenAPIV3.SchemaObject] =>
  entry.isFile
    ? [entry.key, { type: "string", format: "binary" }]
    : [entry.key, { type: "string", default: entry.value }]

const generateFormDataEntries = (
  formdataBody: HoppRESTReqBodyFormData
): OpenAPIV3.SchemaObject["properties"] =>
  pipe(
    formdataBody.body,
    A.map(convertHoppFormDataEntryToOAFormDataEntry),
    tupleToRecord
  )

const convertHoppRestReqBodyEntryToOpenApiBodyEntry = ([key, value]: [
  string,
  unknown
]): [string, OpenAPIV3.SchemaObject] => {
  return [
    key,
    isPlainObject(value)
      ? {
          properties: generateEntries(value as object),
        }
      : {
          default: value,
        },
  ]
}

const generateEntries = (body: object): OpenAPIV3.SchemaObject["properties"] =>
  pipe(
    Object.entries(body),
    A.map(convertHoppRestReqBodyEntryToOpenApiBodyEntry),
    tupleToRecord
  )

const generateOpenApiHeaders = (
  hoppHeaders: HoppRESTHeader[]
): OpenAPIV3.ParameterObject[] =>
  pipe(
    hoppHeaders,
    A.map(
      (header): OpenAPIV3.ParameterObject => ({
        in: "header",
        name: header.key,
        schema: {
          default: header.value,
        },
      })
    )
  )

const generateOpenApiQueryParams = (
  hoppParams: HoppRESTParam[]
): OpenAPIV3.ParameterObject[] =>
  pipe(
    hoppParams,
    A.map((param) => ({
      in: "query",
      name: param.key,
      schema: {
        default: param.value,
      },
    }))
  )

const isValidContentType = (
  contentType: unknown
): contentType is keyof typeof knownContentTypes =>
  !!(
    contentType &&
    typeof contentType === "string" &&
    objHasProperty(contentType, "string")(knownContentTypes)
  )

const isNonFormDataBody = (
  body: HoppRESTReqBody
): body is HoppRESTReqBodyNonFormData =>
  !!(
    body.body &&
    body.contentType &&
    body.contentType !== "multipart/form-data"
  )

const isFormDataBody = (
  body: HoppRESTReqBody
): body is HoppRESTReqBodyFormData => body.contentType === "multipart/form-data"

const isEmptyBody = (body: HoppRESTReqBody): body is HoppRestReqBodyEmpty =>
  !(body.body && body.contentType)

type RequestBodyGenerationError = "INVALID_CONTENT_TYPE" | "INVALID_BODY"

const generateOpenAPIBodyForEmptyBody = (): OpenAPIV3.RequestBodyObject => ({
  content: {},
})

const generateOpenAPIBodyForJSON =
  (contentType: Exclude<HoppRESTReqBody["contentType"], null>) =>
  (body: object): OpenAPIV3.RequestBodyObject => ({
    content: {
      [contentType]: {
        schema: {
          properties: generateEntries(body),
        },
      },
    },
  })

const generateOpenAPIBodyForUrlEncoded = (
  body: string
): OpenAPIV3.RequestBodyObject =>
  pipe(
    Array.from(new URLSearchParams(body)),
    A.map(([key, value]): [string, OpenAPIV3.SchemaObject] => [
      key,
      {
        default: value,
      },
    ]),
    tupleToRecord,
    (properties) => ({
      content: {
        "application/x-www-form-urlencoded": {
          schema: {
            properties,
          },
        },
      },
    })
  )

const generateOpenAPIBodyForPlainText = (
  hoppRequestBody: HoppRESTReqBodyNonFormData
): OpenAPIV3.RequestBodyObject => ({
  content: {
    "text/plain": {
      schema: {
        type: "string",
        default: hoppRequestBody.body,
      },
    },
  },
})

const generateOpenAPIBodyForFormData = (
  hoppRequestBody: HoppRESTReqBodyFormData
) =>
  pipe(
    hoppRequestBody,
    (body): OpenAPIV3.RequestBodyObject => ({
      content: {
        "multipart/form-data": {
          schema: {
            properties: generateFormDataEntries(body),
          },
        },
      },
    })
  )

const isContentTypeJSON = (
  contentType: Exclude<HoppRESTReqBody["contentType"], null>
) => knownContentTypes[contentType] === "json"

const isContentTypeUrlEncoded = (hoppRequestBody: HoppRESTReqBody) =>
  hoppRequestBody.contentType === "application/x-www-form-urlencoded"

/**
 * generates the openapi document body for different content types
 * 1. when the body and content type are null, we return an empty openapi body
 * 2. when the content type is an invalid one, we return INVALID_CONTENT_TYPE error
 * 3. when the content type is json based content types, we convert that to openapi properties recursively
 * 4. multipart/formdata is also handled differently
 * 5. in other valid content types, the body is handled as a string
 */
export const generateOpenApiRequestBody = (
  hoppRequestBody: HoppRESTReqBody
): E.Either<RequestBodyGenerationError, OpenAPIV3.RequestBodyObject> =>
  pipe(
    hoppRequestBody,
    E.fromPredicate(isEmptyBody, () => "NON_EMPTY_BODY" as const),
    E.map(generateOpenAPIBodyForEmptyBody),
    E.altW(() =>
      pipe(
        hoppRequestBody.contentType,
        E.fromPredicate(
          isValidContentType,
          () => "INVALID_CONTENT_TYPE" as const
        ),
        E.chainW((contentType) =>
          pipe(
            hoppRequestBody,
            O.fromPredicate(isNonFormDataBody),
            O.chain((hoppRequestBody) =>
              pipe(
                hoppRequestBody,
                O.fromPredicate(() => isContentTypeJSON(contentType)),
                O.chain(({ body }) => safeParseJSON(body)),
                O.map(generateOpenAPIBodyForJSON(contentType)),
                O.alt(() =>
                  pipe(
                    hoppRequestBody,
                    O.fromPredicate(isContentTypeUrlEncoded),
                    O.map(({ body }) => generateOpenAPIBodyForUrlEncoded(body)),
                    O.alt(() =>
                      pipe(
                        hoppRequestBody,
                        generateOpenAPIBodyForPlainText,
                        O.some
                      )
                    )
                  )
                )
              )
            ),
            O.alt(() =>
              pipe(
                hoppRequestBody,
                O.fromPredicate(isFormDataBody),
                O.map(generateOpenAPIBodyForFormData)
              )
            ),
            E.fromOption(() => "INVALID_BODY" as const)
          )
        )
      )
    )
  )

const OPEN_API_AUTH_NAMES = {
  basic: "basicAuth",
  "api-key": "ApiKeyAuth",
  bearer: "bearerAuth",
} as const

export const generateOpenApiAuth = (
  hoppAuth: HoppRESTAuth
): E.Either<"INVALID_AUTH", OpenAPIV3.SecurityRequirementObject> =>
  hoppAuth.authType === "none"
    ? E.right({})
    : pipe(
        hoppAuth.authType,
        O.fromPredicate(
          (authType): authType is "basic" | "api-key" | "bearer" =>
            ["basic", "api-key", "bearer"].includes(authType)
        ),
        O.map((authType) =>
          pipe(OPEN_API_AUTH_NAMES, (auths) => ({
            [auths[authType]]: [],
          }))
        ),
        E.fromOption(() => "INVALID_AUTH" as const)
      )

const isValidMethod = (method: string): method is OpenAPIV3.HttpMethods =>
  [
    "get",
    "post",
    "patch",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
  ].includes(method)

const generateOpenApiDocument = (
  paths: OpenAPIV3.PathsObject
): OpenAPIV3.Document => ({
  openapi: "3.0.0",
  info: {
    title: "Hoppscotch Openapi Export",
    version: "1.0.0",
  },
  paths,
  components: {
    securitySchemes: {
      basicAuth: {
        type: "http",
        scheme: "basic",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
      ApiKeyAuth: {
        type: "apiKey",
        name: "api-key-header-name",
        in: "header",
      },
    },
  },
})

export type HoppToOpenAPIConversionError =
  | "INVALID_METHOD"
  | "INVALID_URL"
  | "INVALID_CONTENT_TYPE"
  | "INVALID_AUTH"
  | RequestBodyGenerationError

const generateOpenApiPathFromRequest = (
  request: HoppRESTRequest
): E.Either<
  HoppToOpenAPIConversionError,
  OpenAPIV3.PathItemObject & { pathname: string }
> =>
  pipe(
    E.Do,
    E.bind("method", () =>
      pipe(
        request.method.toLowerCase(),
        E.fromPredicate(isValidMethod, () => "INVALID_METHOD" as const)
      )
    ),
    E.bindW("origin", () =>
      pipe(
        E.tryCatch(
          () => new URL(request.endpoint),
          () => "INVALID_URL" as const
        )
      )
    ),

    E.bindW("openApiBody", () => generateOpenApiRequestBody(request.body)),

    E.bindW("openApiHeaders", () =>
      pipe(request.headers, generateOpenApiHeaders, E.right)
    ),

    E.bindW("openapiQueryParams", () =>
      pipe(request.params, generateOpenApiQueryParams, E.right)
    ),

    E.bindW("openapiAuth", () => generateOpenApiAuth(request.auth)),

    E.map(
      ({
        method,
        origin,
        openApiBody,
        openApiHeaders,
        openapiQueryParams,
        openapiAuth,
      }): OpenAPIV3.PathItemObject & { pathname: string } =>
        pipe({
          pathname: origin.pathname,
          [method]: {
            description: request.name,
            requestBody: openApiBody,
            parameters: [...openApiHeaders, ...openapiQueryParams],
            responses: {
              200: {
                description: "",
              },
            },
            security: [openapiAuth],
          },
          servers: [
            {
              url: origin.host,
            },
          ],
        })
    )
  )

const extractAllRequestsFromCollections = (
  collections: HoppCollection<HoppRESTRequest>[]
): HoppRESTRequest[] =>
  pipe(
    collections,
    A.reduce([], (allRequests: HoppRESTRequest[], collection) => [
      ...allRequests,
      ...collection.requests,
      ...extractAllRequestsFromCollections(collection.folders),
    ])
  )

const applyEnvironmentVariables = (request: HoppRESTRequest): HoppRESTRequest =>
  pipe(
    getCombinedEnvVariables(),
    (envVariables) => ({
      name: "tempEnv",
      variables: [...envVariables.selected, ...envVariables.global],
    }),
    (environment) => ({
      effectiveRequest: getEffectiveRESTRequest(request, environment),
      environment,
    }),
    ({ effectiveRequest, environment }) =>
      makeRESTRequest({
        ...effectiveRequest,
        body: resolvesEnvsInBody(effectiveRequest.body, environment),
        headers: effectiveRequest.effectiveFinalHeaders.map((header) => ({
          ...header,
          active: true,
        })),
        params: effectiveRequest.effectiveFinalParams.map((param) => ({
          ...param,
          active: true,
        })),
        endpoint: effectiveRequest.effectiveFinalURL,
      })
  )

export const convertHoppToOpenApiCollection = (
  collections: HoppCollection<HoppRESTRequest>[]
): E.Either<HoppToOpenAPIConversionError, OpenAPIV3.Document> =>
  pipe(
    collections,
    extractAllRequestsFromCollections,
    A.map(applyEnvironmentVariables),
    A.map(generateOpenApiPathFromRequest),
    E.sequenceArray,
    E.map(
      flow(
        RA.toArray,
        A.reduce({}, (allPaths: OpenAPIV3.PathsObject, path) => ({
          ...allPaths,
          [path.pathname]: omit(path, "pathname"),
        })),
        generateOpenApiDocument
      )
    )
  )

const exporter: HoppExporter<HoppRESTRequest, HoppToOpenAPIConversionError> =
  flow(
    convertHoppToOpenApiCollection,
    E.chainW(flow(jsonToBlob, E.right)),
    TE.fromEither
  )

export default exporter
