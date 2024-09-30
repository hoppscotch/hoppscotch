import { md5 } from "js-md5"
import * as E from "fp-ts/Either"

import { getService } from "~/modules/dioc"
import { InterceptorService } from "~/services/interceptor.service"

export interface DigestAuthParams {
  username: string
  password: string
  realm: string
  nonce: string
  uri: string
  method: string
  algorithm: string
  qop: string
  nc?: string
  opaque?: string
  cnonce?: string // client nonce (optional but typically required in qop='auth')
}

// Function to generate Digest Auth Header
export async function generateDigestAuthHeader(params: DigestAuthParams) {
  const {
    username,
    password,
    realm,
    nonce,
    uri,
    method,
    algorithm = "MD5",
    qop,
    nc = "00000001",
    opaque,
    cnonce,
  } = params

  // Generate client nonce if not provided
  const generatedCnonce = cnonce || md5(`${Math.random()}`)

  // Step 1: Hash the username, realm, and password
  const ha1 = md5(`${username}:${realm}:${password}`)

  // Step 2: Hash the method and URI
  const ha2 = md5(`${method}:${uri}`)

  // Step 3: Compute the response hash
  const response = md5(`${ha1}:${nonce}:${nc}:${generatedCnonce}:${qop}:${ha2}`)

  // Build the Digest header
  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", algorithm="${algorithm}", response="${response}", qop=${qop}, nc=${nc}, cnonce="${generatedCnonce}"`

  if (opaque) {
    authHeader += `, opaque="${opaque}"`
  }

  return authHeader
}

export interface DigestAuthInfo {
  realm: string
  nonce: string
  qop: string
  opaque?: string
  algorithm: string
}

export async function fetchInitialDigestAuthInfo(
  url: string,
  method: string
): Promise<DigestAuthInfo> {
  try {
    const service = getService(InterceptorService)
    const initialResponse = await service.runRequest({
      url,
      method,
    }).response

    if (E.isLeft(initialResponse))
      throw new Error(`Unexpected response: ${initialResponse.left}`)

    // Check if the response status is 401 (which is expected in Digest Auth flow)
    if (initialResponse.right.status === 401) {
      const authHeader = initialResponse.right.headers["www-authenticate"]

      if (authHeader) {
        const authParams = parseDigestAuthHeader(authHeader)
        if (
          authParams &&
          authParams.realm &&
          authParams.nonce &&
          authParams.qop
        ) {
          return {
            realm: authParams.realm,
            nonce: authParams.nonce,
            qop: authParams.qop,
            opaque: authParams.opaque,
            algorithm: authParams.algorithm,
          }
        }
      }
      throw new Error(
        "Failed to parse authentication parameters from WWW-Authenticate header"
      )
    } else {
      throw new Error(`Unexpected response: ${initialResponse.right.status}`)
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

  return authParams
}
