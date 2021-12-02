export const JavascriptJqueryCodegen = {
  id: "js-jquery",
  name: "JavaScript jQuery",
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
    contentType,
    rawRequestBody,
    headers,
  }) => {
    const requestString = []
    const genHeaders = []

    requestString.push(
      `jQuery.ajax({\n  url: "${url}${pathName}?${queryString}"`
    )
    requestString.push(`,\n  method: "${method.toUpperCase()}"`)
    let requestBody = rawInput ? rawParams : rawRequestBody

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (contentType && contentType.includes("x-www-form-urlencoded")) {
        requestBody = `"${requestBody}"`
      } else {
        requestBody = requestBody.replaceAll("}", "  }")
      }
      requestString.push(`,\n  data: ${requestBody}`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `    "Authorization": "Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}",\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`    "Authorization": "Bearer ${bearerToken}",\n`)
    }
    if (genHeaders.length > 0) {
      requestString.push(
        `,\n  headers: {\n${genHeaders.join("").slice(0, -2)}\n  }`
      )
    }
    requestString.push("\n}).then(response => {\n")
    requestString.push("    console.log(response);\n")
    requestString.push("})")
    requestString.push(".catch(e => {\n")
    requestString.push("    console.error(e);\n")
    requestString.push("})\n")
    return requestString.join("")
  },
}
