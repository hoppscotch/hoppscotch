const sourceEmojis = {
  // Source used for info messages.
  info: "\tℹ️ [INFO]:\t",
  // Source used for client to server messages.
  client: "\t⬅️ [SENT]:\t",
  // Source used for server to client messages.
  server: "\t➡️ [RECEIVED]:\t",
}

export function getSourcePrefix(source: keyof typeof sourceEmojis) {
  return sourceEmojis[source]
}
