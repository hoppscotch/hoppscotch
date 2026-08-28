const SHA_256_INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f,
  0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

const SHA_256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

export type PKCECodeVerifierMethod = "plain" | "S256"

const rightRotate = (value: number, bits: number) =>
  (value >>> bits) | (value << (32 - bits))

const sha256Fallback = (data: Uint8Array) => {
  const bitLength = data.length * 8
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLength)

  padded.set(data)
  padded[data.length] = 0x80

  const paddedView = new DataView(padded.buffer)
  paddedView.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000))
  paddedView.setUint32(paddedLength - 4, bitLength >>> 0)

  const hash = [...SHA_256_INITIAL_HASH]
  const words = new Uint32Array(64)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      words[i] = paddedView.getUint32(offset + i * 4)
    }

    for (let i = 16; i < 64; i++) {
      const s0 =
        rightRotate(words[i - 15], 7) ^
        rightRotate(words[i - 15], 18) ^
        (words[i - 15] >>> 3)
      const s1 =
        rightRotate(words[i - 2], 17) ^
        rightRotate(words[i - 2], 19) ^
        (words[i - 2] >>> 10)

      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, h] = hash

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + ch + SHA_256_K[i] + words[i]) >>> 0
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    hash[0] = (hash[0] + a) >>> 0
    hash[1] = (hash[1] + b) >>> 0
    hash[2] = (hash[2] + c) >>> 0
    hash[3] = (hash[3] + d) >>> 0
    hash[4] = (hash[4] + e) >>> 0
    hash[5] = (hash[5] + f) >>> 0
    hash[6] = (hash[6] + g) >>> 0
    hash[7] = (hash[7] + h) >>> 0
  }

  const digest = new ArrayBuffer(32)
  const digestView = new DataView(digest)

  hash.forEach((value, index) => {
    digestView.setUint32(index * 4, value)
  })

  return digest
}

export const sha256 = (data: Uint8Array) => {
  const subtle = globalThis.crypto?.subtle

  if (subtle?.digest) {
    return subtle.digest("SHA-256", data)
  }

  return Promise.resolve(sha256Fallback(data))
}

export const encodeArrayBufferAsUrlEncodedBase64 = (buffer: ArrayBuffer) => {
  const hashArray = Array.from(new Uint8Array(buffer))
  const hashBase64URL = btoa(String.fromCharCode(...hashArray))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

  return hashBase64URL
}

export const createPKCECodeChallenge = async (
  codeVerifier: string,
  strategy: PKCECodeVerifierMethod
) => {
  if (strategy === "plain") {
    return codeVerifier
  }

  const data = new TextEncoder().encode(codeVerifier)
  const buffer = await sha256(data)

  return encodeArrayBufferAsUrlEncodedBase64(buffer)
}
