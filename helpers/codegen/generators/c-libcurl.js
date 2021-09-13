export const CLibcurlCodegen = {
  id: "c-libcurl",
  name: "C libcurl",
  language: "c_cpp",
  generator: ({
    auth,
    httpUser,
    httpPassword,
    method,
    url,
    pathName,
    queryString,
    bearerToken,
    headers,
    rawInput,
    rawParams,
    rawRequestBody,
    contentType,
  }) => {
    const requestString = []

    requestString.push("CURL *hnd = curl_easy_init();")
    requestString.push(
      `curl_easy_setopt(hnd, CURLOPT_CUSTOMREQUEST, "${method}");`
    )
    requestString.push(
      `curl_easy_setopt(hnd, CURLOPT_URL, "${url}${pathName}?${queryString}");`
    )
    requestString.push(`struct curl_slist *headers = NULL;`)

    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key)
          requestString.push(
            `headers = curl_slist_append(headers, "${key}: ${value}");`
          )
      })
    }

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      requestString.push(
        `headers = curl_slist_append(headers, "Authorization: Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}");`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(
        `headers = curl_slist_append(headers, "Authorization: Bearer ${bearerToken}");`
      )
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      let requestBody = rawInput ? rawParams : rawRequestBody

      if (contentType.includes("x-www-form-urlencoded")) {
        requestBody = `"${requestBody}"`
      } else requestBody = JSON.stringify(requestBody)

      requestString.push(
        `headers = curl_slist_append(headers, "Content-Type: ${contentType}");`
      )
      requestString.push("curl_easy_setopt(hnd, CURLOPT_HTTPHEADER, headers);")
      requestString.push(
        `curl_easy_setopt(hnd, CURLOPT_POSTFIELDS, ${requestBody});`
      )
    } else
      requestString.push("curl_easy_setopt(hnd, CURLOPT_HTTPHEADER, headers);")

    requestString.push(`CURLcode ret = curl_easy_perform(hnd);`)
    return requestString.join("\n")
  },
}
