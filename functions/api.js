import querystring from "querystring"

exports.handler = async (event, context) => {
  switch (event.httpMethod) {
    case "GET":
      const name = event.queryStringParameters.name || "World"
      return {
        statusCode: 200,
        body: `Hello ${name}`,
      }
    case "POST":
      // When the method is POST, the name will no longer be in the event’s
      // queryStringParameters – it’ll be in the event body encoded as a query string
      const params = querystring.parse(event.body)
      const name = params.name || "World"
      return {
        statusCode: 200,
        body: `Hello ${name}`,
      }
    default:
      return { statusCode: 405, body: "Method Not Allowed" }
  }
}
