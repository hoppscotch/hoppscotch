const redirectUri = `${window.location.origin}/`;

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
    .map(key => `${key}=${params[key]}`)
    .join("&");
  const options = {
    method: "post",
    headers: {
      "Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
};

/**
 * Parse a query string into an object
 *
 * @param {String} searchQuery - The search query params
 * @returns {Object}
 */

const parseQueryString = searchQuery => {
  if (searchQuery === "") {
    return {};
  }
  const segments = searchQuery.split("&").map(s => s.split("="));
  const queryString = {};
  segments.forEach(s => (queryString[s[0]] = s[1]));
  return queryString;
};

/**
 * Get OAuth configuration from OpenID Discovery endpoint
 *
 * @returns {Object}
 */

const getTokenConfiguration = async endpoint => {
  const options = {
    method: "GET",
    headers: {
      "Content-type": "application/json"
    }
  };
  try {
    const response = await fetch(endpoint, options);
    const config = await response.json();
    return config;
  } catch (err) {
    console.error("Request failed", err);
    throw err;
  }
};

// PKCE HELPER FUNCTIONS

/**
 * Generates a secure random string using the browser crypto functions
 *
 * @returns {Object}
 */

const generateRandomString = () => {
  const array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => `0${dec.toString(16)}`.substr(-2)).join("");
};

/**
 * Calculate the SHA256 hash of the input text
 *
 * @returns {Promise<ArrayBuffer>}
 */

const sha256 = plain => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
};

/**
 * Base64-urlencodes the input string
 *
 * @param {String} str - The string to be converted
 * @returns {Promise<ArrayBuffer>}
 */

const base64urlencode = (
  str // Convert the ArrayBuffer to string using Uint8 array to convert to what btoa accepts.
) =>
  // btoa accepts chars only within ascii 0-255 and base64 encodes them.
  // Then convert the base64 encoded to base64url encoded
  //   (replace + with -, replace / with _, trim trailing =)
  btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
// Return the base64-urlencoded sha256 hash for the PKCE challenge
const pkceChallengeFromVerifier = async v => {
  const hashed = await sha256(v);
  return base64urlencode(hashed);
};

//////////////////////////////////////////////////////////////////////
// OAUTH REQUEST

// Initiate PKCE Auth Code flow when requested
const tokenRequest = async ({
  oidcDiscoveryUrl,
  grantType,
  authUrl,
  accessTokenUrl,
  clientId,
  scope
}) => {
  // Check oauth configuration
  if (oidcDiscoveryUrl !== "") {
    const {
      authorization_endpoint,
      token_endpoint
    } = await getTokenConfiguration(oidcDiscoveryUrl);
    authUrl = authorization_endpoint;
    accessTokenUrl = token_endpoint;
  }

  // Store oauth information
  localStorage.setItem("token_endpoint", accessTokenUrl);
  localStorage.setItem("client_id", clientId);

  // Create and store a random state value
  const state = generateRandomString();
  localStorage.setItem("pkce_state", state);

  // Create and store a new PKCE code_verifier (the plaintext random secret)
  const code_verifier = generateRandomString();
  localStorage.setItem("pkce_code_verifier", code_verifier);

  // Hash and base64-urlencode the secret to use as the challenge
  const code_challenge = await pkceChallengeFromVerifier(code_verifier);

  // Build the authorization URL
  const buildUrl = () =>
    `${authUrl + `?response_type=${grantType}`}&client_id=${encodeURIComponent(
      clientId
    )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(
      scope
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code_challenge=${encodeURIComponent(
      code_challenge
    )}&code_challenge_method=S256`;

  // Redirect to the authorization server
  window.location = buildUrl();
};

//////////////////////////////////////////////////////////////////////
// OAUTH REDIRECT HANDLING

// Handle the redirect back from the authorization server and
// get an access token from the token endpoint
const oauthRedirect = async () => {
  let tokenResponse = "";
  let q = parseQueryString(window.location.search.substring(1));
  // Check if the server returned an error string
  if (q.error) {
    alert(`Error returned from authorization server: ${q.error}`);
  }
  // If the server returned an authorization code, attempt to exchange it for an access token
  if (q.code) {
    // Verify state matches what we set at the beginning
    if (localStorage.getItem("pkce_state") != q.state) {
      alert("Invalid state");
    } else {
      try {
        // Exchange the authorization code for an access token
        tokenResponse = await sendPostRequest(
          localStorage.getItem("token_endpoint"),
          {
            grant_type: "authorization_code",
            code: q.code,
            client_id: localStorage.getItem("client_id"),
            redirect_uri: redirectUri,
            code_verifier: localStorage.getItem("pkce_code_verifier")
          }
        );
      } catch (err) {
        console.log(`${error.error}\n\n${error.error_description}`);
      }
    }
    // Clean these up since we don't need them anymore
    localStorage.removeItem("pkce_state");
    localStorage.removeItem("pkce_code_verifier");
    localStorage.removeItem("token_endpoint");
    localStorage.removeItem("client_id");
    return tokenResponse;
  }
  return tokenResponse;
};

export { tokenRequest, oauthRedirect };
