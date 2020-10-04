export const JSjQueryCodegen = {
  id: "js-jQuery",
  name: "JavaScript jQuery",
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
    console.log("rawInput", rawInput)
    console.log("rawParams", rawParams)
    console.log("rawRequestBody", rawRequestBody)
    if (requestBody.length !== 0) {
      requestString.push(`,\n  body: ${requestBody}`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }
    console.log("Content-Type", contentType)
    if (contentType) {
      genHeaders.push(`    "Content-Type": "${contentType}; charset=utf-8",\n`)
      requestString.push(`,\n  contentType: "${contentType}; charset=utf-8"`)
    }
    console.log("Auth", auth)
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
