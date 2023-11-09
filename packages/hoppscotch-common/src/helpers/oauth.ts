import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence"

import * as E from "fp-ts/Either"
import { z } from "zod"

const redirectUri = `${window.location.origin}/oauth`

const persistenceService = getService(PersistenceService)

// GENERAL HELPER FUNCTIONS

/**
 * Makes a POST request and parse the response as JSON
 *
 * @param {String} url - The resource
 * @param {Object} params - Configuration options
 * @returns {Object}
 */

const sendPostRequest = async (url: string, params: Record<string, string>) => {
  const body = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")
  const options = {
    method: "POST",
    headers: {
      "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  }
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return E.right(data)
  } catch (e) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED")
  }
}

/**
 * Parse a query string into an object
 *
 * @param {String} searchQuery - The search query params
 * @returns {Object}
 */

const parseQueryString = (searchQuery: string): Record<string, string> => {
  if (searchQuery === "") {
    return {}
  }
  const segments = searchQuery.split("&").map((s) => s.split("="))
  const queryString = segments.reduce(
    (obj, el) => ({ ...obj, [el[0]]: el[1] }),
    {}
  )
  return queryString
}

/**
 * Get OAuth configuration from OpenID Discovery endpoint
 *
 * @returns {Object}
 */

const getTokenConfiguration = async (endpoint: string) => {
  const options = {
    method: "GET",
    headers: {
      "Content-type": "application/json",
    },
  }
  try {
    const response = await fetch(endpoint, options)
    const config = await response.json()
    return E.right(config)
  } catch (e) {
    return E.left("OIDC_DISCOVERY_FAILED")
  }
}

// PKCE HELPER FUNCTIONS

/**
 * Generates a secure random string using the browser crypto functions
 *
 * @returns {Object}
 */

const generateRandomString = () => {
  const array = new Uint32Array(28)
  window.crypto.getRandomValues(array)
  return Array.from(array, (dec) => `0${dec.toString(16)}`.slice(-2)).join("")
}

/**
 * Calculate the SHA256 hash of the input text
 *
 * @returns {Promise<ArrayBuffer>}
 */

const sha256 = (plain: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest("SHA-256", data)
}

/**
 * Encodes the input string into Base64 format
 *
 * @param {String} str - The string to be converted
 * @returns {Promise<ArrayBuffer>}
 */

const base64urlencode = (
  str: ArrayBuffer // Converts the ArrayBuffer to string using Uint8 array to convert to what btoa accepts.
) => {
  const hashArray = Array.from(new Uint8Array(str))

  // btoa accepts chars only within ascii 0-255 and base64 encodes them.
  // Then convert the base64 encoded to base64url encoded
  //   (replace + with -, replace / with _, trim trailing =)
  return btoa(String.fromCharCode.apply(null, hashArray))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/**
 * Return the base64-urlencoded sha256 hash for the PKCE challenge
 *
 * @param {String} v - The randomly generated string
 * @returns {String}
 */

const pkceChallengeFromVerifier = async (v: string) => {
  const hashed = await sha256(v)
  return base64urlencode(hashed)
}

// OAUTH REQUEST

type TokenRequestParams = {
  oidcDiscoveryUrl: string
  grantType: string
  authUrl: string
  accessTokenUrl: string
  clientId: string
  clientSecret: string
  scope: string
}

/**
 * Initiates PKCE Auth Code flow when requested
 *
 * @param {Object} - The necessary params
 * @returns {Void}
 */

const tokenRequest = async ({
  oidcDiscoveryUrl,
  grantType,
  authUrl,
  accessTokenUrl,
  clientId,
  clientSecret,
  scope,
}: TokenRequestParams) => {
  // Check oauth configuration
  if (oidcDiscoveryUrl !== "") {
    const res = await getTokenConfiguration(oidcDiscoveryUrl)

    const OIDCConfigurationSchema = z.object({
      authorization_endpoint: z.string(),
      token_endpoint: z.string(),
    })

    if (E.isLeft(res)) {
      return E.left("OIDC_DISCOVERY_FAILED" as const)
    }

    const parsedOIDCConfiguration = OIDCConfigurationSchema.safeParse(res.right)

    if (!parsedOIDCConfiguration.success) {
      return E.left("OIDC_DISCOVERY_FAILED" as const)
    }

    authUrl = parsedOIDCConfiguration.data.authorization_endpoint
    accessTokenUrl = parsedOIDCConfiguration.data.token_endpoint
  }
  // Store oauth information
  persistenceService.setLocalConfig("tokenEndpoint", accessTokenUrl)
  persistenceService.setLocalConfig("client_id", clientId)
  persistenceService.setLocalConfig("client_secret", clientSecret)

  // Create and store a random state value
  const state = generateRandomString()
  persistenceService.setLocalConfig("pkce_state", state)

  // Create and store a new PKCE codeVerifier (the plaintext random secret)
  const codeVerifier = generateRandomString()
  persistenceService.setLocalConfig("pkce_codeVerifier", codeVerifier)

  // Hash and base64-urlencode the secret to use as the challenge
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier)

  // Build the authorization URL
  const buildUrl = () =>
    `${authUrl + `?response_type=${grantType}`}&client_id=${encodeURIComponent(
      clientId
    )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(
      scope
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code_challenge=${encodeURIComponent(
      codeChallenge
    )}&code_challenge_method=S256`

  // Redirect to the authorization server
  window.location.assign(buildUrl())
}

// OAUTH REDIRECT HANDLING

/**
 * Handle the redirect back from the authorization server and
 * get an access token from the token endpoint
 *
 * @returns {Promise<any | void>}
 */

const handleOAuthRedirect = async () => {
  const queryParams = parseQueryString(window.location.search.substring(1))

  // Check if the server returned an error string
  if (queryParams.error) {
    return E.left("AUTH_SERVER_RETURNED_ERROR" as const)
  }

  if (!queryParams.code) {
    return E.left("NO_AUTH_CODE" as const)
  }

  // If the server returned an authorization code, attempt to exchange it for an access token
  // Verify state matches what we set at the beginning
  if (persistenceService.getLocalConfig("pkce_state") !== queryParams.state) {
    return E.left("INVALID_STATE" as const)
  }

  const tokenEndpoint = persistenceService.getLocalConfig("tokenEndpoint")
  const clientID = persistenceService.getLocalConfig("client_id")
  const clientSecret = persistenceService.getLocalConfig("client_secret")
  const codeVerifier = persistenceService.getLocalConfig("pkce_codeVerifier")

  if (!tokenEndpoint) {
    return E.left("NO_TOKEN_ENDPOINT" as const)
  }

  if (!clientID) {
    return E.left("NO_CLIENT_ID" as const)
  }

  if (!clientSecret) {
    return E.left("NO_CLIENT_SECRET" as const)
  }

  if (!codeVerifier) {
    return E.left("NO_CODE_VERIFIER" as const)
  }

  // Exchange the authorization code for an access token
  const tokenResponse: E.Either<string, any> = await sendPostRequest(
    tokenEndpoint,
    {
      grant_type: "authorization_code",
      code: queryParams.code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }
  )

  // Clean these up since we don't need them anymore
  clearPKCEState()

  if (E.isLeft(tokenResponse)) {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }

  const withAccessTokenSchema = z.object({
    access_token: z.string(),
  })

  const parsedTokenResponse = withAccessTokenSchema.safeParse(
    tokenResponse.right
  )

  return parsedTokenResponse.success
    ? E.right(parsedTokenResponse.data)
    : E.left("AUTH_TOKEN_REQUEST_INVALID_RESPONSE" as const)
}

const clearPKCEState = () => {
  persistenceService.removeLocalConfig("pkce_state")
  persistenceService.removeLocalConfig("pkce_codeVerifier")
  persistenceService.removeLocalConfig("tokenEndpoint")
  persistenceService.removeLocalConfig("client_id")
  persistenceService.removeLocalConfig("client_secret")
}

export { tokenRequest, handleOAuthRedirect }
