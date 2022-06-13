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
import { safeParseJSON } from "~/helpers/functional/json"
import { objHasProperty } from "~/helpers/functional/object"

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
          properties: {
            ...generateEntries(value as object),
          },
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

type RequestBodyGenerationErrors = "INVALID_CONTENT_TYPE" | "INVALID_BODY"

export const generateOpenApiRequestBody = (
  hoppRequestBody: HoppRESTReqBody
): E.Either<RequestBodyGenerationErrors, OpenAPIV3.RequestBodyObject> =>
  pipe(
    hoppRequestBody,
    E.fromPredicate(isEmptyBody, () => "NON_EMPTY_BODY"),
    E.map(
      (): OpenAPIV3.RequestBodyObject => ({
        content: {},
      })
    ),
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
                O.fromPredicate(
                  (hoppRequestBody) =>
                    knownContentTypes[hoppRequestBody.contentType] === "json"
                ),
                O.chain(({ body }) => safeParseJSON(body)),
                O.map(
                  (body): OpenAPIV3.RequestBodyObject => ({
                    content: {
                      [contentType]: {
                        schema: {
                          properties: {
                            ...generateEntries(body),
                          },
                        },
                      },
                    },
                  })
                ),
                O.alt(() =>
                  pipe(
                    hoppRequestBody,
                    (hoppRequestBody): OpenAPIV3.RequestBodyObject => ({
                      content: {
                        "text/plain": {
                          schema: {
                            type: "string",
                            default: hoppRequestBody.body,
                          },
                        },
                      },
                    }),
                    O.some
                  )
                )
              )
            ),
            O.alt(() =>
              pipe(
                hoppRequestBody,
                O.fromPredicate(isFormDataBody),
                O.map(
                  (body): OpenAPIV3.RequestBodyObject => ({
                    content: {
                      [contentType]: {
                        schema: {
                          properties: {
                            ...generateFormDataEntries(body),
                          },
                        },
                      },
                    },
                  })
                )
              )
            ),
            E.fromOption(() => "INVALID_BODY" as const)
          )
        )
      )
    )
  )

export const generateOpenApiAuth = (
  hoppAuth: HoppRESTAuth
): E.Either<"INVALID_AUTH", OpenAPIV3.SecurityRequirementObject> =>
  pipe(
    hoppAuth.authType,
    O.fromPredicate((authType) => authType === "none"),
    O.map(() => ({})),
    O.alt(() =>
      pipe(
        hoppAuth.authType,
        O.fromPredicate(
          (authType): authType is "basic" | "api-key" | "bearer" =>
            authType !== "none" && authType !== "oauth-2"
        ),
        O.map((authType) =>
          pipe(
            {
              basic: "basicAuth",
              "api-key": "ApiKeyAuth",
              bearer: "bearerAuth",
            },
            (auths) => ({
              [auths[authType]]: [],
            })
          )
        )
      )
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

type PathGenerationErrors =
  | "INVALID_METHOD"
  | "INVALID_URL"
  | "INVALID_CONTENT_TYPE"
  | "INVALID_AUTH"
  | RequestBodyGenerationErrors

const generateOpenApiPathFromRequest = (
  request: HoppRESTRequest
): E.Either<
  PathGenerationErrors,
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

    E.bindW("openApiBody", () =>
      pipe(request.body, generateOpenApiRequestBody)
    ),

    E.bindW("openApiHeaders", () =>
      pipe(request.headers, generateOpenApiHeaders, E.right)
    ),

    E.bindW("openapiQueryParams", () =>
      pipe(request.params, generateOpenApiQueryParams, E.right)
    ),

    E.bindW("openapiAuth", () => pipe(request.auth, generateOpenApiAuth)),

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
            security: openapiAuth,
          },
          servers: [
            {
              url: origin.host,
            },
          ],
        })
    )
  )

export const convertHoppToOpenApiCollection = (
  collections: HoppCollection<HoppRESTRequest>[]
): E.Either<string, OpenAPIV3.Document> =>
  pipe(
    collections,
    A.map((collection) =>
      pipe(collection.requests, A.map(generateOpenApiPathFromRequest))
    ),
    A.flatten,
    E.sequenceArray,
    E.map(RA.toArray),
    E.map(
      flow(
        A.reduce({}, (allPaths: OpenAPIV3.PathsObject, path) => ({
          ...allPaths,
          [path.pathname]: omit(path, "pathname"),
        })),
        generateOpenApiDocument
      )
    )
  )

const exporter: HoppExporter<HoppCollection<HoppRESTRequest>[]> = flow(
  convertHoppToOpenApiCollection,
  JSON.stringify,
  TE.right
)

export default exporter
