import { isJSONContentType } from "~/helpers/utils/contenttypes"

export const CsRestsharpCodegen = {
  id: "cs-restsharp",
  name: "C# RestSharp",
  language: "csharp",
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
    requestBody = requestBody.replace(/"/g, '""') // escape quotes for C# verbatim string compatibility

    // prepare data
    let requestDataFormat
    let requestContentType

    if (isJSONContentType(contentType)) {
      requestDataFormat = "DataFormat.Json"
      requestContentType = "text/json"
    } else {
      requestDataFormat = "DataFormat.Xml"
      requestContentType = "text/xml"
    }

    const verbs = [
      { verb: "GET", csMethod: "Get" },
      { verb: "POST", csMethod: "Post" },
      { verb: "PUT", csMethod: "Put" },
      { verb: "PATCH", csMethod: "Patch" },
      { verb: "DELETE", csMethod: "Delete" },
    ]

    // create client and request
    requestString.push(`var client = new RestClient("${url}");\n\n`)
    requestString.push(
      `var request = new RestRequest("${pathName}${queryString}", ${requestDataFormat});\n\n`
    )

    // authentification
    if (auth === "Basic Auth") {
      requestString.push(
        `client.Authenticator = new HttpBasicAuthenticator("${httpUser}", "${httpPassword}");\n`
      )
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(`request.AddHeader("Authorization", "Bearer ${bearerToken}");\n`)
    }

    // content type
    if (contentType) {
      requestString.push(`request.AddHeader("Content-Type", "${contentType}");\n`)
    }

    // custom headers
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) {
          requestString.push(`request.AddHeader("${key}", "${value}");\n`)
        }
      })
    }

    requestString.push(`\n`)

    // set body
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requestString.push(
        `request.AddParameter("${requestContentType}", @"${requestBody}", ParameterType.RequestBody);\n\n`
      )
    }

    // process
    const verb = verbs.find((v) => v.verb === method)
    requestString.push(`var response = client.${verb.csMethod}(request);\n\n`)

    // analyse result
    requestString.push(
      `if (!response.IsSuccessful)\n{\n    Console.WriteLine("An error occured " + response.ErrorMessage);\n}\n\n`
    )

    requestString.push(`var result = response.Content;\n`)

    return requestString.join("")
  },
}
