/**
 * Multi-Certificate Registry — types and helpers.
 *
 * Each `ClientCertEntry` maps one hostname pattern to one client certificate.
 * The registry lives at the store level (not inside per-domain settings) so
 * that a single cert can cover multiple sub-paths / ports on the same host.
 *
 * Matching rules (per Jira story):
 *  - Exact match:   host === entry.hostname
 *  - Suffix match:  host ends with `.${entry.hostname}`
 *  - Precedence:    longest hostname wins (most specific)
 *  - No match:      request proceeds without a client certificate
 */

import type { StoreFile } from "@hoppscotch/kernel"
import { decryptPassphrase } from "./cert-crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClientCertPEM = {
  kind: "pem"
  cert: StoreFile
  key: StoreFile
}

export type ClientCertPFX = {
  kind: "pfx"
  data: StoreFile
  passphrase?: string // AES-GCM encrypted — never plain text at rest
}

export type ClientCertEntry = {
  /** Unique identifier for edit / delete operations */
  id: string
  /** Hostname or hostname pattern this cert applies to, e.g. "api.example.com" */
  hostname: string
} & (ClientCertPEM | ClientCertPFX)

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Returns the best matching cert entry for the given `host`, or `undefined`
 * if no entry matches.  "Best" means the longest (most specific) hostname.
 */
export function normalizeCertificateHostname(
  input: string
): string | undefined {
  const hostname = input.trim().toLowerCase().replace(/\.$/, "")
  if (
    hostname.length > 253 ||
    !hostname
      .split(".")
      .every(
        (label) =>
          label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
      )
  )
    return undefined
  return hostname
}

export function findMatchingCert(
  host: string,
  certs: readonly ClientCertEntry[]
): ClientCertEntry | undefined {
  const hostname = host.toLowerCase().replace(/\.$/, "")
  let best: ClientCertEntry | undefined
  for (const entry of certs) {
    const pattern = entry.hostname.toLowerCase()
    if (
      (hostname === pattern || hostname.endsWith(`.${pattern}`)) &&
      (!best || pattern.length > best.hostname.length)
    )
      best = entry
  }
  return best
}

// ---------------------------------------------------------------------------
// Conversion helpers (to RelayRequest.security.certificates.client shape)
// ---------------------------------------------------------------------------

/**
 * Converts a `ClientCertEntry` (plus its already-decrypted passphrase for PFX)
 * to the shape expected by `InputDomainSetting.security.certificates.client`.
 * Returns `undefined` when the entry is incomplete and should be skipped.
 */
export function certEntryToInputClient(
  entry: ClientCertEntry,
  decryptedPassphrase: string
):
  | { kind: "pem"; cert: StoreFile; key: StoreFile }
  | { kind: "pfx"; data: StoreFile; password: string }
  | undefined {
  if (entry.kind === "pem") {
    if (!entry.cert?.include || !entry.key?.include) return undefined
    return { kind: "pem", cert: entry.cert, key: entry.key }
  }
  if (!entry.data?.include) return undefined
  return { kind: "pfx", data: entry.data, password: decryptedPassphrase }
}

export async function resolveClientCertificate(
  hostname: string,
  entries: readonly ClientCertEntry[]
) {
  const entry = findMatchingCert(hostname, entries)
  if (!entry) return undefined
  if (entry.kind === "pfx" && !entry.data?.include) return undefined
  const passphrase =
    entry.kind === "pfx" && entry.passphrase
      ? await decryptPassphrase(entry.passphrase)
      : ""
  return certEntryToInputClient(entry, passphrase)
}
