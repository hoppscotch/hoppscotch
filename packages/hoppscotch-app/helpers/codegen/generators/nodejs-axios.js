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
    const genHeaders = []
    let requestBody = rawInput ? rawParams : rawRequestBody

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (
        contentType &&
        contentType.includes("x-www-form-urlencoded") &&
        requestBody
      ) {
        requestString.push(
          `var params = new URLSearchParams("${requestBody}")\n`
        )
        requestBody = "params"
      }
    }
    requestString.push(
      `axios.${method.toLowerCase()}('${url}${pathName}?${queryString}'`
    )
    if (requestBody && requestBody.length !== 0) {
      requestString.push(", ")
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`\n    "${key}": "${value}",`)
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
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requestString.push(`${requestBody},`)
    }
    if (genHeaders.length > 0) {
      requestString.push(
        `{ \n headers : {${genHeaders.join("").slice(0, -1)}\n }\n}`
      )
    }
    requestString.push(").then(response => {\n")
    requestString.push("    console.log(response);\n")
    requestString.push("})")
    requestString.push(".catch(e => {\n")
    requestString.push("    console.error(e);\n")
    requestString.push("})\n")
    return requestString.join("")
  },
}
