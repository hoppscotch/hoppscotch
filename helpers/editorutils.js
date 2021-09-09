const mimeToMode = {
  "text/plain": "text/x-yaml",
  "text/html": "htmlmixed",
  "application/xml": "application/xml",
  "application/hal+json": "application/ld+json",
  "application/vnd.api+json": "application/ld+json",
  "application/json": "application/ld+json",
}

export function getEditorLangForMimeType(mimeType) {
  return mimeToMode[mimeType] || "text/x-yaml"
}
