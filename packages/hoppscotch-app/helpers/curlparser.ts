import * as URL from "url"
import * as querystring from "querystring"
import * as cookie from "cookie"
import parser from "yargs-parser"
import { HoppRESTReqBody } from "@hoppscotch/data"

import { detectContentType, parseBody } from "./contentParser"
import { isType } from "./typeutils"

/**
 * given this: [ 'msg1=value1', 'msg2=value2' ]
 * output this: 'msg1=value1&msg2=value2'
 * @param dataArguments
 */
const joinDataArguments = (dataArguments: string[]) => dataArguments.join("&")

const parseDataFromArguments = (parsedArguments: any) => {
  if (parsedArguments.data) {
    return {
      data: Array.isArray(parsedArguments.data)
        ? joinDataArguments(parsedArguments.data)
        : parsedArguments.data,
      dataArray: Array.isArray(parsedArguments.data)
        ? parsedArguments.data
        : null,
      isDataBinary: false,
    }
  } else if (parsedArguments["data-binary"]) {
    return {
      data: Array.isArray(parsedArguments["data-binary"])
        ? joinDataArguments(parsedArguments["data-binary"])
        : parsedArguments["data-binary"],
      dataArray: Array.isArray(parsedArguments["data-binary"])
        ? parsedArguments["data-binary"]
        : null,
      isDataBinary: true,
    }
  } else if (parsedArguments.d) {
    return {
      data: Array.isArray(parsedArguments.d)
        ? joinDataArguments(parsedArguments.d)
        : parsedArguments.d,
      dataArray: Array.isArray(parsedArguments.d) ? parsedArguments.d : null,
      isDataBinary: false,
    }
  } else if (parsedArguments["data-ascii"]) {
    return {
      data: Array.isArray(parsedArguments["data-ascii"])
        ? joinDataArguments(parsedArguments["data-ascii"])
        : parsedArguments["data-ascii"],
      dataArray: Array.isArray(parsedArguments["data-ascii"])
        ? parsedArguments["data-ascii"]
        : null,
      isDataBinary: false,
    }
  }
}

const parseCurlCommand = (curlCommand: string) => {
  // remove '\' and newlines
  curlCommand = curlCommand.replace(/ ?\\ ?$/gm, " ")
  curlCommand = curlCommand.replace(/\n/g, "")

  // remove all $ symbols from start of argument values
  curlCommand = curlCommand.replaceAll("$'", "'")
  curlCommand = curlCommand.replaceAll('$"', '"')

  // replace string for insomnia
  curlCommand = curlCommand.replace(/--request ?/, "-X ")
  curlCommand = curlCommand.replace(/--header ?/, "-H ")
  curlCommand = curlCommand.replace(/--url ?/, " ")
  curlCommand = curlCommand.replace(/--data-raw ?/, "--data ")
  ;(["'", '"', " "] as Array<string>).map((sym) => {
    const reData = new RegExp(`-d${sym}`)
    const reUser = new RegExp(`-u${sym}`)
    curlCommand = curlCommand.replace(reData, `--data${sym}`)
    curlCommand = curlCommand.replace(reUser, `--user${sym}`)
    return sym
  })

  // yargs parses -XPOST as separate arguments. just prescreen for it.
  curlCommand = curlCommand.replace(/-XPOST/, " -X POST")
  curlCommand = curlCommand.replace(/-XGET/, " -X GET")
  curlCommand = curlCommand.replace(/-XPUT/, " -X PUT")
  curlCommand = curlCommand.replace(/-XPATCH/, " -X PATCH")
  curlCommand = curlCommand.replace(/-XDELETE/, " -X DELETE")
  curlCommand = curlCommand.trim()
  const parsedArguments = parser(curlCommand)

  const rawData: string = parsedArguments?.data || ""

  let cookieString
  let cookies
  let url = parsedArguments._[1]

  // get rid of double and single quotes that have snuck in
  url = url.replace(/"/g, "").replace(/'/g, "")
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

  // -F multipart data
  let multipartUploads: Record<string, string> = {}
  let rawContentType: string = ""

  if (parsedArguments.F) {
    if (!Array.isArray(parsedArguments.F)) {
      parsedArguments.F = [parsedArguments.F]
    }
    parsedArguments.F.forEach((multipartArgument: string) => {
      // input looks like key=value. value could be json or a file path prepended with an @
      const [key, value] = multipartArgument.split("=", 2)
      multipartUploads[key] = value[0] === "@" ? "" : value
    })
    rawContentType = "multipart/form-data"
  }

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

  let contentType: HoppRESTReqBody["contentType"] = "text/plain"

  // if -F is not present, look for content type header
  if (rawContentType !== "multipart/form-data") {
    new Promise((_, reject) => { // eslint-disable-line
      // if content type is provided
      if (headers && rawContentType !== "") {
        contentType = rawContentType // eslint-diable-line
          .toLowerCase()
          .split(";")[0] as HoppRESTReqBody["contentType"]

        switch (contentType) {
          case "application/x-www-form-urlencoded":
          case "application/json": {
            const parsedBody = parseBody(rawData, contentType)
            if (isType<string | null>(parsedBody)) {
              body = parsedBody
            } else {
              reject(Error("Unstructured Body"))
            }
            break
          }
          case "multipart/form-data": {
            const parsedBody = parseBody(rawData, contentType, rawContentType)
            if (isType<Record<string, string>>(parsedBody)) {
              multipartUploads = parsedBody
            } else {
              reject(Error("Unstructured Body"))
            }
            break
          }
          case "application/hal+json":
          case "application/ld+json":
          case "application/vnd.api+json":
          case "application/xml":
          case "text/html":
          case "text/plain":
          default:
            contentType = "text/plain"
            body = rawData
            break
        }
      } else if (rawData) {
        // if content type is not provided, check for it manually
        contentType = detectContentType(rawData)
        if (contentType === "multipart/form-data")
          multipartUploads = parseBody(rawData, contentType) as Record<
            string,
            string
          >
        else {
          const res = parseBody(rawData, contentType)
          if (isType<string | null>(res))
            body = parseBody(rawData, contentType) as string | null
          if (body === null) {
            reject(Error("Null body encountered"))
          }
        }
      } else {
        reject(Error(undefined)) // eslint-disable-line
      }
    }).catch((err) => {
      body = null
      contentType = null
      if (err) console.error(err)
    })
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
  const query = querystring.parse(urlObject.query!, null as any, null as any, {
    maxKeys: 10000,
  })

  urlObject.search = null // Clean out the search/query portion.
  const request = {
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
    user: parsedArguments.user,
  }

  return request
}

export default parseCurlCommand
