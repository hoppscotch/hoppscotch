import * as jose from "jose"

// Generic `rsaEncryption` PKCS#8 AlgorithmIdentifier (OID 1.2.840.113549.1.1.1 + NULL
// params) - the DER encoding WebCrypto expects when importing an RSA key for use with
// an RSA-PSS (PS*) algorithm.
const RSA_ENCRYPTION_ALGORITHM_IDENTIFIER = Uint8Array.from([
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
])

const readDerLength = (bytes: Uint8Array, offset: number) => {
  const first = bytes[offset]
  if ((first & 0x80) === 0) return { length: first, bytesRead: 1 }

  const numBytes = first & 0x7f
  let length = 0
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | bytes[offset + 1 + i]
  }
  return { length, bytesRead: 1 + numBytes }
}

const encodeDerLength = (length: number): Uint8Array => {
  if (length < 0x80) return Uint8Array.from([length])

  const bytes: number[] = []
  let remaining = length
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining >>= 8
  }
  return Uint8Array.from([0x80 | bytes.length, ...bytes])
}

/**
 * Keys generated with the RSASSA-PSS-restricted key type embed the id-RSASSA-PSS
 * AlgorithmIdentifier (with explicit hash/salt parameters) in their PKCS#8 encoding.
 * Most WebCrypto implementations (including the one `jose` uses) refuse to import
 * that OID and throw `DataError: Invalid key type`, even though the underlying key
 * material is a perfectly valid PS* signing key.
 *
 * This rewrites the PrivateKeyInfo's AlgorithmIdentifier to the generic `rsaEncryption`
 * OID - which WebCrypto does accept for PS* imports - leaving the actual key material
 * (the `privateKey` OCTET STRING) untouched.
 */
const asGenericRsaPkcs8 = (pem: string): string => {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "")
  const der = Uint8Array.from(Buffer.from(base64, "base64"))

  // PrivateKeyInfo ::= SEQUENCE { version INTEGER, algorithm SEQUENCE, privateKey OCTET STRING, ... }
  let offset = 0
  if (der[offset] !== 0x30) throw new Error("Not a valid PKCS#8 key")
  const outer = readDerLength(der, offset + 1)
  offset += 1 + outer.bytesRead

  if (der[offset] !== 0x02) throw new Error("Not a valid PKCS#8 key")
  const version = readDerLength(der, offset + 1)
  const versionEnd = offset + 1 + version.bytesRead + version.length
  const versionBytes = der.slice(offset, versionEnd)
  offset = versionEnd

  if (der[offset] !== 0x30) throw new Error("Not a valid PKCS#8 key")
  const alg = readDerLength(der, offset + 1)
  offset += 1 + alg.bytesRead + alg.length

  // privateKey OCTET STRING (+ optional attributes) - copied through unchanged
  const rest = der.slice(offset)

  const newContent = new Uint8Array(
    versionBytes.length + RSA_ENCRYPTION_ALGORITHM_IDENTIFIER.length + rest.length
  )
  newContent.set(versionBytes, 0)
  newContent.set(RSA_ENCRYPTION_ALGORITHM_IDENTIFIER, versionBytes.length)
  newContent.set(
    rest,
    versionBytes.length + RSA_ENCRYPTION_ALGORITHM_IDENTIFIER.length
  )

  const lengthBytes = encodeDerLength(newContent.length)
  const newDer = new Uint8Array(1 + lengthBytes.length + newContent.length)
  newDer.set([0x30], 0)
  newDer.set(lengthBytes, 1)
  newDer.set(newContent, 1 + lengthBytes.length)

  const newBase64 = Buffer.from(newDer).toString("base64")
  const wrapped = newBase64.match(/.{1,64}/g)?.join("\n") ?? newBase64

  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`
}

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
    let cryptoKey: Uint8Array | jose.CryptoKey

    // Use private key for RSA/ECDSA algorithms, secret for HMAC algorithms
    if (
      algorithm.startsWith("RS") ||
      algorithm.startsWith("ES") ||
      algorithm.startsWith("PS")
    ) {
      // RSA, ECDSA or RSA-PSS algorithms - use private key
      if (!privateKey) {
        console.error("Private key is required for RSA/ECDSA/PSS algorithms")
        return null
      }
      // jose requires an imported CryptoKey for asymmetric algorithms - the
      // raw PEM text can't be signed with directly.
      try {
        cryptoKey = await jose.importPKCS8(privateKey, algorithm)
      } catch (importError) {
        if (!algorithm.startsWith("PS")) throw importError
        // Retry treating the key as generic RSA - see asGenericRsaPkcs8.
        cryptoKey = await jose.importPKCS8(
          asGenericRsaPkcs8(privateKey),
          algorithm
        )
      }
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
