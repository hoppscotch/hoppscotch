export const knownContentTypes = [
  "application/json",
  "application/vnd.api+json",
  "application/hal+json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "text/html",
  "text/plain",
]

export function isJSONContentType(contentType) {
  if (contentType.includes(";")) {
    const [justContentType] = contentType.split(";")

    return (
      justContentType === "application/json" ||
      justContentType === "application/vnd.api+json" ||
      justContentType === "application/hal+json"
    )
  } else {
    return (
      contentType === "application/json" ||
      contentType === "application/vnd.api+json" ||
      contentType === "application/hal+json"
    )
  }
}
