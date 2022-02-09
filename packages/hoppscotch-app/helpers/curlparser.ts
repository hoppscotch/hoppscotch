import * as URL from "url"
import * as querystring from "querystring"
import * as cookie from "cookie"
import parser from "yargs-parser"
import * as RA from "fp-ts/ReadonlyArray"
import * as O from "fp-ts/Option"
// import * as E from "fp-ts/Either" // replace promise
import { pipe } from "fp-ts/function"

import { HoppRESTReqBody } from "@hoppscotch/data"
import { tupleToRecord } from "./functional/record"
import { detectContentType, parseBody } from "./contentParser"
import { curlParserRequest } from "helpers/types/CurlParserResult"

/**
 * given this: [ 'msg1=value1', 'msg2=value2' ]
 * output this: 'msg1=value1&msg2=value2'
 * @param dataArguments
 */
const joinDataArguments = (dataArguments: string[]) => dataArguments.join("&")

const parseCurlCommand = (curlCommand: string) => {
  // remove '\' and newlines
  curlCommand = curlCommand.replace(/ ?\\ ?$/gm, " ")
  curlCommand = curlCommand.replace(/\n/g, "")

  // remove all $ symbols from start of argument values
  curlCommand = curlCommand.replaceAll("$'", "'")
  curlCommand = curlCommand.replaceAll('$"', '"')

  // replace string for insomnia
  const replaceables: { [key: string]: string } = {
    "--request": "-X",
    "--header": "-H",
    "--url": "",
    "--form": "-F",
    "--data-raw": "--data",
    "--data": "-d",
    "--user": "-u",
  }
  for (const r in replaceables) {
    for (const sym of ["'", '"', " "])
      curlCommand = curlCommand.replace(RegExp(r + sym), replaceables[r] + sym)
  }

  // yargs parses -XPOST as separate arguments. just prescreen for it.
  curlCommand = curlCommand.replace(/-XPOST/, " -X POST")
  curlCommand = curlCommand.replace(/-XGET/, " -X GET")
  curlCommand = curlCommand.replace(/-XPUT/, " -X PUT")
  curlCommand = curlCommand.replace(/-XPATCH/, " -X PATCH")
  curlCommand = curlCommand.replace(/-XDELETE/, " -X DELETE")
  curlCommand = curlCommand.trim()
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

  let headers: any

  const parseHeaders = (headerFieldName: string) => {
    if (parsedArguments[headerFieldName]) {
      if (!headers) {
        headers = {}
      }
      if (!Array.isArray(parsedArguments[headerFieldName])) {
        parsedArguments[headerFieldName] = [parsedArguments[headerFieldName]]
      }
      parsedArguments[headerFieldName].forEach((header: string) => {
        if (header.includes("Cookie")) {
          // stupid javascript tricks: closure
          cookieString = header
        } else {
          const colonIndex = header.indexOf(":")
          const headerName = header.substring(0, colonIndex)
          const headerValue = header.substring(colonIndex + 1).trim()
          headers[headerName] = headerValue
        }
      })
    }
  }

  parseHeaders("H")
  parseHeaders("header")
  if (parsedArguments.A) {
    if (!headers) {
      headers = []
    }
    headers["User-Agent"] = parsedArguments.A
  } else if (parsedArguments["user-agent"]) {
    if (!headers) {
      headers = []
    }
    headers["User-Agent"] = parsedArguments["user-agent"]
  }

  if (headers && rawContentType === "")
    rawContentType = headers["Content-Type"] || headers["content-type"] || ""

  let auth
  if (headers?.Authorization) {
    const [type, token]: string = headers.Authorization.split(" ")

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
  let method
  if (parsedArguments.X === "POST") {
    method = "post"
  } else if (parsedArguments.X === "PUT" || parsedArguments.T) {
    method = "put"
  } else if (parsedArguments.X === "PATCH") {
    method = "patch"
  } else if (parsedArguments.X === "DELETE") {
    method = "delete"
  } else if (parsedArguments.X === "OPTIONS") {
    method = "options"
  } else if (
    (parsedArguments.d ||
      parsedArguments.data ||
      parsedArguments["data-ascii"] ||
      parsedArguments["data-binary"] ||
      parsedArguments.F ||
      parsedArguments.form) &&
    !(parsedArguments.G || parsedArguments.get)
  ) {
    method = "post"
  } else if (parsedArguments.I || parsedArguments.head) {
    method = "head"
  } else {
    method = "get"
  }

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
    ...parseDataFromArguments(parsedArguments),
    ...(auth && { auth }),
    ...(parsedArguments?.u && { user: parsedArguments?.u }),
  }

  return request
}

function getBodyFromContentType(
  rct: string,
  cType: HoppRESTReqBody["contentType"]
) {
  return (rData: string) => {
    switch (cType) {
      case "application/x-www-form-urlencoded":
      case "application/json": {
        return pipe(
          parseBody(rData, cType),
          O.filter(
            (parsedBody) =>
              typeof parsedBody === "string" && parsedBody.length > 0
          )
        )
      }
      case "multipart/form-data": {
        // put body to multipartUploads in post processing
        return pipe(
          parseBody(rData, cType, rct),
          O.filter((parsedBody) => typeof parsedBody !== "string")
        )
      }
      case "application/hal+json":
      case "application/ld+json":
      case "application/vnd.api+json":
      case "application/xml":
      case "text/html":
      case "text/plain":
      default:
        return O.some(rData)
    }
  }
}

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

function parseDataFromArguments(parsedArguments: parser.Arguments): {
  data: string
  dataArray: string[] | null
  isDataBinary: boolean
} {
  const isDataBinary = !!parsedArguments["data-binary"]
  const data: string | string[] | null =
    parsedArguments.data ||
    parsedArguments["data-binary"] ||
    parsedArguments["data-ascii"] ||
    null

  // FIXME: Type definitions don't work without coercion
  return pipe(
    data,
    O.fromNullable,
    O.filter(Array.isArray),
    O.map((d) => joinDataArguments(d)),
    O.match(
      () => ({
        data: data as string,
        dataArray: null as string[] | null,
        isDataBinary,
      }),
      (joinedData) => ({
        data: joinedData,
        dataArray: data as string[],
        isDataBinary,
      })
    )
  )
}

function getStructuredURL(parsedArguments: parser.Arguments): string {
  let url = parsedArguments?._[1]

  // get rid of double and single quotes that have snuck in
  url = url.replace(/["']/g, "")
  if (!url) {
    for (const argName in parsedArguments) {
      if (typeof parsedArguments[argName] === "string") {
        if (["http", "www."].includes(parsedArguments[argName])) {
          url = parsedArguments[argName]
        }
      }
    }
  }

  // if protocol is absent,
  // prepend https (or http if host is localhost)
  if (typeof url === "string") {
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
          return [key, value[0] === "@" ? "" : value] as [string, string]
        }),
        RA.toArray,
        tupleToRecord
      )
    )
  )
}

export default parseCurlCommand
