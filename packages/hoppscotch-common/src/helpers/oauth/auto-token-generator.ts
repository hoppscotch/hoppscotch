import {
  HoppCollection,
  HoppRESTAuth,
  REDIRECT_GRANT_TYPES,
  OAUTH_ERROR_MESSAGES,
  type OAuthTokenGenerationError,
  type ClientCredentialsGrantInfo,
  type PasswordGrantInfo,
  hasOAuth2Auth,
  requiresRedirect,
  updateCollectionWithToken,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import clientCredentials from "~/services/oauth/flows/clientCredentials"
import passwordFlow from "~/services/oauth/flows/password"
import { replaceTemplateStringsInObjectValues } from "../auth"

export {
  REDIRECT_GRANT_TYPES,
  OAUTH_ERROR_MESSAGES,
  hasOAuth2Auth,
  requiresRedirect,
  updateCollectionWithToken,
}
export type { OAuthTokenGenerationError }

/**
 * Automatically generates an OAuth 2.0 token for a collection in browser environment
 *
 * @param collection - The collection with OAuth 2.0 auth configured
 * @returns Either an error or the generated access token and optional refresh token
 */
export async function generateOAuth2TokenForCollection(
  collection: HoppCollection
): Promise<
  E.Either<
    OAuthTokenGenerationError,
    { access_token: string; refresh_token?: string }
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
        return await generateClientCredentialsToken(auth)

      case "PASSWORD":
        return await generatePasswordToken(auth)

      default:
        return E.left("UNSUPPORTED_GRANT_TYPE")
    }
  } catch (error) {
    console.error(
      "OAuth token generation error. Check configuration and credentials."
    )
    return E.left("TOKEN_GENERATION_FAILED")
  }
}

/**
 * Generate token using Client Credentials grant type
 */
async function generateClientCredentialsToken(
  auth: HoppRESTAuth & { authType: "oauth-2" }
): Promise<
  E.Either<
    OAuthTokenGenerationError,
    { access_token: string; refresh_token?: string }
  >
> {
  const grantTypeInfo = auth.grantTypeInfo as ClientCredentialsGrantInfo

  // Type guard to ensure we have the right grant type
  if (grantTypeInfo.grantType !== "CLIENT_CREDENTIALS") {
    return E.left("VALIDATION_FAILED")
  }

  // Replace template strings in the auth configuration
  const values = replaceTemplateStringsInObjectValues({
    authEndpoint: grantTypeInfo.authEndpoint,
    clientID: grantTypeInfo.clientID,
    clientSecret: grantTypeInfo.clientSecret || "",
    scopes: grantTypeInfo.scopes,
    clientAuthentication: grantTypeInfo.clientAuthentication || "IN_BODY",
    tokenRequestParams: grantTypeInfo.tokenRequestParams || [],
    refreshRequestParams: grantTypeInfo.refreshRequestParams || [],
  })

  // Validate the parameters
  const parsedArgs = clientCredentials.params.safeParse(values)

  if (!parsedArgs.success) {
    console.error(
      "Client Credentials validation failed. Check configuration and credentials."
    )
    return E.left("VALIDATION_FAILED")
  }

  // Call the OAuth flow
  const result = await clientCredentials.init(parsedArgs.data)

  if (E.isLeft(result)) {
    return E.left("TOKEN_GENERATION_FAILED")
  }

  return E.right({
    access_token: result.right?.access_token || "",
  })
}

/**
 * Generate token using Password grant type
 */
async function generatePasswordToken(
  auth: HoppRESTAuth & { authType: "oauth-2" }
): Promise<
  E.Either<
    OAuthTokenGenerationError,
    { access_token: string; refresh_token?: string }
  >
> {
  const grantTypeInfo = auth.grantTypeInfo as PasswordGrantInfo

  // Type guard to ensure we have the right grant type
  if (grantTypeInfo.grantType !== "PASSWORD") {
    return E.left("VALIDATION_FAILED")
  }

  // Replace template strings in the auth configuration
  const values = replaceTemplateStringsInObjectValues({
    authEndpoint: grantTypeInfo.authEndpoint,
    clientID: grantTypeInfo.clientID,
    clientSecret: grantTypeInfo.clientSecret || "",
    username: grantTypeInfo.username || "",
    password: grantTypeInfo.password || "",
    scopes: grantTypeInfo.scopes,
    tokenRequestParams: grantTypeInfo.tokenRequestParams || [],
    refreshRequestParams: grantTypeInfo.refreshRequestParams || [],
  })

  // Validate the parameters
  const parsedArgs = passwordFlow.params.safeParse(values)

  if (!parsedArgs.success) {
    console.error(
      "Password flow validation failed. Check configuration and credentials."
    )
    return E.left("VALIDATION_FAILED")
  }

  // Call the OAuth flow
  const result = await passwordFlow.init(parsedArgs.data)

  if (E.isLeft(result)) {
    return E.left("TOKEN_GENERATION_FAILED")
  }

  return E.right({
    access_token: result.right?.access_token || "",
    refresh_token: (
      result.right as { access_token: string; refresh_token?: string }
    )?.refresh_token,
  })
}
