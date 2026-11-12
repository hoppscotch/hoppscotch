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
    let key: Uint8Array | CryptoKey

    // Use private key for RSA/ECDSA algorithms, secret for HMAC algorithms
    if (
      algorithm.startsWith("RS") ||
      algorithm.startsWith("ES") ||
      algorithm.startsWith("PS")
    ) {
      // RSA, ECDSA, or PSS algorithms - import private key
      if (!privateKey) {
        console.error("Private key is required for RSA/ECDSA/PSS algorithms")
        return null
      }

      try {
        // Import the private key for asymmetric algorithms
        if (algorithm.startsWith("RS") || algorithm.startsWith("PS")) {
          // RSA algorithms
          key = await jose.importPKCS8(privateKey, algorithm)
        } else if (algorithm.startsWith("ES")) {
          // ECDSA algorithms
          key = await jose.importPKCS8(privateKey, algorithm)
        } else {
          console.error("Unsupported algorithm:", algorithm)
          return null
        }
      } catch (keyError) {
        console.error("Failed to import private key:", keyError)
        return null
      }
    } else {
      // HMAC algorithms - use secret as Uint8Array
      if (!secret) {
        console.error("Secret is required for HMAC algorithms")
        return null
      }
      key = isSecretBase64Encoded
        ? Uint8Array.from(Buffer.from(secret, "base64"))
        : new TextEncoder().encode(secret)
    }

    const token = await new jose.SignJWT(parsedPayload)
      .setProtectedHeader({
        alg: algorithm,
        ...parsedHeaders,
      })
      .sign(key)

    return token
  } catch (e) {
    console.error("Error generating JWT token:", e)
    return null
  }
}
