const mimeToMode = {
  "text/plain": "text/plain",
  "text/xml": "application/xml",
  "text/html": "htmlmixed",
  "application/xml": "application/xml",
  "application/hal+json": "application/ld+json",
  "application/vnd.api+json": "application/ld+json",
  "application/json": "application/ld+json",
}

export function getEditorLangForMimeType(mimeType: string): string {
  return mimeToMode[mimeType] || "text/plain"
}
