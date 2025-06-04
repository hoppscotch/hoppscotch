import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { AuthStrategy } from "../AuthRegistry"

export class ApiKeyAuthStrategy implements AuthStrategy {
  readonly authType = "api-key"

  async generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTHeader[]> {
    if (auth.authType !== "api-key" || auth.addTo !== "HEADERS") return []

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

  async generateParams(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTParam[]> {
    if (auth.authType !== "api-key" || auth.addTo !== "QUERY_PARAMS") return []

    return [
      {
        active: true,
        key: parseTemplateString(auth.key, envVars, false, showKeyIfSecret),
        value: parseTemplateString(auth.value, envVars, false, showKeyIfSecret),
        description: "",
      },
    ]
  }

  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean {
    if (auth.authType !== "api-key" || auth.addTo !== "HEADERS") return false
    return existingHeaders.some(
      (h) => h.key.toLowerCase() === auth.key.toLowerCase()
    )
  }
}
