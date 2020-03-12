const querystring = require("querystring")

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
exports.handler = async (event, context) => {
  switch (event.httpMethod) {
    case "GET":
      try {
        const name = event.queryStringParameters.name || "World"
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: `Hello ${name}` }),
        }
      } catch (err) {
        return { statusCode: 500, body: err.toString() }
      }

    case "POST":
      try {
        // When the method is POST, the name will no longer be in the event’s
        // queryStringParameters – it’ll be in the event body encoded as a query string
        const params = querystring.parse(event.body)
        const name = params.name || "World"
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: `Hello ${name}` }),
        }
      } catch (err) {
        return { statusCode: 500, body: err.toString() }
      }

    default:
      return { statusCode: 405, body: "Method Not Allowed" }
  }
}
