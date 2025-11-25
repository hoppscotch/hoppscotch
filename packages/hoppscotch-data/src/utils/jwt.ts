import * as jose from "jose"

export interface JWTTokenParams {
  algorithm: string
  secret: string
  privateKey: string
  payload: string
  jwtHeaders: string
  isSecretBase64Encoded: boolean
}

/**
 * Generates a JWT token using the provided parameters
 * @param params JWT token generation parameters with pre-parsed values
 * @returns Promise<string | null> - The generated JWT token or null if generation fails
 */
export async function generateJWTToken(
  params: JWTTokenParams
): Promise<string | null> {
  const {
    algorithm,
    secret,
    privateKey,
    payload,
    jwtHeaders,
    isSecretBase64Encoded,
  } = params

  // Parse the payload and headers from JSON strings
  let parsedPayload = {}
  let parsedHeaders = {}

  // Safely parse payload JSON
  try {
    const payloadString = payload?.trim() || "{}"
    if (payloadString === "") {
      parsedPayload = {}
    } else {
      parsedPayload = JSON.parse(payloadString)
    }
  } catch (e) {
    console.error("Failed to parse JWT payload JSON:", e)
    console.error("Payload value:", payload)
    return null
  }

  // Safely parse headers JSON
  try {
    const headersString = jwtHeaders?.trim() || "{}"
    if (headersString === "") {
      parsedHeaders = {}
    } else {
      parsedHeaders = JSON.parse(headersString)
    }
  } catch (e) {
    console.error("Failed to parse JWT headers JSON:", e)
    console.error("Headers value:", jwtHeaders)
    return null
  }

  try {
    let cryptoKey: Uint8Array

    // Use private key for RSA/ECDSA algorithms, secret for HMAC algorithms
    if (
      algorithm.startsWith("RS") ||
      algorithm.startsWith("ES") ||
      algorithm.startsWith("PS")
    ) {
      // RSA or ECDSA algorithms - use private key
      if (!privateKey) {
        console.error("Private key is required for RSA/ECDSA algorithms")
        return null
      }
      cryptoKey = new TextEncoder().encode(privateKey)
    } else {
      // HMAC algorithms - use secret
      if (!secret) {
        console.error("Secret is required for HMAC algorithms")
        return null
      }
      cryptoKey = isSecretBase64Encoded
        ? Uint8Array.from(Buffer.from(secret, "base64"))
        : new TextEncoder().encode(secret)
    }

    const token = await new jose.SignJWT(parsedPayload)
      .setProtectedHeader({
        alg: algorithm,
        ...parsedHeaders,
      })
      .sign(cryptoKey)

    return token
  } catch (e) {
    console.error("Error generating JWT token:", e)
    return null
  }
}
