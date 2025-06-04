import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { AuthStrategy } from "../AuthRegistry"

export class BearerAuthStrategy implements AuthStrategy {
  readonly authType = "bearer"

  async generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTHeader[]> {
    if (auth.authType !== "bearer") return []

    const token = parseTemplateString(
      auth.token,
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

  async generateParams(): Promise<HoppRESTParam[]> {
    return [] // Bearer auth doesn't use query params
  }

  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean {
    return existingHeaders.some((h) => h.key.toLowerCase() === "authorization")
  }
}
