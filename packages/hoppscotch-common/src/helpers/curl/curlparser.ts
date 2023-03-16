/**
 * the direct import from yargs-parser uses fs which is a built in node module,
 * just adding the /browser import as a fix for now, which does not have type info on DefinitelyTyped.
 * remove/update this comment before merging the vue3 port.
 */
import parser from "yargs-parser/browser"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import { pipe, flow } from "fp-ts/function"
import {
  FormDataKeyValue,
  HoppRESTReqBody,
  makeRESTRequest,
} from "@hoppscotch/data"
import { getAuthObject } from "./sub_helpers/auth"
import { getHeaders, recordToHoppHeaders } from "./sub_helpers/headers"
// import { getCookies } from "./sub_helpers/cookies"
import { getQueries } from "./sub_helpers/queries"
import { getMethod } from "./sub_helpers/method"
import { concatParams, getURLObject } from "./sub_helpers/url"
import { preProcessCurlCommand } from "./sub_helpers/preproc"
import { getBody, getFArgumentMultipartData } from "./sub_helpers/body"
import { getDefaultRESTRequest } from "../rest/default"
import {
  objHasProperty,
  objHasArrayProperty,
} from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

export const parseCurlCommand = (curlCommand: string) => {
  // const isDataBinary = curlCommand.includes(" --data-binary")
  // const compressed = !!parsedArguments.compressed

  curlCommand = preProcessCurlCommand(curlCommand)
  const parsedArguments = parser(curlCommand)

  const headerObject = getHeaders(parsedArguments)
  const { headers } = headerObject
  let { rawContentType } = headerObject
  const hoppHeaders = pipe(
    headers,
    O.fromPredicate(() => Object.keys(headers).length > 0),
    O.map(recordToHoppHeaders),
    O.getOrElse(() => defaultRESTReq.headers)
  )

  const method = getMethod(parsedArguments)
  // const cookies = getCookies(parsedArguments)
  const urlObject = getURLObject(parsedArguments)
  const auth = getAuthObject(parsedArguments, headers, urlObject)

  let rawData: string | string[] = pipe(
    parsedArguments,
    O.fromPredicate(objHasArrayProperty("d", "string")),
    O.map((args) => args.d),
    O.altW(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasProperty("d", "string")),
        O.map((args) => args.d)
      )
    ),
    O.getOrElseW(() => "")
  )

  let body: HoppRESTReqBody["body"] = ""
  let contentType: HoppRESTReqBody["contentType"] =
    defaultRESTReq.body.contentType
  let hasBodyBeenParsed = false

  let { queries, danglingParams } = getQueries(
    Array.from(urlObject.searchParams.entries())
  )

  const stringToPair = flow(
    decodeURIComponent,
    (pair) => <[string, string]>pair.split("=", 2)
  )
  const pairs = pipe(
    rawData,
    O.fromPredicate(Array.isArray),
    O.map(A.map(stringToPair)),
    O.alt(() =>
      pipe(
        rawData,
        O.fromPredicate((s) => s.length > 0),
        O.map(() => [stringToPair(rawData as string)])
      )
    ),
    O.getOrElseW(() => undefined)
  )

  if (objHasProperty("G", "boolean")(parsedArguments) && !!pairs) {
    const newQueries = getQueries(pairs)
    queries = [...queries, ...newQueries.queries]
    danglingParams = [...danglingParams, ...newQueries.danglingParams]
    hasBodyBeenParsed = true
  } else if (
    rawContentType.includes("application/x-www-form-urlencoded") &&
    !!pairs &&
    Array.isArray(rawData)
  ) {
    body = pairs.map((p) => p.join(": ")).join("\n") || null
    contentType = "application/x-www-form-urlencoded"
    hasBodyBeenParsed = true
  }

  const urlString = concatParams(urlObject, danglingParams)

  let multipartUploads: Record<string, string> = pipe(
    O.of(parsedArguments),
    O.chain(getFArgumentMultipartData),
    O.match(
      () => ({}),
      (args) => {
        hasBodyBeenParsed = true
        rawContentType = "multipart/form-data"
        return args
      }
    )
  )

  if (!hasBodyBeenParsed) {
    if (typeof rawData !== "string") {
      rawData = rawData.join("")
    }
    const bodyObject = getBody(rawData, rawContentType, contentType)

    if (O.isSome(bodyObject)) {
      const bodyObjectValue = bodyObject.value

      if (bodyObjectValue.type === "FORMDATA") {
        multipartUploads = bodyObjectValue.body
      } else {
        body = bodyObjectValue.body.body
        contentType = bodyObjectValue.body
          .contentType as HoppRESTReqBody["contentType"]
      }
    }
  }

  const finalBody: HoppRESTReqBody = pipe(
    body,
    O.fromNullable,
    O.filter((b) => b.length > 0),
    O.map((b) => <HoppRESTReqBody>{ body: b, contentType }),
    O.alt(() =>
      pipe(
        multipartUploads,
        O.of,
        O.map((m) => Object.entries(m)),
        O.filter((m) => m.length > 0),
        O.map(
          flow(
            A.map(
              ([key, value]) =>
                <FormDataKeyValue>{
                  active: true,
                  isFile: false,
                  key,
                  value,
                }
            ),
            (b) =>
              <HoppRESTReqBody>{ body: b, contentType: "multipart/form-data" }
          )
        )
      )
    ),
    O.getOrElse(() => defaultRESTReq.body)
  )

  return makeRESTRequest({
    name: defaultRESTReq.name,
    endpoint: urlString,
    method: (method || defaultRESTReq.method).toUpperCase(),
    params: queries ?? defaultRESTReq.params,
    headers: hoppHeaders,
    preRequestScript: defaultRESTReq.preRequestScript,
    testScript: defaultRESTReq.testScript,
    auth,
    body: finalBody,
  })
}
