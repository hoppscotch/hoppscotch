const mimeToMode = {
  "text/plain": "plain_text",
  "text/html": "html",
  "application/xml": "xml",
  "application/hal+json": "json",
  "application/json": "json",
}

export function getEditorLangForMimeType(mimeType) {
  return mimeToMode[mimeType] || "plain_text"
}
