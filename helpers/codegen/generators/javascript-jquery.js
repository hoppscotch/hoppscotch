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
    rawRequestBody,
    contentType,
    headers,
  }) => {
    const requestString = []
    let genHeaders = []

    requestString.push(`jQuery.ajax({\n  url: "${url}${pathName}${queryString}"`)
    requestString.push(`,\n  method: "${method.toUpperCase()}"`)
    const requestBody = rawInput ? rawParams : rawRequestBody

    if (requestBody.length !== 0) {
      requestString.push(`,\n  body: ${requestBody}`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }

    if (contentType) {
      genHeaders.push(`    "Content-Type": "${contentType}; charset=utf-8",\n`)
      requestString.push(`,\n  contentType: "${contentType}; charset=utf-8"`)
    }

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `    "Authorization": "Basic ${window.btoa(unescape(encodeURIComponent(basic)))}",\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`    "Authorization": "Bearer ${bearerToken}",\n`)
    }
    requestString.push(`,\n  headers: {\n${genHeaders.join("").slice(0, -2)}\n  }\n})`)
    requestString.push(".then(response => {\n")
    requestString.push("    console.log(response);\n")
    requestString.push("})")
    requestString.push(".catch(error => {\n")
    requestString.push("    console.log(error);\n")
    requestString.push("})\n")
    return requestString.join("")
  },
}
