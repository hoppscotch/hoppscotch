export const PowerShellRestMethod = {
  id: "powershell-restmethod",
  name: "Powershell RestMethod",
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
    const methodsWithBody = ["Put", "Post", "Delete"]
    const formattedMethod = method[0].toUpperCase() + method.substring(1).toLowerCase()
    const includeBody = methodsWithBody.includes(formattedMethod)
    const requestString = []
    let genHeaders = []
    let variables = ""

    requestString.push(
      `Invoke-RestMethod -Method '${formattedMethod}' -Uri '${url}${pathName}${queryString}'`
    )
    const requestBody = rawInput ? rawParams : rawRequestBody

    if (requestBody.length !== 0 && includeBody) {
      variables = variables.concat(`$body = @'\n${requestBody}\n'@\n\n`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`  '${key}' = '${value}'\n`)
      })
    }

    if (contentType) {
      genHeaders.push(`  'Content-Type' = '${contentType}; charset=utf-8'\n`)
      requestString.push(` -ContentType '${contentType}; charset=utf-8'`)
    }

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `  'Authorization' = 'Basic ${window.btoa(unescape(encodeURIComponent(basic)))}'\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`  'Authorization' = 'Bearer ${bearerToken}'\n`)
    }
    genHeaders = genHeaders.join("").slice(0, -1)
    variables = variables.concat(`$headers = @{\n${genHeaders}\n}\n`)
    requestString.push(` -Headers $headers`)
    if (includeBody) {
      requestString.push(` -Body $body`)
    }
    return `${variables}\n${requestString.join("")}`
  },
}
