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
    headers,
  }) => {
    const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"]
    const includeBody = methodsWithBody.includes(method)
    const requestString = []

    let requestBody = rawInput ? rawParams : rawRequestBody
    if (requestBody && includeBody) {
      requestBody = requestBody.replace(/'/g, "\\'")

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
