import { describe, it, expect } from "vitest"
import { FaradayCage } from "faraday-cage"
import { customCryptoModule } from "../../../cage-modules"

const runCage = async (script: string) => {
  const cage = await FaradayCage.create()
  return cage.runCode(script, [
    customCryptoModule({
      cryptoImpl: globalThis.crypto,
    }),
  ])
}

describe("crypto.subtle.sign/verify", () => {
  it("signs and verifies with HMAC", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'HMAC', hash: 'SHA-256' },
          true,
          ['sign', 'verify']
        )

        const data = [109, 101, 115, 115, 97, 103, 101] // "message"

        const signature = await crypto.subtle.sign('HMAC', key, data)
        if (!Array.isArray(signature) || signature.length === 0) throw new Error('signature shape mismatch')

        const isValid = await crypto.subtle.verify('HMAC', key, signature, data)
        if (isValid !== true) throw new Error('expected signature to verify')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("signs and verifies with ECDSA", async () => {
    const script = `
      (async () => {
        const keyPair = await crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign', 'verify']
        )

        const data = [116, 101, 115, 116, 32, 109, 101, 115, 115, 97, 103, 101] // "test message"

        const signature = await crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          keyPair.privateKey,
          data
        )

        const isValid = await crypto.subtle.verify(
          { name: 'ECDSA', hash: 'SHA-256' },
          keyPair.publicKey,
          signature,
          data
        )

        if (isValid !== true) throw new Error('expected ECDSA signature to verify')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("signs and verifies with RSA-PSS", async () => {
    const script = `
      (async () => {
        const keyPair = await crypto.subtle.generateKey(
          { name: 'RSA-PSS', modulusLength: 2048, publicExponent: [1, 0, 1], hash: 'SHA-256' },
          true,
          ['sign', 'verify']
        )

        const data = [114, 115, 97, 32, 116, 101, 115, 116] // "rsa test"

        const signature = await crypto.subtle.sign(
          { name: 'RSA-PSS', saltLength: 32 },
          keyPair.privateKey,
          data
        )

        const isValid = await crypto.subtle.verify(
          { name: 'RSA-PSS', saltLength: 32 },
          keyPair.publicKey,
          signature,
          data
        )

        if (isValid !== true) throw new Error('expected RSA-PSS signature to verify')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("returns false for verification with different data", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'HMAC', hash: 'SHA-256' },
          true,
          ['sign', 'verify']
        )

        const data1 = [100, 97, 116, 97, 49] // "data1"
        const data2 = [100, 97, 116, 97, 50] // "data2"

        const signature = await crypto.subtle.sign('HMAC', key, data1)
        const isValid = await crypto.subtle.verify('HMAC', key, signature, data2)
        if (isValid !== false) throw new Error('expected verification to be false with different data')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("returns false for verification with wrong key", async () => {
    const script = `
      (async () => {
        const key1 = await crypto.subtle.generateKey(
          { name: 'HMAC', hash: 'SHA-256' },
          true,
          ['sign', 'verify']
        )

        const key2 = await crypto.subtle.generateKey(
          { name: 'HMAC', hash: 'SHA-256' },
          true,
          ['sign', 'verify']
        )

        const data = [116, 101, 115, 116]
        const signature = await crypto.subtle.sign('HMAC', key1, data)
        const isValid = await crypto.subtle.verify('HMAC', key2, signature, data)

        if (isValid !== false) throw new Error('expected verification to be false with wrong key')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("handles empty data", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'HMAC', hash: 'SHA-256' },
          true,
          ['sign', 'verify']
        )

        const data = []
        const signature = await crypto.subtle.sign('HMAC', key, data)
        const isValid = await crypto.subtle.verify('HMAC', key, signature, data)
        if (isValid !== true) throw new Error('expected verification to succeed for empty data')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("signs and verifies with RSASSA-PKCS1-v1_5", async () => {
    const script = `
      (async () => {
        const keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: [1, 0, 1],
            hash: 'SHA-256'
          },
          true,
          ['sign', 'verify']
        )

        const data = [114, 115, 97, 32, 116, 101, 115, 116] // "rsa test"

        const signature = await crypto.subtle.sign(
          { name: 'RSASSA-PKCS1-v1_5' },
          keyPair.privateKey,
          data
        )

        const isValid = await crypto.subtle.verify(
          { name: 'RSASSA-PKCS1-v1_5' },
          keyPair.publicKey,
          signature,
          data
        )

        if (isValid !== true) throw new Error('expected RSASSA-PKCS1-v1_5 signature to verify')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })
})
