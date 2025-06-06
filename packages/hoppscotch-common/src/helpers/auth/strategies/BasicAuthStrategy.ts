import {
  parseTemplateString,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
} from "@hoppscotch/data"
import { AuthStrategy } from "../AuthRegistry"

export class BasicAuthStrategy implements AuthStrategy {
  readonly authType = "basic"

  async generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTHeader[]> {
    if (auth.authType !== "basic") return []

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

  async generateParams() {
    return [] // Basic auth doesn't use query params
  }

  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean {
    return existingHeaders.some((h) => h.key.toLowerCase() === "authorization")
  }
}
