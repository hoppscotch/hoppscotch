import {
  parseTemplateString,
  generateJWTToken,
  HoppRESTAuth,
  HoppRESTRequest,
  Environment,
  HoppRESTHeader,
  HoppRESTParam,
} from "@hoppscotch/data"
import { AuthStrategy } from "../AuthRegistry"

export class JwtAuthStrategy implements AuthStrategy {
  readonly authType = "jwt"

  async generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret = false
  ): Promise<HoppRESTHeader[]> {
    if (auth.authType !== "jwt" || auth.addTo !== "HEADERS") return []

    const token = await generateJWTToken({
      algorithm: auth.algorithm || "HS256",
      secret: parseTemplateString(auth.secret, envVars, false),
      privateKey: parseTemplateString(auth.privateKey, envVars, false),
      payload: parseTemplateString(auth.payload, envVars, false),
      jwtHeaders: parseTemplateString(auth.jwtHeaders, envVars, false),
      isSecretBase64Encoded: auth.isSecretBase64Encoded,
    })

    if (!token) return []

    // Get prefix (defaults to "Bearer " if not specified)
    const headerPrefix = parseTemplateString(
      auth.headerPrefix,
      envVars,
      false,
      showKeyIfSecret
    )

    return [
      {
        active: true,
        key: "Authorization",
        value: `${headerPrefix}${token}`,
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
    if (auth.authType !== "jwt" || auth.addTo !== "QUERY_PARAMS") return []

    const token = await generateJWTToken({
      algorithm: auth.algorithm || "HS256",
      secret: parseTemplateString(auth.secret, envVars, false),
      privateKey: parseTemplateString(auth.privateKey, envVars, false),
      payload: parseTemplateString(auth.payload, envVars, false),
      jwtHeaders: parseTemplateString(auth.jwtHeaders, envVars, false),
      isSecretBase64Encoded: auth.isSecretBase64Encoded,
    })

    if (!token) return []

    // Get param name (defaults to "token" if not specified)
    const paramName = parseTemplateString(auth.paramName, envVars)

    return [
      {
        active: true,
        key: paramName,
        value: token,
        description: "",
      },
    ]
  }

  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean {
    if (auth.authType !== "jwt" || auth.addTo !== "HEADERS") return false
    return existingHeaders.some((h) => h.key.toLowerCase() === "authorization")
  }
}
