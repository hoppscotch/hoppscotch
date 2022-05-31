import {
  HoppRESTRequest,
  HoppCollection,
  HoppRESTReqBody,
  knownContentTypes,
  HoppRESTReqBodyFormData,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { pipe, flow } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import { OpenAPIV3 } from "openapi-types"
import { isPlainObject, omit } from "lodash"
import { HoppExporter } from "."

const generateFormDataEntries = (
  formdataBody: HoppRESTReqBodyFormData
): OpenAPIV3.SchemaObject["properties"] =>
  pipe(
    formdataBody.body,
    A.reduce(
      {},
      (
        openApiRequestBody: OpenAPIV3.SchemaObject["properties"],
        formDataItem
      ) => {
        const output: OpenAPIV3.SchemaObject["properties"] = formDataItem.isFile
          ? {
              ...openApiRequestBody,
              [formDataItem.key]: {
                type: "string",
                format: "binary",
              },
            }
          : isPlainObject(formDataItem.value)
          ? {
              ...openApiRequestBody,
              [formDataItem.key]: {
                type: "string",
                default: formDataItem.value,
              },
            }
          : {
              ...openApiRequestBody,
              [formDataItem.key]: {
                default: formDataItem.value,
              },
            }

        return output
      }
    )
  )

const generateEntries = (
  body: HoppRESTReqBody
): OpenAPIV3.SchemaObject["properties"] =>
  pipe(
    Object.entries(body),
    A.reduce(
      {},
      (
        openApiRequestBody: OpenAPIV3.SchemaObject["properties"],
        [key, value]
      ) => {
        return isPlainObject(value)
          ? {
              ...openApiRequestBody,
              [key]: {
                properties: {
                  ...generateEntries(value),
                },
              },
            }
          : {
              ...openApiRequestBody,
              [key]: {
                default: value,
              },
            }
      }
    )
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

// TODO: Make fully functional
export const generateOpenApiRequestBody = (
  hoppRequestBody: HoppRESTReqBody
): E.Either<"INVALID_CONTENT_TYPE", OpenAPIV3.RequestBodyObject> => {
  const contentType = hoppRequestBody.contentType
  const isJson = contentType === "application/json"
  const isValidContentType = contentType && knownContentTypes[contentType]
  const isFormData = contentType === "multipart/form-data"

  if (isValidContentType) {
    if (isJson) {
      const body: HoppRESTReqBody = JSON.parse(hoppRequestBody.body)

      return E.right({
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
    }

    if (isFormData) {
      return E.right({
        content: {
          [contentType]: {
            schema: {
              properties: {
                ...generateFormDataEntries(hoppRequestBody),
              },
            },
          },
        },
      })
    }

    return E.right({
      content: {
        "text/plain": {
          schema: {
            type: "string",
            default: hoppRequestBody.body,
          },
        },
      },
    })
  }

  return E.left("INVALID_CONTENT_TYPE" as const)
}

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
})

const generateOpenApiPathFromRequest = (
  request: HoppRESTRequest
): E.Either<string, OpenAPIV3.PathItemObject & { pathname: string }> =>
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
      pipe(request.body, generateOpenApiRequestBody, E.right)
    ),

    E.bindW("openApiHeaders", () =>
      pipe(request.headers, generateOpenApiHeaders, E.right)
    ),

    E.bindW("openapiQueryParams", () =>
      pipe(request.params, generateOpenApiQueryParams, E.right)
    ),

    E.map(
      ({
        method,
        origin,
        openApiBody,
        openApiHeaders,
        openapiQueryParams,
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
