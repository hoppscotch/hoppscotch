import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import { OpenAPIV3 } from "openapi-types"
import { omit } from "lodash"
import { HoppExporter } from "."

function isValidMethod(method: string): method is OpenAPIV3.HttpMethods {
  return [
    "get",
    "post",
    "patch",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
  ].includes(method)
}

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
        E.fromPredicate(isValidMethod, () => "INVALID_METHOD")
      )
    ),
    E.bind("origin", () =>
      pipe(
        E.tryCatch(
          () => new URL(request.endpoint),
          () => "INVALID_URL"
        )
      )
    ),
    E.chainW(({ method, origin }) =>
      pipe(
        {
          pathname: origin.pathname,
          [method]: {
            description: request.name,
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
        },
        E.right
      )
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
    E.chainW((paths) =>
      pipe(
        paths,
        A.reduce({}, (allPaths: OpenAPIV3.PathsObject, path) => ({
          ...allPaths,
          [path.pathname]: omit(path, "pathname"),
        })),
        generateOpenApiDocument,
        E.right
      )
    )
  )

const exporter: HoppExporter<HoppCollection<HoppRESTRequest>[]> = (content) =>
  pipe(content, convertHoppToOpenApiCollection, JSON.stringify, TE.right)

export default exporter
