export const JavaUnirestCodegen = {
  id: "java-unirest",
  name: "Java Unirest",
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
    // initial request setup
    let requestBody = rawInput ? rawParams : rawRequestBody
    const verbs = [
      { verb: "GET", unirestMethod: "get" },
      { verb: "POST", unirestMethod: "post" },
      { verb: "PUT", unirestMethod: "put" },
      { verb: "PATCH", unirestMethod: "patch" },
      { verb: "DELETE", unirestMethod: "delete" },
      { verb: "HEAD", unirestMethod: "head" },
      { verb: "OPTIONS", unirestMethod: "options" },
    ]
    // create client and request
    const verb = verbs.find((v) => v.verb === method)
    requestString.push(
      `HttpResponse<String> response = Unirest.${verb.unirestMethod}("${url}${pathName}${queryString}")\n`
    )
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      requestString.push(
        `.header("authorization", "Basic ${window.btoa(unescape(encodeURIComponent(basic)))}") \n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(`.header("authorization", "Bearer ${bearerToken}") \n`)
    }
    // custom headers
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) {
          requestString.push(`.header("${key}", "${value}")\n`)
        }
      })
    }
    if (contentType) {
      requestString.push(`.header("Content-Type", "${contentType}")\n`)
    }

    // set body
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (contentType.includes("x-www-form-urlencoded")) {
        requestBody = `"${requestBody}"`
      } else {
        requestBody = JSON.stringify(requestBody)
      }

      requestString.push(`.body(${requestBody})`)
    }
    requestString.push(`\n.asString();\n`)
    return requestString.join("")
  },
}
