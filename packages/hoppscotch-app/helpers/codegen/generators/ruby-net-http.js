export const RubyNetHttpCodeGen = {
  id: "ruby-net-http",
  name: "Ruby Net::HTTP",
  language: "ruby",
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

    requestString.push(`require 'net/http'\n`)

    // initial request setup
    let requestBody = rawInput ? rawParams : rawRequestBody
    requestBody = requestBody.replace(/'/g, "\\'") // escape single-quotes for single-quoted string compatibility

    const verbs = [
      { verb: "GET", rbMethod: "Get" },
      { verb: "POST", rbMethod: "Post" },
      { verb: "PUT", rbMethod: "Put" },
      { verb: "PATCH", rbMethod: "Patch" },
      { verb: "DELETE", rbMethod: "Delete" },
    ]

    // create URI and request
    const verb = verbs.find((v) => v.verb === method)
    requestString.push(`uri = URI.parse('${url}${pathName}?${queryString}')\n`)
    requestString.push(`request = Net::HTTP::${verb.rbMethod}.new(uri)`)

    // content type
    if (contentType) {
      requestString.push(`request['Content-Type'] = '${contentType}'`)
    }

    // custom headers
    if (headers) {
      headers.forEach(({ key, value }) => {
        if (key) {
          requestString.push(`request['${key}'] = '${value}'`)
        }
      })
    }

    // authentication
    if (auth === "Basic Auth") {
      requestString.push(`request.basic_auth('${httpUser}', '${httpPassword}')`)
    } else if (auth === "Bearer Token" || auth === "OAuth 2.0") {
      requestString.push(`request['Authorization'] = 'Bearer ${bearerToken}'`)
    }

    // set body
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      requestString.push(`request.body = '${requestBody}'\n`)
    }

    // process
    requestString.push(`http = Net::HTTP.new(uri.host, uri.port)`)
    requestString.push(`http.use_ssl = uri.is_a?(URI::HTTPS)`)
    requestString.push(`response = http.request(request)\n`)

    // analyse result
    requestString.push(`unless response.is_a?(Net::HTTPSuccess) then`)
    requestString.push(
      `  raise "An error occurred: #{response.code} #{response.message}"`
    )
    requestString.push(`else`)
    requestString.push(`  puts response.body`)
    requestString.push(`end`)

    return requestString.join("\n")
  },
}
