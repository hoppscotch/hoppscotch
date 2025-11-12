import { HoppCollection, HoppRESTAuth, parseTemplateStringE, EnvironmentVariable } from "@hoppscotch/data"
import axios from "axios"
import * as E from "fp-ts/Either"
import { z } from "zod"

/**
 * OAuth grant types that require browser redirect flows
 * These cannot be auto-generated in CLI
 */
export const REDIRECT_GRANT_TYPES = ["AUTHORIZATION_CODE", "IMPLICIT"] as const

export type OAuthTokenGenerationError =
  | "NO_OAUTH_CONFIG"
  | "REDIRECT_GRANT_TYPE_NOT_SUPPORTED"
  | "VALIDATION_FAILED"
  | "TOKEN_GENERATION_FAILED"
  | "UNSUPPORTED_GRANT_TYPE"

/**
 * Checks if a collection has OAuth 2.0 authentication configured
 */
export function hasOAuth2Auth(collection: HoppCollection): boolean {
  return collection.auth?.authType === "oauth-2" && collection.auth.authActive
}

/**
 * Checks if the OAuth grant type requires browser redirect
 */
export function requiresRedirect(auth: HoppRESTAuth): boolean {
  if (auth.authType !== "oauth-2") return false
  return REDIRECT_GRANT_TYPES.includes(auth.grantTypeInfo.grantType as any)
}

/**
 * Expands template strings in a value using environment variables
 * Returns the original value if expansion fails
 */
function expandTemplateString(
  value: string,
  envVariables: EnvironmentVariable[]
): string {
  const result = parseTemplateStringE(value, envVariables)
  return E.isRight(result) ? result.right : value
}

/**
 * Automatically generates an OAuth 2.0 token for a collection in CLI environment
 *
 * @param collection - The collection with OAuth 2.0 auth configured
 * @param envVariables - Environment variables for template string expansion
 * @returns Either an error or the generated access token and optional refresh token
 */
export async function generateOAuth2TokenForCollection(
  collection: HoppCollection,
  envVariables: EnvironmentVariable[] = []
): Promise<
  E.Either<
    OAuthTokenGenerationError,
    { access_token: string; refresh_token?: string; token_type?: string; expires_in?: number }
  >
> {
  // Check if collection has OAuth 2.0 configured
  if (!hasOAuth2Auth(collection)) {
    return E.left("NO_OAUTH_CONFIG")
  }

  const auth = collection.auth as HoppRESTAuth & { authType: "oauth-2" }
  const grantType = auth.grantTypeInfo.grantType

  // Check if grant type requires redirect - these cannot be auto-generated
  if (requiresRedirect(auth)) {
    return E.left("REDIRECT_GRANT_TYPE_NOT_SUPPORTED")
  }

  // Generate token based on grant type
  try {
    switch (grantType) {
      case "CLIENT_CREDENTIALS":
        return await generateClientCredentialsToken(auth, envVariables)

      case "PASSWORD":
        return await generatePasswordToken(auth, envVariables)

      default:
        return E.left("UNSUPPORTED_GRANT_TYPE")
    }
  } catch (error) {
    console.error("OAuth token generation error:", error)
    return E.left("TOKEN_GENERATION_FAILED")
  }
}

/**
 * Generate token using Client Credentials grant type
 */
async function generateClientCredentialsToken(
  auth: HoppRESTAuth & { authType: "oauth-2" },
  envVariables: EnvironmentVariable[]
): Promise<
  E.Either<
    OAuthTokenGenerationError,
    { access_token: string; refresh_token?: string; token_type?: string; expires_in?: number }
  >
> {
  const grantTypeInfo = auth.grantTypeInfo

  // Type guard to ensure we have the right grant type
  if (grantTypeInfo.grantType !== "CLIENT_CREDENTIALS") {
    return E.left("VALIDATION_FAILED")
  }

  // Expand template strings in OAuth configuration
  const authEndpoint = expandTemplateString(grantTypeInfo.authEndpoint, envVariables)
  const clientID = expandTemplateString(grantTypeInfo.clientID, envVariables)
  const clientSecret = expandTemplateString((grantTypeInfo as any).clientSecret || "", envVariables)
  const scopes = expandTemplateString(grantTypeInfo.scopes || "", envVariables)
  const clientAuthentication =
    (grantTypeInfo as any).clientAuthentication || "IN_BODY"
  const tokenRequestParams = (grantTypeInfo as any).tokenRequestParams || []

  // Validate required parameters
  if (!authEndpoint || !clientID) {
    console.error("❌ Client Credentials validation failed: missing required parameters.")
    console.error(`Auth endpoint: ${authEndpoint || "(missing)"}`)
    console.error(`Client ID: ${clientID || "(missing)"}`)
    return E.left("VALIDATION_FAILED")
  }

  try {
    // Prepare headers and body based on authentication method
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    }

    const bodyParams: Record<string, string> = {
      grant_type: "client_credentials",
    }

    const urlParams: Record<string, string> = {}

    if (clientAuthentication === "AS_BASIC_AUTH_HEADERS") {
      // RFC 6749 Section 2.3.1 - credentials in Authorization header
      const encodedClientID = encodeURIComponent(clientID).replace(/%20/g, "+")
      const encodedClientSecret = encodeURIComponent(clientSecret).replace(
        /%20/g,
        "+"
      )
      const basicAuthToken = Buffer.from(
        `${encodedClientID}:${encodedClientSecret}`
      ).toString("base64")
      headers.Authorization = `Basic ${basicAuthToken}`
    } else {
      // Credentials in body
      bodyParams.client_id = clientID
      if (clientSecret) {
        bodyParams.client_secret = clientSecret
      }
    }

    if (scopes) {
      bodyParams.scope = scopes
    }

    // Process additional token request parameters
    if (tokenRequestParams && Array.isArray(tokenRequestParams)) {
      tokenRequestParams
        .filter((param: any) => param.active && param.key && param.value)
        .forEach((param: any) => {
          if (param.sendIn === "headers") {
            headers[param.key] = param.value
          } else if (param.sendIn === "url") {
            urlParams[param.key] = param.value
          } else {
            // Default to body
            bodyParams[param.key] = param.value
          }
        })
    }

    // Build URL with query parameters
    const url = new URL(authEndpoint)
    Object.entries(urlParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    // Make the token request
    const response = await axios.post(
      url.toString(),
      new URLSearchParams(bodyParams).toString(),
      { headers }
    )

    // Validate response
    const tokenResponseSchema = z.object({
      access_token: z.string(),
      token_type: z.string().optional(),
      expires_in: z.number().optional(),
      refresh_token: z.string().optional(),
    })

    const parsedResponse = tokenResponseSchema.safeParse(response.data)

    if (!parsedResponse.success) {
      return E.left("TOKEN_GENERATION_FAILED")
    }

    // Check for missing or empty access_token
    if (
      !parsedResponse.data.access_token ||
      parsedResponse.data.access_token.trim() === ""
    ) {
      return E.left("TOKEN_GENERATION_FAILED")
    }

    return E.right(parsedResponse.data)
  } catch (error) {
    console.error("\n❌ Client Credentials token generation failed:", error);
    return E.left("TOKEN_GENERATION_FAILED")
  }
}

/**
 * Generate token using Password grant type
 */
async function generatePasswordToken(
  auth: HoppRESTAuth & { authType: "oauth-2" },
  envVariables: EnvironmentVariable[]
): Promise<
  E.Either<
    OAuthTokenGenerationError,
    { access_token: string; refresh_token?: string; token_type?: string; expires_in?: number }
  >
> {
  const grantTypeInfo = auth.grantTypeInfo

  // Type guard to ensure we have the right grant type
  if (grantTypeInfo.grantType !== "PASSWORD") {
    return E.left("VALIDATION_FAILED")
  }

  // Expand template strings in OAuth configuration
  const authEndpoint = expandTemplateString(grantTypeInfo.authEndpoint, envVariables)
  const clientID = expandTemplateString(grantTypeInfo.clientID, envVariables)
  const clientSecret = expandTemplateString((grantTypeInfo as any).clientSecret || "", envVariables)
  const username = expandTemplateString((grantTypeInfo as any).username || "", envVariables)
  const password = expandTemplateString((grantTypeInfo as any).password || "", envVariables)
  const scopes = expandTemplateString(grantTypeInfo.scopes || "", envVariables)
  const tokenRequestParams = (grantTypeInfo as any).tokenRequestParams || []

  // Validate required parameters
  if (!authEndpoint || !clientID || !username || !password) {
    console.error("Password flow validation failed: missing required parameters.")
    return E.left("VALIDATION_FAILED")
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    }

    const bodyParams: Record<string, string> = {
      grant_type: "password",
      client_id: clientID,
      username,
      password,
    }

    if (clientSecret) {
      bodyParams.client_secret = clientSecret
    }

    if (scopes) {
      bodyParams.scope = scopes
    }

    const urlParams: Record<string, string> = {}

    // Process additional token request parameters
    if (tokenRequestParams && Array.isArray(tokenRequestParams)) {
      tokenRequestParams
        .filter((param: any) => param.active && param.key && param.value)
        .forEach((param: any) => {
          if (param.sendIn === "headers") {
            headers[param.key] = param.value
          } else if (param.sendIn === "url") {
            urlParams[param.key] = param.value
          } else {
            // Default to body
            bodyParams[param.key] = param.value
          }
        })
    }

    // Build URL with query parameters
    const url = new URL(authEndpoint)
    Object.entries(urlParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    // Make the token request
    const response = await axios.post(
      url.toString(),
      new URLSearchParams(bodyParams).toString(),
      { headers }
    )

    // Validate response
    const tokenResponseSchema = z.object({
      access_token: z.string(),
      token_type: z.string().optional(),
      expires_in: z.number().optional(),
      refresh_token: z.string().optional(),
    })

    const parsedResponse = tokenResponseSchema.safeParse(response.data)

    if (!parsedResponse.success) {
      console.error("Invalid token response:", parsedResponse.error)
      return E.left("TOKEN_GENERATION_FAILED")
    }

    // Check for missing or empty access_token
    if (
      !parsedResponse.data.access_token ||
      typeof parsedResponse.data.access_token !== "string" ||
      parsedResponse.data.access_token.trim() === ""
    ) {
      return E.left("TOKEN_GENERATION_FAILED")
    }

    return E.right(parsedResponse.data)
  } catch (error) {
    console.error("Password flow token generation failed:", error)
    return E.left("TOKEN_GENERATION_FAILED")
  }
}

/**
 * Updates the collection's auth configuration with the generated token
 * This mutates the collection object
 */
export function updateCollectionWithToken(
  collection: HoppCollection,
  token: string,
  refreshToken?: string
): void {
  if (collection.auth?.authType === "oauth-2") {
    collection.auth.grantTypeInfo = {
      ...collection.auth.grantTypeInfo,
      token,
    }

    // Set refresh token if provided and grant type supports it
    if (refreshToken) {
      const grantType = collection.auth.grantTypeInfo.grantType
      if (grantType === "PASSWORD" || grantType === "AUTHORIZATION_CODE") {
        ;(collection.auth.grantTypeInfo as any).refreshToken = refreshToken
      }
    }
  }
}
