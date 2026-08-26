/**
 * SSRF guard for the MCP share controller's tool-execution path.
 *
 * The controller fetches a URL persisted on a shared Hoppscotch collection
 * and returns the response body to the MCP client — a textbook SSRF +
 * read-back channel if the endpoint resolves to an internal address. The
 * guard rejects any target that resolves to loopback, link-local (incl.
 * cloud-metadata 169.254.169.254), private, CGNAT, or unspecified addresses,
 * and restricts the scheme to http/https.
 *
 * Enforcement is dependency-free (Node built-ins only):
 *   1. assertHostAllowed: scheme check + literal-IP/hostname denylist (sync).
 *   2. assertUrlAllowed:  the above, plus DNS resolution of a hostname and
 *      validation of every resolved address before the request is made.
 * Combined with `redirect: 'manual'` in the controller (no auto-follow), the
 * redirect-to-private-IP amplification vector is closed too. The residual gap
 * is a same-hostname DNS-rebinding TOCTOU between resolve and connect, which
 * is not mitigated here (would require a pinned-IP dispatcher).
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class SSRFBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFBlockedError';
  }
}

/** Hostnames blocked regardless of resolution (defense-in-depth for metadata). */
const BLOCKED_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata.goog',
]);

function blockMessage(target: string): string {
  return `Request blocked: endpoint resolves to a private or internal address (${target}).`;
}

/** A fully-expanded IPv6 address: exactly 8 hextets. */
type Hextets = [number, number, number, number, number, number, number, number];

function isBlockedV4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true; // malformed → fail closed
  }
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 10 || // 10.0.0.0/8 private
    a === 127 || // 127.0.0.0/8 loopback
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (incl. metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmarking
    a >= 224 // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved, 255.255.255.255 broadcast
  );
}

/**
 * Expand a (possibly compressed / v4-embedded / zone-tagged) IPv6 literal into
 * exactly 8 hextets. Returns null if it can't be parsed (caller fails closed).
 */
function expandV6(ipRaw: string): Hextets | null {
  let ip = ipRaw.toLowerCase();
  const pct = ip.indexOf('%'); // strip zone id (e.g. fe80::1%eth0)
  if (pct >= 0) ip = ip.slice(0, pct);

  // Convert a trailing dotted-IPv4 (::ffff:127.0.0.1) into two hex hextets so
  // the hex form (::ffff:7f00:1) and the dotted form normalize identically.
  const v4m = ip.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4m) {
    const o = [
      Number(v4m[2]),
      Number(v4m[3]),
      Number(v4m[4]),
      Number(v4m[5]),
    ] as [number, number, number, number];
    if (o.some((n) => n > 255)) return null;
    ip = `${v4m[1]}${((o[0] << 8) | o[1]).toString(16)}:${(
      (o[2] << 8) |
      o[3]
    ).toString(16)}`;
  }

  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : [];
  let groups: string[];
  if (halves.length === 1) {
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...new Array(fill).fill('0'), ...tail];
  }
  if (groups.length !== 8) return null;
  const hextets = groups.map((g) => (g === '' ? 0 : parseInt(g, 16)));
  if (hextets.some((h) => Number.isNaN(h) || h < 0 || h > 0xffff)) return null;
  return hextets as Hextets;
}

function isBlockedV6(ipRaw: string): boolean {
  const h = expandV6(ipRaw);
  if (!h) return true; // unparseable → fail closed
  if (h.every((x) => x === 0)) return true; // :: unspecified
  if (h.slice(0, 7).every((x) => x === 0) && h[7] === 1) return true; // ::1 loopback
  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast

  // IPv4-mapped (::ffff:a.b.c.d) and deprecated IPv4-compatible (::a.b.c.d):
  // evaluate the embedded v4 in both hex and dotted forms.
  const v4embedded =
    h[0] === 0 &&
    h[1] === 0 &&
    h[2] === 0 &&
    h[3] === 0 &&
    h[4] === 0 &&
    (h[5] === 0xffff || h[5] === 0);
  if (v4embedded) {
    const a = (h[6] >> 8) & 0xff;
    const b = h[6] & 0xff;
    const c = (h[7] >> 8) & 0xff;
    const d = h[7] & 0xff;
    return isBlockedV4(`${a}.${b}.${c}.${d}`);
  }

  // Transitional IPv6 forms that embed a routable IPv4 the packet ultimately
  // reaches. An attacker can embed a private/loopback v4, so decode it and reuse
  // the v4 denylist.
  const v4FromHextets = (hi: number, lo: number): string =>
    `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;

  // 6to4 (2002::/16): gateway IPv4 in bits 16-47 (h[1], h[2]).
  if (h[0] === 0x2002 && isBlockedV4(v4FromHextets(h[1], h[2]))) return true;

  // NAT64 well-known prefix (64:ff9b::/96): IPv4 in the last 32 bits.
  if (
    h[0] === 0x0064 &&
    h[1] === 0xff9b &&
    h[2] === 0 &&
    h[3] === 0 &&
    h[4] === 0 &&
    h[5] === 0 &&
    isBlockedV4(v4FromHextets(h[6], h[7]))
  ) {
    return true;
  }

  // Teredo (2001:0000::/32): server IPv4 in h[2],h[3]; client IPv4 in h[6],h[7]
  // bit-inverted (XOR 0xffff). Either resolving to a private v4 means an
  // internal tunnel endpoint — fail closed on both.
  if (h[0] === 0x2001 && h[1] === 0x0000) {
    const server = v4FromHextets(h[2], h[3]);
    const client = v4FromHextets(h[6] ^ 0xffff, h[7] ^ 0xffff);
    if (isBlockedV4(server) || isBlockedV4(client)) return true;
  }

  return false;
}

/** True if a literal IP string falls in a blocked range. Non-IP input → false. */
export function isBlockedAddress(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return isBlockedV4(ip);
  if (fam === 6) return isBlockedV6(ip);
  return false;
}

/** Normalize a URL host: strip IPv6 brackets and a single trailing dot. */
function canonicalHost(url: string): string {
  return new URL(url)
    .hostname.toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

/**
 * Scheme guard — only http/https may be fetched.
 */
export function assertScheme(url: string): void {
  const { protocol } = new URL(url);
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new SSRFBlockedError(
      `Unsupported URL scheme '${protocol}' — only http/https are allowed.`,
    );
  }
}

/**
 * Synchronous pre-flight: scheme + blocked metadata hostnames + literal
 * private/loopback IP targets + userinfo in URL. Does NOT resolve DNS.
 */
export function assertHostAllowed(url: string): void {
  const parsed = new URL(url);
  assertScheme(url);
  // Reject embedded userinfo (`https://attacker@private.host/`) which is a
  // common SSRF disguise and an HTTP-auth credential leak vector.
  if (parsed.username !== '' || parsed.password !== '') {
    throw new SSRFBlockedError(
      'Request blocked: URLs with embedded userinfo are not allowed.',
    );
  }
  const host = canonicalHost(url);
  if (!host) throw new SSRFBlockedError(blockMessage(host));
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new SSRFBlockedError(blockMessage(host));
  }
  if (host === 'localhost') throw new SSRFBlockedError(blockMessage(host));
  if (isIP(host) && isBlockedAddress(host)) {
    throw new SSRFBlockedError(blockMessage(host));
  }
}

/**
 * Full async guard: sync pre-flight, then (for hostnames) resolve DNS and
 * reject if ANY resolved address is private/internal. Fails CLOSED on a
 * resolution error or a malformed URL. Call immediately before fetch().
 */
export async function assertUrlAllowed(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SSRFBlockedError('Request blocked: malformed URL.');
  }
  assertHostAllowed(parsed.toString());
  const host = canonicalHost(parsed.toString());
  if (isIP(host)) return; // literal IP already validated above
  let resolved: { address: string }[];
  try {
    resolved = await lookup(host, { all: true });
  } catch {
    throw new SSRFBlockedError(
      `Request blocked: could not resolve '${host}' to verify it is not an internal address.`,
    );
  }
  for (const { address } of resolved) {
    if (isBlockedAddress(address)) {
      throw new SSRFBlockedError(blockMessage(`${host} → ${address}`));
    }
  }
}
