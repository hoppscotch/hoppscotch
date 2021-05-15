export const CurlCodegen = {
  id: "curl",
  name: "cURL",
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
    const requestString = []
    requestString.push(`curl -X ${method}`)
    requestString.push(`  '${url}${pathName}${queryString}'`)
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      requestString.push(
        `  -H 'Authorization: Basic ${window.btoa(unescape(encodeURIComponent(basic)))}'`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(`  -H 'Authorization: Bearer ${bearerToken}'`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) requestString.push(`  -H '${key}: ${value}'`)
      })
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const requestBody = rawInput ? rawParams : rawRequestBody
      requestString.push(`  -H 'Content-Type: ${contentType}; charset=utf-8'`)
      requestString.push(`  -d '${requestBody}'`)
    }
    return requestString.join(" \\\n")
  },
}
