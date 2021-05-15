export const NodejsAxiosCodegen = {
  id: "nodejs-axios",
  name: "NodeJs Axios",
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
    let requestBody = rawInput ? rawParams : rawRequestBody

    requestString.push(`axios.${method.toLowerCase()}('${url}${pathName}${queryString}'`)
    if (requestBody.length !== 0) {
      requestString.push(", ")
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`    "${key}": "${value}",\n`)
      })
    }
    if (contentType) {
      genHeaders.push(`"Content-Type": "${contentType}; charset=utf-8",\n`)
    }
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `    "Authorization": "Basic ${window.btoa(unescape(encodeURIComponent(basic)))}",\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`    "Authorization": "Bearer ${bearerToken}",\n`)
    }
    requestString.push(`${requestBody},{ \n headers : {${genHeaders.join("").slice(0, -2)}}\n})`)
    requestString.push(".then(response => {\n")
    requestString.push("    console.log(response);\n")
    requestString.push("})")
    requestString.push(".catch(error => {\n")
    requestString.push("    console.log(error);\n")
    requestString.push("})\n")
    return requestString.join("")
  },
}
