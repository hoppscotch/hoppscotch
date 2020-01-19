const redirectUri = `${window.location.origin}/`;

//////////////////////////////////////////////////////////////////////
// GENERAL HELPER FUNCTIONS
// Make a POST request and parse the response as JSON
const sendPostRequest = async (
  url: string,
  params: {
    grant_type: string;
    code: string;
    client_id: string;
    redirect_uri: string;
    code_verifier: string;
  }
) => {
  let body = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
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
// Parse a query string into an object
const parseQueryString = (string: string) => {
  if (string === "") {
    return {};
  }
  let segments = string.split("&").map(s => s.split("="));
  let queryString: { [key: string]: string } = {};
  segments.forEach(s => (queryString[s[0]] = s[1]));
  return queryString;
};

// Get OAuth configuration from OpenID Discovery endpoint
const getTokenConfiguration = async (endpoint: string) => {
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

//////////////////////////////////////////////////////////////////////
// PKCE HELPER FUNCTIONS

// Generate a secure random string using the browser crypto functions
const generateRandomString = () => {
  const array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => `0${dec.toString(16)}`.substr(-2)).join("");
};
// Calculate the SHA256 hash of the input text.
// Returns a promise that resolves to an ArrayBuffer
const sha256 = (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
};
const hoge = (val: ArrayBuffer) => {
  return new Uint8Array(val);
};
// Base64-urlencodes the input string
const base64urlencode = (
  str: ArrayBuffer // Convert the ArrayBuffer to string using Uint8 array to conver to what btoa accepts.
) => {
  // btoa accepts chars only within ascii 0-255 and base64 encodes them.
  // Then convert the base64 encoded to base64url encoded
  //   (replace + with -, replace / with _, trim trailing =)
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(str)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// Return the base64-urlencoded sha256 hash for the PKCE challenge
const pkceChallengeFromVerifier = async (v: string) => {
  let hashed = await sha256(v);
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
}: {
  oidcDiscoveryUrl: string;
  grantType: string;
  authUrl: string;
  accessTokenUrl: string;
  clientId: string;
  scope: string;
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
  window.location.href = buildUrl();
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
        const tokenEndpoint = localStorage.getItem("token_endpoint");
        const clientId = localStorage.getItem("client_id");
        const codeVerifier = localStorage.getItem("pkce_code_verifier");
        if (
          tokenEndpoint === null ||
          clientId === null ||
          codeVerifier === null
        )
          return;
        tokenResponse = await sendPostRequest(tokenEndpoint, {
          grant_type: "authorization_code",
          code: q.code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        });
      } catch (err) {
        console.log(`${err.error}\n\n${err.error_description}`);
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
