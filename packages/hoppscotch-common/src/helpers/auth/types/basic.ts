import {
  parseTemplateString,
  HoppRESTAuth,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"

export async function generateBasicAuthHeaders(
  auth: HoppRESTAuth & { authType: "basic" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  // Always resolve the actual env variable values for base64 encoding,
  // regardless of `showKeyIfSecret`. If we pass `showKeyIfSecret = true`,
  // secret variables are replaced with placeholder strings like `<<key>>`
  // which then get base64-encoded, producing incorrect Authorization headers.
  // See: https://github.com/hoppscotch/hoppscotch/issues/5863
  const username = parseTemplateString(auth.username, envVars, false, false)
  const password = parseTemplateString(auth.password, envVars, false, false)

  return [
    {
      active: true,
      key: "Authorization",
      value: `Basic ${btoa(`${username}:${password}`)}`,
      description: "",
    },
  ]
}
