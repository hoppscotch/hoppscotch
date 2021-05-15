import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const JavascriptFetchCodegen = {
  id: "js-fetch",
  name: "JavaScript Fetch",
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
    requestString.push(`fetch("${url}${pathName}${queryString}", {\n`)
    requestString.push(`  method: "${method}",\n`)
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
      if (isJSONContentType(contentType)) {
        requestBody = `JSON.stringify(${requestBody})`
      } else if (contentType.includes("x-www-form-urlencoded")) {
        requestBody = `"${requestBody}"`
      }

      requestString.push(`  body: ${requestBody},\n`)
      genHeaders.push(`    "Content-Type": "${contentType}; charset=utf-8",\n`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }
    genHeaders = genHeaders.join("").slice(0, -2)
    requestString.push(`  headers: {\n${genHeaders}\n  },\n`)
    requestString.push('  credentials: "same-origin"\n')
    requestString.push("}).then(function(response) {\n")
    requestString.push("  response.status\n")
    requestString.push("  response.statusText\n")
    requestString.push("  response.headers\n")
    requestString.push("  response.url\n\n")
    requestString.push("  return response.text()\n")
    requestString.push("}).catch(function(error) {\n")
    requestString.push("  error.message\n")
    requestString.push("})")
    return requestString.join("")
  },
}
