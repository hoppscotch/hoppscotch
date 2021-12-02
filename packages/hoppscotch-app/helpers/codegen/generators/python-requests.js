import { isJSONContentType } from "~/helpers/utils/contenttypes"

const printHeaders = (headers) => {
  if (headers.length) {
    return [`headers = {\n`, `  ${headers.join(",\n  ")}\n`, `}\n`]
  }

  return []
}

export const PythonRequestsCodegen = {
  id: "python-requests",
  name: "Python Requests",
  language: "python",
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
    const genHeaders = []

    requestString.push(`import requests\n\n`)
    requestString.push(`url = '${url}${pathName}?${queryString}'\n`)

    // auth headers
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      genHeaders.push(
        `'Authorization': 'Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}'`
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
    let requestDataObj = ""
    requestString.push(...printHeaders(genHeaders))

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (contentType && requestBody) {
        if (isJSONContentType(contentType)) {
          requestBody = JSON.stringify(requestBody)
          requestDataObj = `data = ${requestBody}\n`
        } else if (contentType.includes("x-www-form-urlencoded")) {
          const formData = []
          if (requestBody.includes("=")) {
            requestBody.split("&").forEach((rq) => {
              const [key, val] = rq.split("=")
              formData.push(`('${key}', '${val}')`)
            })
          }
          if (formData.length) {
            requestDataObj = `data = [${formData.join(",\n      ")}]\n`
          }
        } else {
          requestDataObj = `data = '''${requestBody}'''\n`
        }
      }
    }
    if (requestDataObj) {
      requestString.push(requestDataObj)
    }

    requestString.push(`response = requests.request(\n`)
    requestString.push(`  '${method}',\n`)
    requestString.push(`  '${url}${pathName}?${queryString}',\n`)

    if (requestDataObj && requestBody) {
      requestString.push(`  data=data,\n`)
    }

    if (genHeaders.length) {
      requestString.push(`  headers=headers,\n`)
    }

    requestString.push(`)\n\n`)
    requestString.push(`print(response)`)

    return requestString.join("")
  },
}
