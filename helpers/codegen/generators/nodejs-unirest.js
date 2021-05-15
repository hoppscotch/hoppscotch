import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const NodejsUnirestCodegen = {
  id: "nodejs-unirest",
  name: "NodeJs Unirest",
  language: "javascript",
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

    requestString.push(`const unirest = require('unirest');\n`)
    requestString.push(`const req = unirest(\n`)
    requestString.push(`'${method.toLowerCase()}', '${url}${pathName}${queryString}')\n`)

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
        requestBody = `\`${requestBody}\``
        reqBodyType = "send"
      } else if (contentType.includes("x-www-form-urlencoded")) {
        const formData = []
        if (requestBody.includes("=")) {
          requestBody.split("&").forEach((rq) => {
            const [key, val] = rq.split("=")
            formData.push(`"${key}": "${val}"`)
          })
        }
        if (formData.length) {
          requestBody = `{${formData.join(", ")}}`
        }
        reqBodyType = "send"
      } else if (contentType.includes("application/xml")) {
        requestBody = `\`${requestBody}\``
        reqBodyType = "send"
      }
      if (contentType) {
        genHeaders.push(`    "Content-Type": "${contentType}; charset=utf-8",\n`)
      }
      requestString.push(`.\n  ${reqBodyType}( ${requestBody})`)
    }

    if (headers.length > 0) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }
    if (genHeaders.length > 0 || headers.length > 0) {
      requestString.push(`.\n  headers({\n${genHeaders.join("").slice(0, -2)}\n  }`)
    }

    requestString.push(`\n)`)
    requestString.push(`\n.end(function (res) {\n`)
    requestString.push(`  if (res.error) throw new Error(res.error);\n`)
    requestString.push(`  console.log(res.raw_body);\n });\n`)
    return requestString.join("")
  },
}
