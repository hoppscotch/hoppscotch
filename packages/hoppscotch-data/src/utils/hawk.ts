interface HawkOptions {
  id: string
  key: string
  algorithm: "sha256" | "sha1"
  method: string
  url: string
  includePayloadHash: boolean
  payload?: string | FormData | File | null

  // Optional parameters
  user?: string
  nonce?: string
  ext?: string
  app?: string
  dlg?: string
  timestamp?: number
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

async function getPayloadContent(
  payload: string | FormData | File | null
): Promise<string> {
  if (!payload) return ""

  if (payload instanceof FormData) {
    const pairs: string[] = []
    payload.forEach((value, key) => {
      pairs.push(`${key}=${value}`)
    })
    return pairs.join("&")
  }

  if (payload instanceof File) {
    return await payload.text()
  }

  return payload.toString()
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
    const content = await getPayloadContent(options.payload)
    const contentType = "text/plain"
    const hashBase = `hawk.1.payload\n${contentType}\n${content}\n`
    const contentHash = await sha256Hash(hashBase)
    artifacts.hash = btoa(
      String.fromCharCode.apply(null, [...new Uint8Array(contentHash)])
    )
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
