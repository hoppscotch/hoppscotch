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
 * Error message keys for OAuth token generation failures
 * These keys map to i18n translation keys in the UI and plain messages in CLI
 */
export const OAUTH_ERROR_MESSAGES = {
  NO_OAUTH_CONFIG: "authorization.oauth.no_config_found",
  REDIRECT_GRANT_TYPE_NOT_SUPPORTED:
    "authorization.oauth.redirect_not_supported_for_collection",
  VALIDATION_FAILED: "authorization.oauth.auto_generation_validation_failed",
  TOKEN_GENERATION_FAILED: "authorization.oauth.token_fetch_failed",
  UNSUPPORTED_GRANT_TYPE:
    "authorization.oauth.unsupported_grant_type_for_auto_generation",
} as const

/**
 * CLI-specific error messages for OAuth token generation failures
 * Plain English messages for command-line output (no i18n)
 */
export const OAUTH_CLI_ERROR_MESSAGES: Record<OAuthTokenGenerationError, string> = {
  NO_OAUTH_CONFIG: "No OAuth 2.0 configuration found",
  REDIRECT_GRANT_TYPE_NOT_SUPPORTED: "OAuth grant type requires browser redirect",
  VALIDATION_FAILED: "OAuth 2.0 configuration validation failed. Check your client ID and auth endpoint.",
  TOKEN_GENERATION_FAILED: "Failed to fetch OAuth token. Check your credentials and configuration.",
  UNSUPPORTED_GRANT_TYPE: "Unsupported OAuth 2.0 grant type for auto-generation",
}

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
  return REDIRECT_GRANT_TYPES.includes(auth.grantTypeInfo.grantType as typeof REDIRECT_GRANT_TYPES[number])
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
  if (!collection.auth || collection.auth.authType !== "oauth-2") return;

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
