import {
  parseTemplateString,
  HoppRESTAuth,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"

export async function generateBasicAuthHeaders(
  auth: HoppRESTAuth & { authType: "basic" },
  envVars: Environment["variables"],
  _showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  // Always resolve environment variables before base64 encoding,
  // regardless of showKeyIfSecret. Encoding unresolved template
  // strings (e.g. <<Env-Username>>) produces unusable output.
  // See: https://github.com/hoppscotch/hoppscotch/issues/5863
  const username = parseTemplateString(auth.username, envVars)
  const password = parseTemplateString(auth.password, envVars)

  return [
    {
      active: true,
      key: "Authorization",
      value: `Basic ${btoa(`${username}:${password}`)}`,
      description: "",
    },
  ]
}
