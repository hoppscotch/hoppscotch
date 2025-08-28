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
  const username = parseTemplateString(
    auth.username,
    envVars,
    false,
    showKeyIfSecret
  )
  const password = parseTemplateString(
    auth.password,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "Authorization",
      value: `Basic ${btoa(`${username}:${password}`)}`,
      description: "",
    },
  ]
}
