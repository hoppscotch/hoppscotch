export const knownContentTypes = {
  "application/json": "json",
  "application/ld+json": "json",
  "application/hal+json": "json",
  "application/vnd.api+json": "json",
  "application/xml": "xml",
  "application/x-www-form-urlencoded": "multipart",
  "multipart/form-data": "multipart",
  "text/html": "html",
  "text/plain": "plain",
}

export type ValidContentTypes = keyof typeof knownContentTypes
