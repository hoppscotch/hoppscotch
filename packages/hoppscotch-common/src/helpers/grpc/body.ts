const isUnicodeJSONWhitespace = (character: string): boolean =>
  character === "\uFEFF" || /\p{Z}/u.test(character)

export const normalizeGRPCRequestBodyWhitespace = (body: string): string => {
  let normalized = ""
  let inString = false
  let escaped = false

  for (const character of body) {
    if (inString) {
      normalized += character

      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false

      continue
    }

    if (character === '"') {
      inString = true
      normalized += character
    } else {
      normalized += isUnicodeJSONWhitespace(character) ? " " : character
    }
  }

  return normalized
}

export const parseGRPCRequestBody = (body: string): unknown =>
  JSON.parse(normalizeGRPCRequestBodyWhitespace(body))
