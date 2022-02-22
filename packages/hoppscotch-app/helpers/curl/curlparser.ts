import * as cookie from "cookie"
import parser from "yargs-parser"
import * as RA from "fp-ts/ReadonlyArray"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"

import {
  HoppRESTAuth,
  FormDataKeyValue,
  HoppRESTReqBody,
  makeRESTRequest,
} from "@hoppscotch/data"
import { detectContentType, parseBody } from "./contentParser"
import { CurlParserRequest } from "."
import { tupleToRecord } from "~/helpers/functional/record"
import { stringArrayJoin } from "~/helpers/functional/array"

export const parseCurlCommand = (curlCommand: string) => {
  const isDataBinary = curlCommand.includes(" --data-binary")

  curlCommand = preProcessCurlCommand(curlCommand)
  const parsedArguments = parser(curlCommand)

  const headers = getHeaders(parsedArguments)
  let rawContentType: string = ""

  if (headers && rawContentType === "")
    rawContentType = headers["Content-Type"] || headers["content-type"] || ""

  let rawData: string | string[] = parsedArguments?.d || ""
  const urlObject = parseURL(parsedArguments)

  let { queries, danglingParams } = getQueries(
    urlObject?.searchParams.entries()
  )

  // if method type is to be set as GET
  if (parsedArguments.G && Array.isArray(rawData)) {
    const pairs = getParamPairs(rawData)
    const newQueries = getQueries(pairs as [string, string][])
    queries = [...queries, ...newQueries.queries]
    danglingParams = [...danglingParams, ...newQueries.danglingParams]
  }
  const urlString = concatParams(urlObject?.origin, danglingParams) || ""

  let multipartUploads: Record<string, string> = pipe(
    parsedArguments,
    O.fromNullable,
    O.chain(getFArgumentMultipartData),
    O.match(
      () => ({}),
      (args) => {
        rawContentType = "multipart/form-data"
        return args
      }
    )
  )

  const auth = getAuthObject(parsedArguments, headers, urlObject)

  let cookies: Record<string, string> | undefined

  const cookieString = parsedArguments.b || parsedArguments.cookie || ""
  if (cookieString) {
    const cookieParseOptions = {
      decode: (s: any) => s,
    }
    // separate out cookie headers into separate data structure
    // note: cookie is case insensitive
    cookies = cookie.parse(
      cookieString.replace(/^Cookie: /gi, ""),
      cookieParseOptions
    )
  }

  const method = getMethod(parsedArguments)
  let body: string | null = ""
  let contentType: HoppRESTReqBody["contentType"] = null

  // just in case
  if (Array.isArray(rawData)) rawData = rawData.join("")

  // if -F is not present, look for content type header
  // -G is used to send --data as get params
  if (rawContentType !== "multipart/form-data" && !parsedArguments.G) {
    const tempBody = pipe(
      O.Do,

      O.bind("rct", () =>
        pipe(
          rawContentType,
          O.fromNullable,
          O.filter(() => !!headers && rawContentType !== "")
        )
      ),

      O.bind("cType", ({ rct }) =>
        pipe(
          rct,
          O.fromNullable,
          O.map((RCT) => RCT.toLowerCase()),
          O.map((RCT) => RCT.split(";")[0]),
          O.map((RCT) => RCT as HoppRESTReqBody["contentType"])
        )
      ),

      O.bind("rData", () =>
        pipe(
          rawData as string,
          O.fromNullable,
          O.filter(() => !!rawData && rawData.length > 0)
        )
      ),

      O.bind("ctBody", ({ rct, cType, rData }) =>
        pipe(rData, getBodyFromContentType(rct, cType))
      )
    )

    if (O.isSome(tempBody)) {
      const { cType, ctBody } = tempBody.value
      contentType = cType
      if (typeof ctBody === "string") body = ctBody
      else multipartUploads = ctBody
    } else if (
      !(
        rawContentType &&
        rawContentType.startsWith("multipart/form-data") &&
        rawContentType.includes("boundary")
      )
    ) {
      const newTempBody = pipe(
        rawData,
        O.fromNullable,
        O.filter(() => !!rawData && rawData.length > 0),
        O.chain(getBodyWithoutContentType)
      )

      if (O.isSome(newTempBody)) {
        const { cType, proData } = newTempBody.value
        contentType = cType
        if (typeof proData === "string") body = proData
        else multipartUploads = proData
      }
    } else {
      body = null
      contentType = null
    }
  }

  const compressed = !!parsedArguments.compressed
  const hoppHeaders = recordToHoppHeaders(headers)

  const request: CurlParserRequest = {
    urlString,
    urlObject,
    compressed,
    queries,
    hoppHeaders,
    method,
    contentType,
    body,
    cookies,
    cookieString: cookieString?.replace(/Cookie: /i, ""),
    multipartUploads,
    isDataBinary,
    auth,
  }

  return request
}

// ############################################ //
// ##            HELPER FUNCTIONS            ## //
// ############################################ //

const replaceables: { [key: string]: string } = {
  "--request": "-X",
  "--header": "-H",
  "--url": "",
  "--form": "-F",
  "--data-raw": "--data",
  "--data": "-d",
  "--data-ascii": "-d",
  "--data-binary": "-d",
  "--user": "-u",
  "--get": "-G",
}

/**
 * Sanitizes curl string
 * @param curlCommand Raw curl command string
 * @returns Processed curl command string
 */
function preProcessCurlCommand(curlCommand: string) {
  // remove '\' and newlines
  curlCommand = curlCommand.replace(/ ?\\ ?$/gm, " ")
  curlCommand = curlCommand.replace(/\n/g, "")

  // remove all $ symbols from start of argument values
  curlCommand = curlCommand.replaceAll("$'", "'")
  curlCommand = curlCommand.replaceAll('$"', '"')

  // replace string for insomnia
  for (const r in replaceables) {
    curlCommand = curlCommand.replace(
      RegExp(` ${r}(["' ])`),
      ` ${replaceables[r]}$1`
    )
  }

  // yargs parses -XPOST as separate arguments. just prescreen for it.
  curlCommand = curlCommand.replace(
    / -X(GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE|CUSTOM)/,
    " -X $1"
  )
  curlCommand = curlCommand.trim()

  return curlCommand
}

/** Parses body based on the content type
 * @param rct Raw content type
 * @param cType Sanitized content type
 * @returns Option of parsed body
 */
function getBodyFromContentType(
  rct: string,
  cType: HoppRESTReqBody["contentType"]
) {
  return (rData: string) => {
    if (cType === "multipart/form-data")
      // put body to multipartUploads in post processing
      return pipe(
        parseBody(rData, cType, rct),
        O.filter((parsedBody) => typeof parsedBody !== "string")
      )
    else
      return pipe(
        parseBody(rData, cType),
        O.filter(
          (parsedBody) =>
            typeof parsedBody === "string" && parsedBody.length > 0
        )
      )
  }
}

/**
 * Detects and parses body without the help of content type
 * @param rawData Raw body string
 * @returns Option of raw data, detected content type and parsed data
 */
function getBodyWithoutContentType(rawData: string) {
  return pipe(
    O.Do,

    O.bind("rData", () =>
      pipe(
        rawData,
        O.fromNullable,
        O.filter((rd) => rd.length > 0)
      )
    ),

    O.bind("cType", ({ rData }) =>
      pipe(rData, detectContentType, O.fromNullable)
    ),

    O.bind("proData", ({ cType, rData }) => parseBody(rData, cType))
  )
}

/**
 * Processes URL string and returns the URL object
 * @param parsedArguments Parsed Arguments object
 * @returns URL object
 */
function parseURL(parsedArguments: parser.Arguments) {
  return pipe(
    parsedArguments?._[1],
    O.fromNullable,
    O.map((u) => u.replace(/["']/g, "")),
    O.map((u) => u.trim()),
    O.chain((u) =>
      pipe(
        /^[^:\s]+(?=:\/\/)/.exec(u),
        O.fromNullable,
        O.map((p) => p[2]),
        O.match(
          // if protocol is not found
          () =>
            pipe(
              // get the base URL
              /^([^\s:@]+:[^\s:@]+@)?([^:/\s]+)([:]*)/.exec(u),
              O.fromNullable,
              O.map((burl) => burl[2]),
              O.map((burl) =>
                burl === "localhost" || burl === "127.0.0.1"
                  ? "http://" + u
                  : "https://" + u
              )
            ),
          (_) => O.some(u)
        )
      )
    ),
    O.map((u) => new URL(u)),
    O.getOrElse(() => {
      // no url found
      for (const argName in parsedArguments) {
        if (
          typeof parsedArguments[argName] === "string" &&
          ["http", "www."].includes(parsedArguments[argName])
        )
          return pipe(
            parsedArguments[argName],
            O.fromNullable,
            O.map((u) => new URL(u)),
            O.match(
              () => undefined,
              (u) => u
            )
          )
      }
    })
  )
}

/**
 * Converts queries to HoppRESTParam format and separates dangling ones
 * @param queries Array or IterableIterator of key value pairs of queries
 * @returns Queries formatted compatible to HoppRESTParam and list of dangling params
 */
function getQueries(
  searchParams:
    | [string, string][]
    | IterableIterator<[string, string]>
    | undefined
) {
  const danglingParams: string[] = []
  const queries = pipe(
    searchParams,
    O.fromNullable,
    O.map((iter) => {
      const params = []

      for (const q of iter) {
        if (q[1] === "") {
          danglingParams.push(q[0])
          continue
        }
        params.push({
          key: q[0],
          value: q[1],
          active: true,
        })
      }
      return params
    }),

    O.getOrElseW(() => [])
  )

  return {
    queries,
    danglingParams,
  }
}

/**
 * Joins dangling params to origin
 * @param origin origin value from the URL Object
 * @param params params without values
 * @returns origin string concatenated with dngling paramas
 */
function concatParams(origin: string | undefined, params: string[]) {
  return pipe(
    O.Do,

    O.bind("originString", () =>
      pipe(
        origin,
        O.fromNullable,
        O.filter((h) => h !== "")
      )
    ),

    O.map(({ originString }) =>
      pipe(
        params,
        O.fromNullable,
        O.filter((dp) => dp.length > 0),
        O.map(stringArrayJoin("&")),
        O.map((h) => originString + "?" + h),
        O.getOrElse(() => originString)
      )
    ),

    O.getOrElse(() => "")
  )
}

/**
 * Parses and structures multipart/form-data from -F argument of curl command
 * @param parsedArguments Parsed Arguments object
 * @returns Option of Record<string, string> type containing key-value pairs of multipart/form-data
 */
function getFArgumentMultipartData(
  parsedArguments: parser.Arguments
): O.Option<Record<string, string>> {
  // -F multipart data

  return pipe(
    parsedArguments.F as Array<string> | string | undefined,
    O.fromNullable,
    O.map((fArgs) => (Array.isArray(fArgs) ? fArgs : [fArgs])),
    O.map((fArgs: string[]) =>
      pipe(
        fArgs.map((multipartArgument: string) => {
          const [key, value] = multipartArgument.split("=", 2)

          if (parsedArguments["form-string"])
            return [key, value] as [string, string]
          return [key, value[0] === "@" || value[0] === "<" ? "" : value] as [
            string,
            string
          ]
        }),
        RA.toArray,
        tupleToRecord
      )
    )
  )
}

/**
 * Get method type from X argument in curl string or
 * find it out through presence of other arguments
 * @param parsedArguments Parsed Arguments object
 * @returns Method type
 */
function getMethod(parsedArguments: parser.Arguments): string {
  const Xarg: string = parsedArguments.X
  return pipe(
    Xarg?.match(/GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE|CUSTOM/i),
    O.fromNullable,
    O.match(
      () => {
        if (parsedArguments.T) return "put"
        else if (parsedArguments.I || parsedArguments.head) return "head"
        else if (
          parsedArguments.d ||
          (parsedArguments.F && !(parsedArguments.G || parsedArguments.get))
        )
          return "post"
        else return "get"
      },
      (method) => method[0]
    )
  )
}

function getHeaders(parsedArguments: parser.Arguments) {
  let headers: Record<string, string> = {}

  headers = pipe(
    parsedArguments.H,
    O.fromNullable,
    O.map((h) => (Array.isArray(h) ? h : [h])),
    O.map((h: string[]) =>
      pipe(
        h.map((header: string) => {
          const [key, value] = header.split(": ")
          return [key.trim(), value.trim()] as [string, string]
        }),
        RA.toArray,
        tupleToRecord
      )
    ),
    O.match(
      () => ({}),
      (h) => h
    )
  )

  const userAgent = parsedArguments.A || parsedArguments["user-agent"]
  if (userAgent) headers["User-Agent"] = userAgent

  return headers
}

function recordToHoppHeaders(headers: Record<string, string>) {
  const hoppHeaders = []
  for (const key of Object.keys(headers)) {
    hoppHeaders.push({
      key,
      value: headers[key],
      active: true,
    })
  }
  return hoppHeaders
}

function getParamPairs(rawdata: string[]) {
  return pipe(
    rawdata,
    O.fromNullable,
    O.map((p) => p.map(decodeURIComponent)),
    O.map((pairs) => pairs.map((pair) => pair.split("="))),
    O.getOrElseW(() => undefined)
  )
}

function getAuthObject(
  parsedArguments: parser.Arguments,
  headers: Record<string, string>,
  urlObject: URL | undefined
): HoppRESTAuth {
  // >> preference order:
  //    - Auth headers
  //    - apikey headers
  //    - --user arg
  //    - Creds provided along with URL

  let auth: HoppRESTAuth = {
    authActive: false,
    authType: "none",
  }
  let username: string = ""
  let password: string = ""

  if (headers?.Authorization) {
    auth = pipe(
      headers?.Authorization,
      O.fromNullable,
      O.map((a) => a.split(" ")),
      O.filter((a) => a.length > 0),
      O.chain((kv) =>
        pipe(
          (() => {
            switch (kv[0].toLowerCase()) {
              case "bearer":
                return {
                  authActive: true,
                  authType: "bearer",
                  token: kv[1],
                }
              case "apikey":
                return {
                  authActive: true,
                  authType: "api-key",
                  key: "apikey",
                  value: kv[1],
                  addTo: "headers",
                }
              case "basic": {
                const buffer = Buffer.from(kv[1], "base64")
                const [username, password] = buffer.toString().split(":")
                return {
                  authActive: true,
                  authType: "basic",
                  username,
                  password,
                }
              }
              default:
                return undefined
            }
          })(),
          O.fromNullable
        )
      ),
      O.getOrElseW(() => ({ authActive: false, authType: "none" }))
    ) as HoppRESTAuth
  } else if (headers?.apikey || headers["api-key"]) {
    const apikey = headers?.apikey || headers["api-key"]
    if (apikey)
      auth = {
        authActive: true,
        authType: "api-key",
        key: headers?.apikey ? "apikey" : "api-key",
        value: apikey,
        addTo: "headers",
      }
  } else {
    if (parsedArguments.u) {
      const user: string = parsedArguments.u ?? ""
      ;[username, password] = user.split(":")
    } else if (urlObject) {
      username = urlObject.username
      password = urlObject.password
    }

    if (!!username && !!password)
      auth = {
        authType: "basic",
        authActive: true,
        username,
        password,
      }
  }

  return auth
}

export function requestToHoppRequest(parsedCurl: CurlParserRequest) {
  const endpoint = parsedCurl.urlString
  const params = parsedCurl.queries || []
  const body = parsedCurl.body

  const method = parsedCurl.method?.toUpperCase() || "GET"
  const contentType = parsedCurl.contentType
  const auth = parsedCurl.auth
  const headers =
    parsedCurl.hoppHeaders.filter(
      (header) =>
        header.key !== "Authorization" &&
        header.key !== "apikey" &&
        header.key !== "api-key"
    ) || []

  let finalBody: HoppRESTReqBody = {
    contentType: null,
    body: null,
  }

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
  else if (Object.keys(parsedCurl.multipartUploads).length > 0) {
    // if multipart data is present
    const ydob: FormDataKeyValue[] = []
    for (const key in parsedCurl.multipartUploads) {
      ydob.push({
        active: true,
        isFile: false,
        key,
        value: parsedCurl.multipartUploads[key],
      })
    }
    finalBody = {
      contentType: "multipart/form-data",
      body: ydob,
    }
  }

  return makeRESTRequest({
    name: "Untitled request",
    endpoint,
    method,
    params,
    headers,
    preRequestScript: "",
    testScript: "",
    auth,
    body: finalBody,
  })
}
