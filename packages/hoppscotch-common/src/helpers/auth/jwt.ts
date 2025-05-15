import * as jwt from "jsonwebtoken"
import { Environment } from "@hoppscotch/data"
import { parseTemplateString } from "@hoppscotch/data"

/**
 * Generates a JWT token based on the provided parameters
 *
 * @param secret The secret key for signing the JWT
 * @param isSecretBase64Encoded Whether the secret is base64 encoded
 * @param payload JSON payload string to be included in the JWT
 * @param algorithm JWT algorithm to use (HS256, RS256, etc)
 * @param jwtHeaders JSON headers string to be included in the JWT
 * @param envVars Environment variables to use for template parsing
 * @param showKeyIfSecret Whether to show key if it's a secret
 * @returns The generated JWT token
 */
export function generateJWTToken(
  secret: string,
  isSecretBase64Encoded: boolean,
  payload: string,
  algorithm: string,
  jwtHeaders: string,
  envVars: Environment["variables"],
  showKeyIfSecret: boolean = false
): string {
  try {
    // Parse the payload and headers from JSON strings
    let parsedPayload = {}
    let parsedHeaders = {}

    try {
      parsedPayload = JSON.parse(
        parseTemplateString(payload, envVars, false, showKeyIfSecret) || "{}"
      )
    } catch (e) {
      console.error("Failed to parse JWT payload JSON:", e)
    }

    try {
      parsedHeaders = JSON.parse(
        parseTemplateString(jwtHeaders, envVars, false, showKeyIfSecret) || "{}"
      )
    } catch (e) {
      console.error("Failed to parse JWT headers JSON:", e)
    }

    // Get secret from environment variables if needed
    const parsedSecret = parseTemplateString(
      secret,
      envVars,
      false,
      showKeyIfSecret
    )

    // Generate token based on algorithm type
    return jwt.sign(
      parsedPayload,
      isSecretBase64Encoded
        ? Buffer.from(parsedSecret, "base64")
        : parsedSecret,
      {
        algorithm: algorithm as jwt.Algorithm,
        ...parsedHeaders,
      }
    )
  } catch (e) {
    console.error("Error generating JWT token:", e)
    return ""
  }
}
