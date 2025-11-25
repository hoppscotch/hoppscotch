import {
  parseTemplateString,
  HoppRESTAuth,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"

export async function generateOAuth2AuthHeaders(
  auth: HoppRESTAuth & { authType: "oauth-2" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  const token = parseTemplateString(
    auth.grantTypeInfo.token,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "Authorization",
      value: `Bearer ${token}`,
      description: "",
    },
  ]
}

export async function generateOAuth2AuthParams(
  auth: HoppRESTAuth & { authType: "oauth-2" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  const token = parseTemplateString(
    auth.grantTypeInfo.token,
    envVars,
    false,
    showKeyIfSecret
  )

  return [
    {
      active: true,
      key: "access_token",
      value: token,
      description: "",
    },
  ]
}
