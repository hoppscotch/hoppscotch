export function getSourcePrefix(source) {
  const sourceEmojis = {
    // Source used for info messages.
    info: "\tℹ️ [INFO]:\t",
    // Source used for client to server messages.
    client: "\t⬅️ [SENT]:\t",
    // Source used for server to client messages.
    server: "\t➡️ [RECEIVED]:\t",
  }
  if (Object.keys(sourceEmojis).includes(source)) return sourceEmojis[source]
  return ""
}
