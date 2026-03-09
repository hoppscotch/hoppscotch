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

describe("crypto.subtle.encrypt/decrypt", () => {
  it("encrypts and decrypts with AES-GCM", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )

        const data = [116, 101, 115, 116, 32, 100, 97, 116, 97] // "test data"
        const iv = [1,2,3,4,5,6,7,8,9,10,11,12]

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          data
        )

        if (!Array.isArray(encrypted) || encrypted.length === 0) {
          throw new Error('encrypted did not return a byte array')
        }

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          encrypted
        )

        if (JSON.stringify(decrypted) !== JSON.stringify(data)) {
          throw new Error('decrypted bytes mismatch')
        }
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("encrypts and decrypts with AES-CBC", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-CBC', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )

        const data = [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100] // "hello world"
        const iv = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-CBC', iv },
          key,
          data
        )

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-CBC', iv },
          key,
          encrypted
        )

        if (JSON.stringify(decrypted) !== JSON.stringify(data)) {
          throw new Error('decrypted bytes mismatch')
        }
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("handles empty data", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 128 },
          true,
          ['encrypt', 'decrypt']
        )

        const data = []
        const iv = [1,2,3,4,5,6,7,8,9,10,11,12]

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          data
        )

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          encrypted
        )

        if (!Array.isArray(decrypted) || decrypted.length !== 0) {
          throw new Error('expected empty decrypted array')
        }
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("rejects decrypt with invalid key usage", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt'] // No decrypt usage
        )

        const data = [116, 101, 115, 116]
        const iv = [1,2,3,4,5,6,7,8,9,10,11,12]

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          data
        )

        let rejected = false
        try {
          await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
        } catch (_) {
          rejected = true
        }
        if (!rejected) throw new Error('expected decrypt to reject')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("rejects decrypt with wrong IV (AES-GCM)", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )

        const data = [116, 101, 115, 116]
        const iv1 = [1,2,3,4,5,6,7,8,9,10,11,12]
        const iv2 = [12,11,10,9,8,7,6,5,4,3,2,1]

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv1 },
          key,
          data
        )

        let rejected = false
        try {
          await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv2 }, key, encrypted)
        } catch (_) {
          rejected = true
        }
        if (!rejected) throw new Error('expected decrypt to reject with wrong IV')
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("encrypts and decrypts with RSA-OAEP", async () => {
    const script = `
      (async () => {
        const keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: [1, 0, 1],
            hash: 'SHA-256'
          },
          true,
          ['encrypt', 'decrypt']
        )

        const data = [116, 101, 115, 116, 32, 100, 97, 116, 97] // "test data"

        const encrypted = await crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          keyPair.publicKey,
          data
        )

        if (!Array.isArray(encrypted) || encrypted.length === 0) {
          throw new Error('encrypted did not return a byte array')
        }

        const decrypted = await crypto.subtle.decrypt(
          { name: 'RSA-OAEP' },
          keyPair.privateKey,
          encrypted
        )

        if (JSON.stringify(decrypted) !== JSON.stringify(data)) {
          throw new Error('decrypted bytes mismatch')
        }
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })

  it("encrypts and decrypts with AES-CTR", async () => {
    const script = `
      (async () => {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-CTR', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )

        const data = [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100] // "hello world"
        const counter = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-CTR', counter: counter, length: 64 },
          key,
          data
        )

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-CTR', counter: counter, length: 64 },
          key,
          encrypted
        )

        if (JSON.stringify(decrypted) !== JSON.stringify(data)) {
          throw new Error('decrypted bytes mismatch')
        }
      })()
    `

    const result = await runCage(script)
    expect(result.type).toBe("ok")
  })
})
