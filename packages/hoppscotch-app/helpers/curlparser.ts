import * as URL from "url"
import * as querystring from "querystring"
import * as cookie from "cookie"
import parser from "yargs-parser"

/**
 * given this: [ 'msg1=value1', 'msg2=value2' ]
 * output this: 'msg1=value1&msg2=value2'
 * @param dataArguments
 */
const joinDataArguments = (dataArguments: string[]) => {
  let data = ""
  dataArguments.forEach((argument, i) => {
    if (i === 0) {
      data += argument
    } else {
      data += `&${argument}`
    }
  })
  return data
}

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
  const newlineFound = /\\/gi.test(curlCommand)
  if (newlineFound) {
    // remove '\' and newlines
    curlCommand = curlCommand.replace(/\\/gi, "")
    curlCommand = curlCommand.replace(/\n/g, "")
  }
  // yargs parses -XPOST as separate arguments. just prescreen for it.
  curlCommand = curlCommand.replace(/ -XPOST/, " -X POST")
  curlCommand = curlCommand.replace(/ -XGET/, " -X GET")
  curlCommand = curlCommand.replace(/ -XPUT/, " -X PUT")
  curlCommand = curlCommand.replace(/ -XPATCH/, " -X PATCH")
  curlCommand = curlCommand.replace(/ -XDELETE/, " -X DELETE")
  curlCommand = curlCommand.trim()
  const parsedArguments = parser(curlCommand)
  let cookieString
  let cookies
  let url = parsedArguments._[1]
  if (!url) {
    for (const argName in parsedArguments) {
      if (typeof parsedArguments[argName] === "string") {
        if (["http", "www."].includes(parsedArguments[argName])) {
          url = parsedArguments[argName]
        }
      }
    }
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

  if (parsedArguments.b) {
    cookieString = parsedArguments.b
  }
  if (parsedArguments.cookie) {
    cookieString = parsedArguments.cookie
  }
  const multipartUploads: Record<string, string> = {}
  if (parsedArguments.F) {
    if (!Array.isArray(parsedArguments.F)) {
      parsedArguments.F = [parsedArguments.F]
    }
    parsedArguments.F.forEach((multipartArgument: string) => {
      // input looks like key=value. value could be json or a file path prepended with an @
      const [key, value] = multipartArgument.split("=", 2)
      multipartUploads[key] = value
    })
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
    cookies,
    cookieString: cookieString?.replace("Cookie: ", ""),
    multipartUploads,
    ...parseDataFromArguments(parsedArguments),
    auth: parsedArguments.u,
    user: parsedArguments.user,
  }

  return request
}

export default parseCurlCommand
