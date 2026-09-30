/**
 * AES-GCM passphrase encryption for client certificate passphrases.
 * This obfuscates passphrases in local storage, but the bundled application
 * key cannot protect against someone with access to the store and app code.
 */

const APP_SALT = "hoppscotch-cert-passphrase-v1"
const STATIC_SALT = new TextEncoder().encode("hopp-cert-static-salt-2026")

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SALT),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: STATIC_SALT,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

/**
 * Encrypts a passphrase string using AES-GCM.
 * Returns a base64-encoded string containing the IV + ciphertext.
 * Returns an empty string for empty input.
 */
export async function encryptPassphrase(plaintext: string): Promise<string> {
  if (!plaintext) return ""
  const key = await deriveKey()
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts a base64-encoded AES-GCM ciphertext produced by `encryptPassphrase`.
 * Throws on invalid ciphertext; a failed decryption must never silently
 * send a request with an incorrect certificate password.
 */
export async function decryptPassphrase(ciphertext: string): Promise<string> {
  if (!ciphertext) return ""
  const key = await deriveKey()
  const combined = new Uint8Array(
    atob(ciphertext)
      .split("")
      .map((c) => c.charCodeAt(0))
  )
  if (combined.length < 13) throw new Error("Invalid certificate passphrase")
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  )
  return new TextDecoder().decode(decrypted)
}
