export async function calculateAkamaiEdgeGridHeader(params: {
  accessToken: string
  clientToken: string
  clientSecret: string
  url: string
  method: string
  body?: string // Add body parameter
  nonce?: string
  timestamp?: string
  host?: string
  headersToSign?: string
  maxBodySize?: string
}) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const timestamp = params.timestamp || Math.floor(Date.now() / 1000).toString()
  const nonce = params.nonce || crypto.randomUUID()
  const host = params.host || new URL(params.url).host

  // 1. Create signing key using clientSecret
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(params.clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signingKey = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(timestamp)
  )

  // 2. Calculate content hash if request has body
  let contentHash = ""
  if (params.body) {
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(params.body)
    )
    contentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  // 3. Create string to sign
  const data = `${params.method} ${params.url} ${host} ${timestamp} ${nonce} ${contentHash}`

  // 4. Sign the string using the signing key
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(data)
  )
  const signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  )

  // 5. Format the final authorization header
  const authorizationHeader = `EG1-HMAC-SHA256 client_token=${params.clientToken};access_token=${params.accessToken};timestamp=${timestamp};nonce=${nonce};signature=${signature}`

  return authorizationHeader
}
