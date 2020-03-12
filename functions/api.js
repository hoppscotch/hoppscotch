// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
exports.handler = async (event, context) => {
  switch (httpMethod) {
    case "GET":
      try {
        const name = event.queryStringParameters.name || "World"
        return {
          statusCode: 200,
          body: JSON.stringify({ message: `Hello ${name}` }),
          // // more keys you can return:
          // headers: { "headerName": "headerValue", ... },
          // isBase64Encoded: true,
        }
      } catch (err) {
        return { statusCode: 500, body: err.toString() }
      }
    case "POST":
      try {
        const name = event.body.name || "World"
        return {
          statusCode: 200,
          body: JSON.stringify({ message: `Hello ${name}` }),
          // // more keys you can return:
          // headers: { "headerName": "headerValue", ... },
          // isBase64Encoded: true,
        }
      } catch (err) {
        return { statusCode: 500, body: err.toString() }
      }
    default:
      return { statusCode: 405, body: "Method Not Allowed" }
  }
}
