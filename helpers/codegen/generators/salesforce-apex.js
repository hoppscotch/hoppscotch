export const SalesforceApexCodegen = {
  id: "salesforce-apex",
  name: "Salesforce Apex",
  language: "apex",
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

    // initial request setup
    let requestBody = rawInput ? rawParams : rawRequestBody
    requestBody = JSON.stringify(requestBody)
      .replace(/^"|"$/g, "")
      .replace(/\\"/g, '"')
      .replace(/'/g, "\\'") // Apex uses single quotes for strings

    // create request
    requestString.push(`HttpRequest request = new HttpRequest();\n`)
    requestString.push(`request.setMethod('${method}');\n`)
    requestString.push(`request.setEndpoint('${url}${pathName}${queryString}');\n\n`)

    // authentification
    if (auth === "Basic Auth") {
      const basic = `${httpUser}:${httpPassword}`
      requestString.push(
        `request.setHeader('Authorization', 'Basic ${window.btoa(
          unescape(encodeURIComponent(basic))
        )}');\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(`request.setHeader('Authorization', 'Bearer ${bearerToken}');\n`)
    }

    // content type
    if (contentType) {
      requestString.push(`request.setHeader('Content-Type', '${contentType}');\n`)
    }

    // custom headers
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) {
          requestString.push(`request.setHeader('${key}', '${value}');\n`)
        }
      })
    }

    requestString.push(`\n`)

    // set body
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requestString.push(`request.setBody('${requestBody}');\n\n`)
    }

    // process
    requestString.push(`try {\n`)
    requestString.push(`    Http client = new Http();\n`)
    requestString.push(`    HttpResponse response = client.send(request);\n`)
    requestString.push(`    System.debug(response.getBody());\n`)
    requestString.push(`} catch (CalloutException ex) {\n`)
    requestString.push(`    System.debug('An error occured ' + ex.getMessage());\n`)
    requestString.push(`}`)

    return requestString.join("")
  },
}
