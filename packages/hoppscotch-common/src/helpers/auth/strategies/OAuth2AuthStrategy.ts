import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { AuthStrategy } from "../AuthRegistry"

export class OAuth2AuthStrategy implements AuthStrategy {
  readonly authType = "oauth-2"

  async generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTHeader[]> {
    if (auth.authType !== "oauth-2" || auth.addTo !== "HEADERS") return []

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

  async generateParams(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTParam[]> {
    if (auth.authType !== "oauth-2" || auth.addTo !== "QUERY_PARAMS") return []

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

  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean {
    if (auth.authType !== "oauth-2" || auth.addTo !== "HEADERS") return false
    return existingHeaders.some((h) => h.key.toLowerCase() === "authorization")
  }
}
