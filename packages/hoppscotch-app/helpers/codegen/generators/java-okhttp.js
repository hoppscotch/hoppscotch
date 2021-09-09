export const JavaOkhttpCodegen = {
  id: "java-okhttp",
  name: "Java OkHttp",
  language: "java",
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

    requestString.push(
      "OkHttpClient client = new OkHttpClient().newBuilder().build();"
    )

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      let requestBody = rawInput ? rawParams : rawRequestBody

      if (contentType.includes("x-www-form-urlencoded")) {
        requestBody = `"${requestBody}"`
      } else requestBody = JSON.stringify(requestBody)

      requestString.push(
        `MediaType mediaType = MediaType.parse("${contentType}");`
      )
      requestString.push(
        `RequestBody body = RequestBody.create(mediaType,${requestBody});`
      )
    }

    requestString.push("Request request = new Request.Builder()")
    requestString.push(`.url("${url}${pathName}${queryString}")`)

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requestString.push(`.method("${method}", body)`)
    } else {
      requestString.push(`.method("${method}", null)`)
    }

    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      requestString.push(
        `.addHeader("authorization", "Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}") \n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(
        `.addHeader("authorization", "Bearer ${bearerToken}" ) \n`
      )
    }

    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) requestString.push(`.addHeader("${key}", "${value}")`)
      })
    }

    requestString.push(`.build();`)
    requestString.push("Response response = client.newCall(request).execute();")
    return requestString.join("\n")
  },
}
