import {
  getLocalConfig,
  setLocalConfig,
  removeLocalConfig,
} from "~/newstore/localpersistence"

const redirectUri = `${window.location.origin}/`

// GENERAL HELPER FUNCTIONS

/**
 * Makes a POST request and parse the response as JSON
 *
 * @param {String} url - The resource
 * @param {Object} params - Configuration options
 * @returns {Object}
 */

const sendPostRequest = async (url, params) => {
  const body = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join("&")
  const options = {
    method: "post",
    headers: {
      "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  }
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return data
  } catch (e) {
    console.error(e)
  }
}

/**
 * Parse a query string into an object
 *
 * @param {String} searchQuery - The search query params
 * @returns {Object}
 */

const parseQueryString = (searchQuery) => {
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

const getTokenConfiguration = async (endpoint) => {
  const options = {
    method: "GET",
    headers: {
      "Content-type": "application/json",
    },
  }
  try {
    const response = await fetch(endpoint, options)
    const config = await response.json()
    return config
  } catch (e) {
    console.error(e)
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
  return Array.from(array, (dec) => `0${dec.toString(16)}`.substr(-2)).join("")
}

/**
 * Calculate the SHA256 hash of the input text
 *
 * @returns {Promise<ArrayBuffer>}
 */

const sha256 = (plain) => {
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
  str // Converts the ArrayBuffer to string using Uint8 array to convert to what btoa accepts.
) =>
  // btoa accepts chars only within ascii 0-255 and base64 encodes them.
  // Then convert the base64 encoded to base64url encoded
  //   (replace + with -, replace / with _, trim trailing =)
  btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

/**
 * Return the base64-urlencoded sha256 hash for the PKCE challenge
 *
 * @param {String} v - The randomly generated string
 * @returns {String}
 */

const pkceChallengeFromVerifier = async (v) => {
  const hashed = await sha256(v)
  return base64urlencode(hashed)
}

// OAUTH REQUEST

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
  scope,
}) => {
  // Check oauth configuration
  if (oidcDiscoveryUrl !== "") {
    // eslint-disable-next-line camelcase
    const { authorization_endpoint, token_endpoint } =
      await getTokenConfiguration(oidcDiscoveryUrl)
    // eslint-disable-next-line camelcase
    authUrl = authorization_endpoint
    // eslint-disable-next-line camelcase
    accessTokenUrl = token_endpoint
  }

  // Store oauth information
  setLocalConfig("tokenEndpoint", accessTokenUrl)
  setLocalConfig("client_id", clientId)

  // Create and store a random state value
  const state = generateRandomString()
  setLocalConfig("pkce_state", state)

  // Create and store a new PKCE codeVerifier (the plaintext random secret)
  const codeVerifier = generateRandomString()
  setLocalConfig("pkce_codeVerifier", codeVerifier)

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
  window.location = buildUrl()
}

// OAUTH REDIRECT HANDLING

/**
 * Handle the redirect back from the authorization server and
 * get an access token from the token endpoint
 *
 * @returns {Object}
 */

const oauthRedirect = () => {
  let tokenResponse = ""
  const q = parseQueryString(window.location.search.substring(1))
  // Check if the server returned an error string
  if (q.error) {
    alert(`Error returned from authorization server: ${q.error}`)
  }
  // If the server returned an authorization code, attempt to exchange it for an access token
  if (q.code) {
    // Verify state matches what we set at the beginning
    if (getLocalConfig("pkce_state") !== q.state) {
      alert("Invalid state")
    } else {
      try {
        // Exchange the authorization code for an access token
        tokenResponse = sendPostRequest(getLocalConfig("tokenEndpoint"), {
          grant_type: "authorization_code",
          code: q.code,
          client_id: getLocalConfig("client_id"),
          redirect_uri: redirectUri,
          code_verifier: getLocalConfig("pkce_codeVerifier"),
        })
      } catch (e) {
        console.error(e)
      }
    }
    // Clean these up since we don't need them anymore
    removeLocalConfig("pkce_state")
    removeLocalConfig("pkce_codeVerifier")
    removeLocalConfig("tokenEndpoint")
    removeLocalConfig("client_id")
    return tokenResponse
  }
  return tokenResponse
}

export { tokenRequest, oauthRedirect }
