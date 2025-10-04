import {
  parseTemplateString,
  HoppRESTAuth,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"

export async function generateBearerAuthHeaders(
  auth: HoppRESTAuth & { authType: "bearer" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  const token = parseTemplateString(auth.token, envVars, false, showKeyIfSecret)

  return [
    {
      active: true,
      key: "Authorization",
      value: `Bearer ${token}`,
      description: "",
    },
  ]
}
