import parser from "yargs-parser"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
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
import { concatParams, parseURL } from "./sub_helpers/url"
import { preProcessCurlCommand } from "./sub_helpers/preproc"
import { getBody, getFArgumentMultipartData } from "./sub_helpers/body"
import { getDefaultRESTRequest } from "~/newstore/RESTSession"
import {
  objHasProperty,
  arrayObjHasProperty,
} from "~/helpers/functional/object"

const defaultRESTReq = getDefaultRESTRequest()

export const parseCurlCommand = (curlCommand: string) => {
  // const isDataBinary = curlCommand.includes(" --data-binary")

  curlCommand = preProcessCurlCommand(curlCommand)
  const parsedArguments = parser(curlCommand)

  const headerObject = getHeaders(parsedArguments)
  const { headers } = headerObject
  let { rawContentType } = headerObject

  const method = getMethod(parsedArguments)
  // const cookies = getCookies(parsedArguments)
  const urlObject = parseURL(parsedArguments)
  const auth = getAuthObject(parsedArguments, headers, urlObject)

  let rawData: string | string[] = pipe(
    parsedArguments,
    O.fromPredicate(arrayObjHasProperty("d", "string")),
    O.map((args) => args.d),
    O.alt(() =>
      pipe(
        parsedArguments,
        O.fromPredicate(objHasProperty("d", "string")),
        O.map((args) => <string | string[]>args.d)
      )
    ),
    O.getOrElse(() => <string | string[]>"")
  )

  let body: HoppRESTReqBody["body"] = ""
  let contentType: HoppRESTReqBody["contentType"] =
    defaultRESTReq.body.contentType
  let hasBodyBeenParsed = false

  let { queries, danglingParams } = getQueries(urlObject.searchParams.entries())

  if (Array.isArray(rawData)) {
    const pairs = pipe(
      rawData,
      O.of,
      O.map((p) => p.map(decodeURIComponent)),
      O.map((pairs) =>
        pairs.map((pair) => <[string, string]>pair.split("=", 2))
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
      !!pairs
    ) {
      body = pairs.map((p) => p.join(": ")).join("\n") || null
      contentType = "application/x-www-form-urlencoded"
      hasBodyBeenParsed = true
    } else {
      rawData = rawData.join("")
    }
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

    if (
      objHasProperty("body", "string")(bodyObject) ||
      objHasProperty("body", "object")(bodyObject)
    ) {
      body = bodyObject.body
      contentType = bodyObject.contentType
    } else multipartUploads = bodyObject.multipartUploads
  }

  // const compressed = !!parsedArguments.compressed
  const hoppHeaders = recordToHoppHeaders(headers)

  const HoppHeaders =
    hoppHeaders.filter(
      (header) =>
        header.key !== "Authorization" &&
        header.key !== "content-type" &&
        header.key !== "Content-Type" &&
        header.key !== "apikey" &&
        header.key !== "api-key"
    ) || defaultRESTReq.headers

  let finalBody: HoppRESTReqBody = defaultRESTReq.body

  if (
    contentType &&
    contentType !== "multipart/form-data" &&
    typeof body === "string"
  )
    // final body if multipart data is not present
    finalBody = {
      contentType,
      body,
    }
  else if (Object.keys(multipartUploads).length > 0) {
    // if multipart data is present
    const ydob: FormDataKeyValue[] = []
    for (const key in multipartUploads) {
      ydob.push({
        active: true,
        isFile: false,
        key,
        value: multipartUploads[key],
      })
    }
    finalBody = {
      contentType: "multipart/form-data",
      body: ydob,
    }
  }

  return makeRESTRequest({
    name: defaultRESTReq.name,
    endpoint: urlString,
    method: (method || defaultRESTReq.method).toUpperCase(),
    params: queries ?? defaultRESTReq.params,
    headers: HoppHeaders,
    preRequestScript: defaultRESTReq.preRequestScript || "",
    testScript: defaultRESTReq.testScript || "",
    auth,
    body: finalBody,
  })
}
