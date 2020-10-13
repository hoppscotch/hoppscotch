import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const NodeJsRequestCodegen = {
  id: "nodejs-request",
  name: "NodeJs Request",
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
    let genHeaders = []

    requestString.push(`const request = require('request');\n`)
    requestString.push(`const options = {\n`)
    requestString.push(`  method: '${method.toLowerCase()}',\n`)
    requestString.push(`  url: '${url}${pathName}${queryString}'`)

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `    "Authorization": "Basic ${window.btoa(unescape(encodeURIComponent(basic)))}",\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`    "Authorization": "Bearer ${bearerToken}",\n`)
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      let requestBody = rawInput ? rawParams : rawRequestBody
      let reqBodyType = "formData"
      if (isJSONContentType(contentType)) {
        requestBody = `JSON.stringify(${requestBody})`
        reqBodyType = "body"
      } else if (contentType.includes("x-www-form-urlencoded")) {
        const formData = []
        if (requestBody.indexOf("=") > -1) {
          requestBody.split("&").forEach((rq) => {
            const [key, val] = rq.split("=")
            formData.push(`"${key}": "${val}"`)
          })
        }
        if (formData.length) {
          requestBody = `{${formData.join(", ")}}`
        }
        reqBodyType = "form"
      } else if (contentType.includes("application/xml")) {
        requestBody = `\`${requestBody}\``
        reqBodyType = "body"
      }
      if (contentType) {
        genHeaders.push(`    "Content-Type": "${contentType}; charset=utf-8",\n`)
      }
      requestString.push(`,\n  ${reqBodyType}: ${requestBody}`)
    }

    if (headers.length > 0) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }
    if (genHeaders.length > 0 || headers.length > 0) {
      requestString.push(`,\n  headers: {\n${genHeaders.join("").slice(0, -2)}\n  }`)
    }

    requestString.push(`\n}`)
    requestString.push(`\nrequest(options, (error, response) => {\n`)
    requestString.push(`  if (error) throw new Error(error);\n`)
    requestString.push(`  console.log(response.body);\n`)
    requestString.push(`});`)
    return requestString.join("")
  },
}
