import { HoppRESTRequest } from "../rest"

interface HawkOptions {
  id: string
  key: string
  algorithm: "sha256" | "sha1"
  method: string
  url: string

  // Optional parameters
  user?: string
  nonce?: string
  ext?: string
  app?: string
  dlg?: string
  timestamp?: number

  // Payload options
  includePayloadHash: boolean
  payload?: string | FormData | File | null | Blob
  contentType?: HoppRESTRequest["body"]["contentType"]
}

async function generateNonce(length: number = 6): Promise<string> {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, length)
}

function sha256Hash(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  return crypto.subtle.digest("SHA-256", dataBuffer)
}

function sha1Hash(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  return crypto.subtle.digest("SHA-1", dataBuffer)
}

async function hashData(
  data: string,
  algorithm: "sha256" | "sha1"
): Promise<ArrayBuffer> {
  return algorithm === "sha256" ? sha256Hash(data) : sha1Hash(data)
}

async function hmacSign(
  key: string,
  message: string,
  algorithm: "sha256" | "sha1"
): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)

  const cryptoAlgo = algorithm === "sha256" ? "SHA-256" : "SHA-1"

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "HMAC",
      hash: { name: cryptoAlgo },
    },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData)

  // Convert to base64 string
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(signature)]))
}

/**
 * Normalize line endings to '\n' to ensure consistent hash generation
 */
function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

/**
 * Get the content of a payload for hash calculation
 * This function needs to exactly match the server's payload hash calculation
 */
async function getPayloadContent(
  payload: string | FormData | File | Blob | null,
  contentType: string
): Promise<string> {
  if (!payload) return ""

  // For form data
  if (payload instanceof FormData) {
    if (contentType === "multipart/form-data") {
      // For multipart form data, we need to extract the parts
      const parts: string[] = []
      payload.forEach((value, key) => {
        if (typeof value === "string") {
          parts.push(`${key}=${value}`)
        } else {
          // For file parts, use the file name
          parts.push(`${key}=${value instanceof File ? value.name : "blob"}`)
        }
      })
      return normalizeLineEndings(parts.join("&"))
    } else {
      // For url-encoded form data
      const pairs: string[] = []
      payload.forEach((value, key) => {
        if (typeof value === "string") {
          pairs.push(`${key}=${encodeURIComponent(value)}`)
        }
      })
      return normalizeLineEndings(pairs.join("&"))
    }
  }

  // For blob/file types
  if (payload instanceof Blob) {
    try {
      const text = await payload.text()
      return normalizeLineEndings(text)
    } catch (e) {
      console.error("Failed to read blob content", e)
      return ""
    }
  }

  // Handle JSON specifically
  if (contentType.includes("application/json") && typeof payload === "string") {
    try {
      // Parse and re-stringify to ensure consistent formatting
      const jsonObj = JSON.parse(payload)
      return normalizeLineEndings(JSON.stringify(jsonObj))
    } catch (e) {
      // If not valid JSON, use as-is
      return normalizeLineEndings(payload.toString())
    }
  }

  // Default: convert to string and normalize line endings
  return normalizeLineEndings(payload.toString())
}

export async function calculateHawkHeader(
  options: HawkOptions
): Promise<string> {
  const timestamp =
    options.timestamp !== undefined && options.timestamp !== null
      ? options.timestamp
      : Math.floor(Date.now() / 1000)

  // Use provided nonce or generate a new one
  const nonce =
    options.nonce && options.nonce !== ""
      ? options.nonce
      : await generateNonce()

  // Parse URL
  const urlObj = new URL(options.url)
  const host = urlObj.hostname
  const port = urlObj.port || (urlObj.protocol === "https:" ? "443" : "80")
  const path = urlObj.pathname + urlObj.search

  // Create the normalized string
  const artifacts = {
    ts: timestamp,
    nonce: nonce,
    method: options.method.toUpperCase(),
    resource: path,
    host: host,
    port: port,
    hash: "",
    ext: options.ext || "",
  }

  // Calculate payload hash if needed
  if (options.includePayloadHash && options.payload) {
    try {
      const contentType = options.contentType || "text/plain"
      const content = await getPayloadContent(options.payload, contentType)

      // Create the normalized payload string as per HAWK spec
      const normalizedPayload = `hawk.1.payload\n${contentType}\n${content}\n`

      // Hash the normalized payload
      const contentHash = await hashData(normalizedPayload, options.algorithm)

      // Convert hash to base64
      artifacts.hash = btoa(
        String.fromCharCode.apply(null, [...new Uint8Array(contentHash)])
      )
    } catch (error) {
      console.error("Error calculating payload hash:", error)
    }
  }

  // Construct the string to sign according to Hawk spec
  const macBaseString = `hawk.1.header\n${artifacts.ts}\n${artifacts.nonce}\n${artifacts.method}\n${artifacts.resource}\n${artifacts.host}\n${artifacts.port}\n${artifacts.hash}\n${artifacts.ext}\n`

  // Calculate MAC
  const mac = await hmacSign(options.key, macBaseString, options.algorithm)

  // Construct the Hawk header
  const header = [
    `Hawk id="${options.id}"`,
    `ts="${artifacts.ts}"`,
    `nonce="${artifacts.nonce}"`,
    `mac="${mac}"`,
  ]

  // Add optional parameters if present
  if (options.ext && options.ext !== "") header.push(`ext="${options.ext}"`)
  if (options.app && options.app !== "") header.push(`app="${options.app}"`)
  if (options.dlg && options.dlg !== "") header.push(`dlg="${options.dlg}"`)
  if (artifacts.hash !== "") header.push(`hash="${artifacts.hash}"`)

  return header.join(", ")
}
