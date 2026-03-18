import {
  parseTemplateString,
  HoppRESTAuth,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"

export async function generateApiKeyAuthHeaders(
  auth: HoppRESTAuth & { authType: "api-key" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTHeader[]> {
  if (auth.addTo !== "HEADERS") return []

  return [
    {
      active: true,
      key: parseTemplateString(auth.key, envVars, false, showKeyIfSecret),
      value: parseTemplateString(
        auth.value ?? "",
        envVars,
        false,
        showKeyIfSecret
      ),
      description: "",
    },
  ]
}

export async function generateApiKeyAuthParams(
  auth: HoppRESTAuth & { authType: "api-key" },
  envVars: Environment["variables"],
  showKeyIfSecret = false
): Promise<HoppRESTParam[]> {
  if (auth.addTo !== "QUERY_PARAMS") return []

  return [
    {
      active: true,
      key: parseTemplateString(auth.key, envVars, false, showKeyIfSecret),
      value: parseTemplateString(auth.value, envVars, false, showKeyIfSecret),
      description: "",
    },
  ]
}
