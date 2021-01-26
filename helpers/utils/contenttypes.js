export const knownContentTypes = [
  "application/json",
  "application/ld+json",
  "application/hal+json",
  "application/vnd.api+json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "text/html",
  "text/plain",
]

export function isJSONContentType(contentType) {
   return /\bjson\b/i.test(contentType);
}
