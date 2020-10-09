export const WgetCodegen = {
  id: "wget",
  name: "wget",
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
    requestString.push(`wget -O - --method=${method}`)
    requestString.push(`  '${url}${pathName}${queryString}'`)
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      requestString.push(
        `  --header='Authorization: Basic ${window.btoa(unescape(encodeURIComponent(basic)))}'`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(`  --header='Authorization: Bearer ${bearerToken}'`)
    }
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) requestString.push(`  --header='${key}: ${value}'`)
      })
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const requestBody = rawInput ? rawParams : rawRequestBody
      requestString.push(`  --header='Content-Type: ${contentType}; charset=utf-8'`)
      requestString.push(`  --body-data='${requestBody}'`)
    }
    return requestString.join(" \\\n")
  },
}
