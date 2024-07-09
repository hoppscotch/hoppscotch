async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

async function hmacSHA256(key: CryptoKey, message: string) {
  const encoder = new TextEncoder()
  const msgBuffer = encoder.encode(message)
  const sigBuffer = await crypto.subtle.sign("HMAC", key, msgBuffer)
  const hashArray = Array.from(new Uint8Array(sigBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
) {
  const encoder = new TextEncoder()
  const kDate = await crypto.subtle.importKey(
    "raw",
    encoder.encode("AWS4" + key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const kRegion = await crypto.subtle.importKey(
    "raw",
    encoder.encode(await hmacSHA256(kDate, dateStamp)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const kService = await crypto.subtle.importKey(
    "raw",
    encoder.encode(await hmacSHA256(kRegion, regionName)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const kSigning = await crypto.subtle.importKey(
    "raw",
    encoder.encode(await hmacSHA256(kService, serviceName)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return kSigning
}

interface AWSSignature {
  "X-Amz-Algorithm": string
  "X-Amz-Credential": string
  "X-Amz-Date": string
  "X-Amz-Expires": string
  "X-Amz-Signature": string
  "X-Amz-SignedHeaders": string
}

export async function generateAWSSignature(
  accessKey: string,
  secretKey: string,
  region = "us-east-1",
  serviceName: string,
  serviceToken: string | undefined
): Promise<AWSSignature> {
  console.log("Generating AWS Signature", accessKey, serviceToken)
  const method = "GET"
  const canonicalUri = "/"
  const host = `${serviceName}.${region}.amazonaws.com`
  const queryParams = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=`

  const currentDate = new Date()
  const amzDate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.substr(0, 8)
  const credentialScope = `${dateStamp}/${region}/${serviceName}/aws4_request`

  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = "host"
  const payloadHash = await sha256("")

  const canonicalRequest = `${method}\n${canonicalUri}\n${queryParams}${accessKey}%2F${credentialScope}&X-Amz-Date=${amzDate}&X-Amz-Expires=86400\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(
    canonicalRequest
  )}`

  const signingKey = await getSignatureKey(
    secretKey,
    dateStamp,
    region,
    serviceName
  )
  const signature = await hmacSHA256(signingKey, stringToSign)

  return {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": encodeURIComponent(`${accessKey}/${credentialScope}`),
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "86400",
    "X-Amz-Signature": signature,
    "X-Amz-SignedHeaders": signedHeaders,
  }
}
