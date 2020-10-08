import { isJSONContentType } from "~/helpers/utils/contenttypes"

const printHeaders = (headers) => {
  if (headers.length) {
    return [`headers = {\n`, `  ${headers.join(",\n  ")}\n`, `}\n`]
  } else {
    return [`headers = {}\n`]
  }
}

export const PythonHttpClientCodegen = {
  id: "python-http-client",
  name: "Python HTTP Client",
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

    requestString.push(`import http.client\n`)
    requestString.push(`import mimetypes\n`)

    const currentUrl = new URL(url)
    let hostname = currentUrl["hostname"]
    let port = currentUrl["port"]
    if (!port) {
      requestString.push(`conn = http.client.HTTPSConnection("${hostname}")\n`)
    } else {
      requestString.push(`conn = http.client.HTTPSConnection("${hostname}", ${port})\n`)
    }
    // auth headers
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `'Authorization': 'Basic ${window.btoa(unescape(encodeURIComponent(basic)))}'`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      genHeaders.push(`'Authorization': 'Bearer ${bearerToken}'`)
    }

    // custom headers
    if (headers.length) {
      headers.forEach(({ key, value }) => {
        if (key) genHeaders.push(`'${key}': '${value}'`)
      })
    }

    // initial request setup
    let requestBody = rawInput ? rawParams : rawRequestBody
    if (method == "GET") {
      requestString.push(...printHeaders(genHeaders))
      requestString.push(`payload = ''\n`)
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      genHeaders.push(`'Content-Type': '${contentType}'`)
      requestString.push(...printHeaders(genHeaders))

      if (isJSONContentType(contentType)) {
        requestBody = JSON.stringify(requestBody)
        requestString.push(`payload = ${requestBody}\n`)
      } else if (contentType.includes("x-www-form-urlencoded")) {
        const formData = []
        if (requestBody.indexOf("=") > -1) {
          requestBody.split("&").forEach((rq) => {
            const [key, val] = rq.split("=")
            formData.push(`('${key}', '${val}')`)
          })
        }
        if (formData.length) {
          requestString.push(`payload = [${formData.join(",\n      ")}]\n`)
        }
      } else {
        requestString.push(`paylod = '''${requestBody}'''\n`)
      }
    }
    requestString.push(`conn.request("${method}", "${pathName}${queryString}", payload, headers)\n`)
    requestString.push(`res = conn.getresponse()\n`)
    requestString.push(`data = res.read()\n`)
    requestString.push(`print(data.decode("utf-8"))`)

    return requestString.join("")
  },
}
