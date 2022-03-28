import { ValidContentTypes } from "@hoppscotch/data"

export type Content = "json" | "xml" | "multipart" | "html" | "plain"

export const knownContentTypes: Record<ValidContentTypes, Content> = {
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

export function isJSONContentType(contentType: string) {
  return /\bjson\b/i.test(contentType)
}
