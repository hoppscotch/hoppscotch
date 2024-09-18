import crypto from "crypto"

export interface DigestAuthParams {
  username: string
  password: string
  realm?: string
  nonce?: string
  uri: string
  method: string
  qop?: string
  nc?: string
  opaque?: string
  cnonce?: string // client nonce (optional but typically required in qop='auth')
}

export function generateDigestAuthHeader(params: DigestAuthParams): string {
  const {
    username,
    password,
    realm = "",
    nonce = "",
    uri,
    method,
    qop,
    nc = "00000001", // Nonce count (incrementing in case of multiple requests)
    opaque,
    cnonce = crypto.randomBytes(16).toString("hex"), // client nonce
  } = params

  // HA1 = MD5(username:realm:password)
  const ha1 = crypto
    .createHash("md5")
    .update(`${username}:${realm}:${password}`)
    .digest("hex")

  // HA2 = MD5(method:uri)
  const ha2 = crypto.createHash("md5").update(`${method}:${uri}`).digest("hex")

  // Response calculation
  let response
  if (qop) {
    // qop = 'auth' is typically used
    response = crypto
      .createHash("md5")
      .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      .digest("hex")
  } else {
    // Without qop
    response = crypto
      .createHash("md5")
      .update(`${ha1}:${nonce}:${ha2}`)
      .digest("hex")
  }

  // Construct the Authorization header
  const authHeader = [
    `Digest username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
    qop ? `qop=${qop}` : "",
    qop ? `nc=${nc}` : "",
    qop ? `cnonce="${cnonce}"` : "",
    opaque ? `opaque="${opaque}"` : "",
  ]
    .filter(Boolean) // Remove empty strings
    .join(", ")

  return authHeader
}

export interface DigestAuthInfo {
  realm: string
  nonce: string
  qop?: string
  opaque?: string
}

export async function fetchInitialDigestAuthInfo(
  url: string,
  method: string
): Promise<DigestAuthInfo> {
  try {
    const initialResponse = await fetch(url, {
      method: method,
    })

    // Check if the response status is 401 (which is expected in Digest Auth flow)
    if (initialResponse.status === 401) {
      const authHeader = initialResponse.headers.get("www-authenticate")

      if (authHeader) {
        const authParams = parseDigestAuthHeader(authHeader)
        if (authParams && authParams.nonce && authParams.realm) {
          return {
            realm: authParams.realm,
            nonce: authParams.nonce,
            qop: authParams.qop,
            opaque: authParams.opaque,
          }
        }
      }
      throw new Error(
        "Failed to parse authentication parameters from WWW-Authenticate header"
      )
    } else {
      throw new Error(`Unexpected response: ${initialResponse.status}`)
    }
  } catch (error) {
    console.error("Error fetching initial digest auth info:", error)
    throw error // Re-throw the error to handle it further up the chain if needed
  }
}

// Utility function to parse Digest auth header values
function parseDigestAuthHeader(
  header: string
): { [key: string]: string } | null {
  const matches = header.match(/([a-z0-9]+)="([^"]+)"/gi)
  if (!matches) return null

  const authParams: { [key: string]: string } = {}
  matches.forEach((match) => {
    const parts = match.split("=")
    authParams[parts[0]] = parts[1].replace(/"/g, "")
  })

  console.log("Parsed auth params:", authParams)

  return authParams
}
