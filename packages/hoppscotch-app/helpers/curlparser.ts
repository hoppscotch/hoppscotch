import * as URL from "url"
import * as querystring from "querystring"
import * as cookie from "cookie"
import parser from "yargs-parser"
import * as RA from "fp-ts/ReadonlyArray"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"

import { HoppRESTReqBody } from "@hoppscotch/data"
import { tupleToRecord } from "./functional/record"
import { detectContentType, parseBody } from "./contentParser"
import { RESTMethod } from "./types/RESTMethod"
import { curlParserRequest } from "~/helpers/types/CurlParserResult"

const parseCurlCommand = (curlCommand: string) => {
  curlCommand = preProcessCurlCommand(curlCommand)
  const parsedArguments = parser(curlCommand)

  const rawData: string = parsedArguments?.d || ""

  let cookieString
  let cookies
  let url = getStructuredURL(parsedArguments)

  let rawContentType: string = ""
  let multipartUploads: Record<string, string> = pipe(
    parsedArguments,
    getFArgumentMultipartData,
    O.match(
      () => {
        return {}
      },
      (args) => {
        rawContentType = "multipart/form-data"
        return args
      }
    )
  )

  const headers = getHeaders(parsedArguments)

  if (headers && rawContentType === "")
    rawContentType = headers["Content-Type"] || headers["content-type"] || ""

  let auth
  if (headers?.Authorization) {
    const [type, token] = headers.Authorization.split(" ", 2)

    // TODO:
    switch (type) {
      case "Bearer":
        auth = {
          type,
          token,
        }
        delete headers.Authorization
        break
    }
  }

  if (parsedArguments.b) {
    cookieString = parsedArguments.b
  }
  if (parsedArguments.cookie) {
    cookieString = parsedArguments.cookie
  }
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

  // if -F is not present, look for content type header
  if (rawContentType !== "multipart/form-data") {
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
          rawData,
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
  let urlObject = URL.parse(url) // eslint-disable-line

  // if GET request with data, convert data to query string
  // NB: the -G flag does not change the http verb. It just moves the data into the url.
  if (parsedArguments.G || parsedArguments.get) {
    urlObject.query = urlObject.query ? urlObject.query : ""
    const option =
      "d" in parsedArguments ? "d" : "data" in parsedArguments ? "data" : null
    if (option) {
      let urlQueryString = ""

      if (!url.includes("?")) {
        url += "?"
      } else {
        urlQueryString += "&"
      }

      if (typeof parsedArguments[option] === "object") {
        urlQueryString += parsedArguments[option].join("&")
      } else {
        urlQueryString += parsedArguments[option]
      }
      urlObject.query += urlQueryString
      url += urlQueryString
      delete parsedArguments[option]
    }
  }
  // TODO
  const query = querystring.parse(urlObject.query!, null as any, null as any, {
    maxKeys: 10000,
  })

  const isDataBinary = !!parsedArguments["data-binary"]

  urlObject.search = null // Clean out the search/query portion.
  const request: curlParserRequest = {
    url,
    urlWithoutQuery: URL.format(urlObject),
    compressed,
    query,
    headers,
    method,
    contentType,
    body,
    cookies,
    cookieString: cookieString?.replace("Cookie: ", ""),
    multipartUploads,
    ...(isDataBinary && { isDataBinary }),
    ...(auth && { auth }),
    ...(parsedArguments?.u && { user: parsedArguments?.u }),
  }

  return request
}

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
 * Processes and returns the URL string
 * @param parsedArguments Parsed Arguments object
 * @returns URL string
 */
function getStructuredURL(parsedArguments: parser.Arguments): string {
  let url = parsedArguments?._[1]

  if (!url) {
    for (const argName in parsedArguments) {
      if (
        typeof parsedArguments[argName] === "string" &&
        ["http", "www."].includes(parsedArguments[argName])
      )
        url = parsedArguments[argName]
    }
  }

  // if protocol is absent,
  // prepend https (or http if host is localhost)
  if (typeof url === "string" && url.length > 0) {
    // get rid of double and single quotes that have snuck in
    url = url.replace(/["']/g, "")

    let urlCopy = url
    const protocol = /^[^:]+(?=:\/\/)/.exec(urlCopy)

    if (protocol === null) {
      // if urlCopy has basic auth, strip it off
      if (urlCopy.includes("@")) urlCopy = urlCopy.split("@")[1]
      urlCopy = urlCopy.split("/")[0]

      if (urlCopy.includes("localhost") || urlCopy.includes("127.0.0.1")) {
        url = "http://" + url
      } else {
        url = "https://" + url
      }
    }
  }

  return url
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
function getMethod(parsedArguments: parser.Arguments): RESTMethod {
  const Xarg: string = parsedArguments.X
  return pipe(
    Xarg?.match(/GET|POST|PUT|PATCH|DELETE|HEAD|CONNECT|OPTIONS|TRACE|CUSTOM/i),
    O.fromNullable,
    O.match(
      () => {
        if (parsedArguments.T) return "put"
        else if (
          parsedArguments.d ||
          (parsedArguments.F && !(parsedArguments.G || parsedArguments.get))
        )
          return "post"
        else if (parsedArguments.T || parsedArguments.head) return "head"
        else return "get"
      },
      (method) => method[0] as RESTMethod
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
          const [key, value] = header.split(":", 2)
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

export default parseCurlCommand
