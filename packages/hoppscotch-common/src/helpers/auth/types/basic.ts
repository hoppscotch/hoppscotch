import {
  parseTemplateString,
  HoppRESTAuth,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"

/**
 * UTF-8 safe base64 encoding. Standard btoa() throws on non-ASCII chars,
 * so we encode through TextEncoder first.
 */
function utf8Btoa(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export async function generateBasicAuthHeaders(
  auth: HoppRESTAuth & { authType: "basic" },
  envVars: Environment["variables"],
  // showKeyIfSecret is intentionally not forwarded to parseTemplateString here.
  // The base64 encoding must always use actual values, otherwise the
  // Authorization header is unusable (see #5863).
  _showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  const username = parseTemplateString(auth.username, envVars, false, false)
  const password = parseTemplateString(auth.password, envVars, false, false)

  return [
    {
      active: true,
      key: "Authorization",
      value: `Basic ${utf8Btoa(`${username}:${password}`)}`,
      description: "",
    },
  ]
}
