import { describe, expect, it } from "vitest"
import type { StoreFile } from "@hoppscotch/kernel"
import {
  certEntryToInputClient,
  findMatchingCert,
  normalizeCertificateHostname,
  resolveClientCertificate,
  type ClientCertEntry,
} from "../cert-registry"
import { decryptPassphrase, encryptPassphrase } from "../cert-crypto"

const file: StoreFile = {
  include: true,
  name: "client.pem",
  size: 1,
  lastModified: 0,
  content: new Uint8Array([1]),
}

const pem = (id: string, hostname: string): ClientCertEntry => ({
  id,
  hostname,
  kind: "pem",
  cert: file,
  key: file,
})

describe("certificate host matching", () => {
  it("matches case-insensitively and prefers the most specific hostname", () => {
    const entries = [
      pem("parent", "example.com"),
      pem("specific", "api.example.com"),
    ]
    expect(findMatchingCert("API.EXAMPLE.COM", entries)?.id).toBe("specific")
    expect(findMatchingCert("v1.api.example.com", entries)?.id).toBe("specific")
    expect(findMatchingCert("www.example.com", entries)?.id).toBe("parent")
  })

  it("does not select an unrelated hostname sharing a suffix", () => {
    const entries = [pem("one", "example.com")]
    expect(findMatchingCert("notexample.com", entries)).toBeUndefined()
    expect(findMatchingCert("example.com.evil", entries)).toBeUndefined()
  })

  it("rejects URLs, ports, wildcards and invalid hostnames", () => {
    expect(normalizeCertificateHostname(" API.Example.Com. ")).toBe(
      "api.example.com"
    )
    for (const hostname of [
      "",
      "https://example.com",
      "example.com:443",
      "*.example.com",
      "example..com",
      "-example.com",
      "example.com/path",
    ]) {
      expect(normalizeCertificateHostname(hostname)).toBeUndefined()
    }
  })
})

describe("certificate conversion", () => {
  it("skips disabled PEM certificates", () => {
    expect(
      certEntryToInputClient(
        { ...pem("one", "example.com"), key: { ...file, include: false } },
        ""
      )
    ).toBeUndefined()
  })

  describe("passphrase obfuscation", () => {
    it("round-trips a passphrase and rejects corrupted ciphertext", async () => {
      const encrypted = await encryptPassphrase("client secret")
      expect(encrypted).not.toContain("client secret")
      expect(await decryptPassphrase(encrypted)).toBe("client secret")
      await expect(decryptPassphrase("invalid")).rejects.toThrow()
    })
  })

  it("does not decrypt a passphrase for an unrelated host", async () => {
    const entries: ClientCertEntry[] = [
      {
        id: "pfx",
        hostname: "example.com",
        kind: "pfx",
        data: file,
        passphrase: "invalid-ciphertext",
      },
    ]
    expect(await resolveClientCertificate("other.com", entries)).toBeUndefined()
    await expect(
      resolveClientCertificate("example.com", entries)
    ).rejects.toThrow()
  })

  it("skips decryption for an excluded PFX file", async () => {
    const entry: ClientCertEntry = {
      id: "pfx",
      hostname: "example.com",
      kind: "pfx",
      data: { ...file, include: false },
      passphrase: "invalid-ciphertext",
    }
    expect(
      await resolveClientCertificate("example.com", [entry])
    ).toBeUndefined()
  })
})
