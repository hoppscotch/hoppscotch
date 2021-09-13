export const ShellHttpieCodegen = {
  id: "shell-httpie",
  name: "Shell HTTPie",
  language: "sh",
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
    const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"]
    const includeBody = methodsWithBody.includes(method)
    const requestString = []

    let requestBody = rawInput ? rawParams : rawRequestBody
    requestBody = requestBody.replace(/'/g, "\\'")
    if (requestBody.length !== 0 && includeBody) {
      // Send request body via redirected input
      requestString.push(`echo -n $'${requestBody}' | `)
    }

    // Executable itself
    requestString.push(`http`)

    // basic authentication
    if (auth === "Basic Auth") {
      requestString.push(` -a ${httpUser}:${httpPassword}`)
    }

    // URL
    let escapedUrl = `${url}${pathName}?${queryString}`
    escapedUrl = escapedUrl.replace(/'/g, "\\'")
    requestString.push(` ${method} $'${escapedUrl}'`)

    // All headers
    if (contentType) {
      requestString.push(` 'Content-Type:${contentType}; charset=utf-8'`)
    }

    if (headers) {
      headers.forEach(({ key, value }) => {
        requestString.push(
          ` $'${key.replace(/'/g, "\\'")}:${value.replace(/'/g, "\\'")}'`
        )
      })
    }

    if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(` 'Authorization:Bearer ${bearerToken}'`)
    }

    return requestString.join("")
  },
}
