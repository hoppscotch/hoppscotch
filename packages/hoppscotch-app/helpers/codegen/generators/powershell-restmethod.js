export const PowershellRestmethodCodegen = {
  id: "powershell-restmethod",
  name: "PowerShell RestMethod",
  language: "powershell",
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
    const methodsWithBody = ["Put", "Post", "Delete"]
    const formattedMethod =
      method[0].toUpperCase() + method.substring(1).toLowerCase()
    const includeBody = methodsWithBody.includes(formattedMethod)
    const requestString = []
    let genHeaders = []
    let variables = ""

    requestString.push(
      `Invoke-RestMethod -Method '${formattedMethod}' -Uri '${url}${pathName}?${queryString}'`
    )
    const requestBody = rawInput ? rawParams : rawRequestBody

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (requestBody && includeBody) {
        variables = variables.concat(`$body = @'\n${requestBody}\n'@\n\n`)
      }
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`  '${key}' = '${value}'\n`)
      })
    }

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `  'Authorization' = 'Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}'\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`  'Authorization' = 'Bearer ${bearerToken}'\n`)
    }
    genHeaders = genHeaders.join("").slice(0, -1)
    if (genHeaders) {
      variables = variables.concat(`$headers = @{\n${genHeaders}\n}\n`)
      requestString.push(` -Headers $headers`)
    }
    if (requestBody && includeBody) {
      requestString.push(` -Body $body`)
    }
    return `${variables}${requestString.join("")}`
  },
}
