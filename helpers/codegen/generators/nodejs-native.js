import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const NodeJsNativeCodegen = {
  id: "nodejs-native",
  name: "NodeJs Native",
  generator: ({
    url,
    pathName,
    queryString,
    auth,
    httpUser,
    httpPassword,
    bearerToken,
    method,
    rawInput,
    rawParams,
    rawRequestBody,
    contentType,
    headers,
  }) => {
    const requestString = []
    const genHeaders = []

    requestString.push(`const http = require('http');\n\n`)

    requestString.push(`const url = '${url}${pathName}${queryString}';\n`)

    requestString.push(`const options = {\n`)
    requestString.push(`  method: '${method}',\n`)

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `    "Authorization": "Basic ${window.btoa(unescape(encodeURIComponent(basic)))}",\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`    "Authorization": "Bearer ${bearerToken}",\n`)
    }

    let requestBody
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      console.log("===== rawInput = " + rawInput)
      console.log("===== rawParams = " + rawParams)
      console.log("===== rawRequestBody = " + rawRequestBody)
      requestBody = rawInput ? rawParams : rawRequestBody
      if (isJSONContentType(contentType)) {
        requestBody = `JSON.stringify(${requestBody})`
      } else {
        requestBody = `\`${requestBody}\``
      }
      if (contentType) {
        genHeaders.push(`    "Content-Type": "${contentType}; charset=utf-8",\n`)
      }
    }

    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }
    if (genHeaders.length > 0 || headers.length > 0) {
      requestString.push(`  headers: {\n${genHeaders.join("").slice(0, -2)}\n  }`)
    }
    requestString.push(`};\n\n`)

    requestString.push(`const request = http.request(url, options, (response) => {\n`)
    requestString.push(`  console.log(response);\n`)
    requestString.push(`});\n\n`)

    requestString.push(`request.on('error', (e) => {\n`)
    requestString.push(`  console.error(e);\n`)
    requestString.push(`});\n`)

    if (requestBody) {
      requestString.push(`\nrequest.write(${requestBody});\n`)
    }

    requestString.push(`request.end();`)
    return requestString.join("")
  },
}
