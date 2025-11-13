import { HoppRESTAuth } from "../rest"
import { HoppCollection } from "../collection"
import { EnvironmentVariable } from "../environment"
import { parseTemplateStringE } from "../index"
import * as E from "fp-ts/Either"

/**
 * OAuth grant types that require browser redirect flows
 * These cannot be auto-generated in CLI or test runner
 */
export const REDIRECT_GRANT_TYPES = ["AUTHORIZATION_CODE", "IMPLICIT"] as const

export type OAuthTokenGenerationError =
  | "NO_OAUTH_CONFIG"
  | "REDIRECT_GRANT_TYPE_NOT_SUPPORTED"
  | "VALIDATION_FAILED"
  | "TOKEN_GENERATION_FAILED"
  | "UNSUPPORTED_GRANT_TYPE"

/**
 * Type for CLIENT_CREDENTIALS grant type info with all required fields
 */
export interface ClientCredentialsGrantInfo {
  grantType: "CLIENT_CREDENTIALS"
  authEndpoint: string
  clientID: string
  clientSecret: string
  scopes?: string
  clientAuthentication?: "IN_BODY" | "AS_BASIC_AUTH_HEADERS"
  tokenRequestParams?: Array<{
    key: string
    value: string
    active: boolean
    sendIn?: string
  }>
  refreshRequestParams?: Array<{
    key: string
    value: string
    active: boolean
    sendIn?: string
  }>
  token?: string
}

/**
 * Type for PASSWORD grant type info with all required fields
 */
export interface PasswordGrantInfo {
  grantType: "PASSWORD"
  authEndpoint: string
  clientID: string
  clientSecret: string
  username: string
  password: string
  scopes?: string
  clientAuthentication?: "IN_BODY" | "AS_BASIC_AUTH_HEADERS"
  tokenRequestParams?: Array<{
    key: string
    value: string
    active: boolean
    sendIn?: string
  }>
  refreshRequestParams?: Array<{
    key: string
    value: string
    active: boolean
    sendIn?: string
  }>
  token?: string
  refreshToken?: string
}

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
export function expandTemplateString(
  value: string,
  envVariables: EnvironmentVariable[]
): string {
  const result = parseTemplateStringE(value, envVariables)
  return E.isRight(result) ? result.right : value
}

/**
 * Updates a collection's OAuth configuration with the generated token
 */
export function updateCollectionWithToken(
  collection: HoppCollection,
  token: string,
  refreshToken?: string
): void {
  if (collection.auth?.authType === "oauth-2") {
    const grantType = collection.auth.grantTypeInfo.grantType

    collection.auth.grantTypeInfo = {
      ...collection.auth.grantTypeInfo,
      token,
    }

    // Set refresh token if provided and grant type supports it
    if (refreshToken && grantType === "PASSWORD") {
      const grantTypeInfo = collection.auth.grantTypeInfo as PasswordGrantInfo
      grantTypeInfo.refreshToken = refreshToken
    }
  }
}

/**
 * Validates required OAuth parameters for CLIENT_CREDENTIALS grant type
 */
export function validateClientCredentialsParams(params: {
  authEndpoint: string
  clientID: string
}): E.Either<OAuthTokenGenerationError, void> {
  if (!params.authEndpoint || !params.clientID) {
    return E.left("VALIDATION_FAILED")
  }
  return E.right(undefined)
}

/**
 * Validates required OAuth parameters for PASSWORD grant type
 */
export function validatePasswordParams(params: {
  authEndpoint: string
  clientID: string
  username: string
  password: string
}): E.Either<OAuthTokenGenerationError, void> {
  if (
    !params.authEndpoint ||
    !params.clientID ||
    !params.username ||
    !params.password
  ) {
    return E.left("VALIDATION_FAILED")
  }
  return E.right(undefined)
}
