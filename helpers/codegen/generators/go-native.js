import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const GoNativeCodegen = {
  id: "go-native",
  name: "Go Native",
  language: "golang",
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
    let genHeaders = []
    // initial request setup
    const requestBody = rawInput ? rawParams : rawRequestBody
    if (method === "GET") {
      requestString.push(
        `req, err := http.NewRequest("${method}", "${url}${pathName}?${queryString}")\n`
      )
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      genHeaders.push(`req.Header.Set("Content-Type", "${contentType}")\n`)
      if (isJSONContentType(contentType)) {
        requestString.push(`var reqBody = []byte(\`${requestBody}\`)\n\n`)
        requestString.push(
          `req, err := http.NewRequest("${method}", "${url}${pathName}?${queryString}", bytes.NewBuffer(reqBody))\n`
        )
      } else if (contentType.includes("x-www-form-urlencoded")) {
        requestString.push(
          `req, err := http.NewRequest("${method}", "${url}${pathName}?${queryString}", strings.NewReader("${requestBody}"))\n`
        )
      }
    }

    // headers
    // auth
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `req.Header.Set("Authorization", "Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}")\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(
        `req.Header.Set("Authorization", "Bearer ${bearerToken}")\n`
      )
    }
    // custom headers
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`req.Header.Set("${key}", "${value}")\n`)
      })
    }
    genHeaders = genHeaders.join("").slice(0, -1)
    requestString.push(`${genHeaders}\n`)
    requestString.push(
      `if err != nil {\n  log.Fatalf("An error occurred %v", err)\n}\n\n`
    )

    // request boilerplate
    requestString.push(`client := &http.Client{}\n`)
    requestString.push(
      `resp, err := client.Do(req)\nif err != nil {\n  log.Fatalf("An error occurred %v", err)\n}\n\n`
    )
    requestString.push(`defer resp.Body.Close()\n`)
    requestString.push(
      `body, err := ioutil.ReadAll(resp.Body)\nif err != nil {\n  log.Fatalln(err)\n}\n`
    )
    return requestString.join("")
  },
}
