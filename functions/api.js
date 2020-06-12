// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
export async function handler({ httpMethod, queryStringParameters }, context) {
  switch (httpMethod) {
    case "GET":
      try {
        const name = queryStringParameters.name || "World"
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
