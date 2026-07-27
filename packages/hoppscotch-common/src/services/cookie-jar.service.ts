import { Service } from "dioc"
import { ref } from "vue"
import { parseString as setCookieParse } from "set-cookie-parser-es"
import { Cookie } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { Store } from "~/kernel/store"

// Cookies are per-organization state, so they persist through the
// org-scoped `Store` (`~/kernel/store`), which resolves to
// `{org}.hoppscotch.store` on desktop. localStorage and `UnifiedStore`
// would merge one organization's session cookies into another because
// every org webview shares the same `app://{bundle}/` origin.
const STORE_NAMESPACE = "cookies.v1"

const STORE_KEYS = {
  JAR: "jar",
} as const

interface StoredCookieJar {
  version: string
  domains: Record<string, Cookie[]>
  lastUpdated: string
  // Stamped on every write this process does, so the cross-process
  // watcher can ignore its own echo and not overwrite concurrent
  // in-memory mutations with a stale disk snapshot.
  writeToken?: string
}

// Mirror of one entry in the kernel relay response's `cookies` array
// (`RelayResponse["cookies"]`). Typed here instead of imported so the
// service does not depend on the kernel re-exporting the type. The
// relay leaves domain/path optional and gives a `Date` expiry, the
// `@hoppscotch/data` schema needs a concrete domain, path, the
// booleans, and an ISO string expiry, so capture normalizes it.
type ResponseCookie = {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: Date
  secure?: boolean
  httpOnly?: boolean
  sameSite?: "Strict" | "Lax" | "None"
}

export class CookieJarService extends Service {
  public static readonly ID = "COOKIE_JAR_SERVICE"

  /**
   * The cookie jar that stores all relevant cookie info.
   * The keys correspond to the domain of the cookie.
   */
  public cookieJar = ref(new Map<string, Cookie[]>())

  // Resolves once `onServiceInit` has loaded the jar from disk
  // and attached the cross-process watcher. Callers that read or
  // mutate the jar in the request flow await this so a cold-start
  // request does not see an empty in-memory map and then overwrite
  // the persisted state with one cookie.
  private hydrated: Promise<void> | null = null

  // Set when `Store.init` fails. The service stays alive (the
  // request flow keeps working without cookies) but public
  // mutators no-op so a doomed `persistJar` cannot log the same
  // failure on every request.
  private initFailed = false

  // Writes are serialized through this chain so two concurrent
  // mutations cannot race on `Store.set`. Each write captures the
  // current in-memory map at the time its turn runs, so the latest
  // state always lands on disk.
  private writeChain: Promise<void> = Promise.resolve()

  // The write token prefix is fresh per service instance so two
  // processes (this org's webview and another writing the same
  // store file) cannot collide on the counter and mis-treat each
  // other's writes as self-echoes. `globalThis.crypto.randomUUID`
  // is the preferred source; a `Math.random`-based fallback keeps
  // the service constructable in environments (test runners with
  // older jsdom, some SSR setups) where the Web Crypto API is not
  // exposed. The echo guard only needs uniqueness within the
  // running process, no cryptographic property is required.
  private writePrefix = (() => {
    const uuid = globalThis.crypto?.randomUUID?.()
    if (uuid) return uuid
    return `wp-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  })()
  private writeCounter = 0

  // Ring of recent self-write tokens. A single-slot
  // `lastWriteToken` would lose the prior token whenever two writes
  // ran in the same tick, so an in-process echo for the older
  // write would be misclassified as foreign and reapply a stale
  // snapshot. The ring tolerates burst writes up to its size. The
  // cap is sized well above any realistic burst (modal save, bulk
  // import, response capture with many Set-Cookies) so a token
  // cannot age out before its disk-write's watcher echo arrives.
  // A `Set` backs the membership check so the watcher's hot path
  // is `O(1)` instead of `O(n)` against a 10k buffer, and `Set`
  // iteration order is insertion order per the spec so FIFO
  // eviction works by reading `values().next()`.
  private readonly recentWriteTokensCap = 10_000
  private recentWriteTokens = new Set<string>()

  async onServiceInit(): Promise<void> {
    this.hydrated = (async () => {
      // `Store.init` resolves an `Either` for storage-layer failures
      // but `getModule("store")` throws synchronously when the kernel
      // is not bootstrapped, which happens in vitest specs that pull
      // the service in transitively. Catching here keeps `hydrated`
      // resolved, the service alive on its in-memory jar, and
      // `initFailed` set so `persistJar` no-ops.
      try {
        const initResult = await Store.init()
        if (E.isLeft(initResult)) {
          this.initFailed = true
          console.error(
            "[CookieJar] Failed to initialize store:",
            initResult.left
          )
          return
        }

        // `loadJar` and `setupWatcher` errors are caught so `hydrated`
        // resolves either way. A rejected `hydrated` would make every
        // later `whenReady()` reject, and the interceptors' outer
        // try/catch would convert a successful HTTP response into
        // `E.left` on every request, the same failure mode the
        // `initFailed` flag exists to avoid.
        try {
          await this.loadJar()
          await this.setupWatcher()
        } catch (e) {
          this.initFailed = true
          console.error("[CookieJar] Failed during init:", e)
        }
      } catch (e) {
        this.initFailed = true
        console.error("[CookieJar] Kernel store unavailable:", e)
      }
    })()
    await this.hydrated
  }

  public async whenReady(): Promise<void> {
    if (this.hydrated) {
      await this.hydrated
    }
  }

  private async loadJar(): Promise<void> {
    const loadResult = await Store.get<unknown>(STORE_NAMESPACE, STORE_KEYS.JAR)

    // Don't degrade a read failure into "no jar yet" — that lets
    // the next persistJar overwrite the disk with `{ domains: {} }`.
    if (E.isLeft(loadResult)) {
      this.initFailed = true
      console.error(
        "[CookieJar] Failed to read persisted jar:",
        loadResult.left
      )
      return
    }
    if (!loadResult.right) {
      return
    }
    let stored: StoredCookieJar
    try {
      stored = this.parseStored(loadResult.right)
    } catch (e) {
      // Same reasoning as the read-failure path: a corrupted payload
      // must not be silently replaced with an empty jar.
      this.initFailed = true
      console.error("[CookieJar] Initial load rejected payload:", e)
      return
    }
    this.cookieJar.value = this.toMap(stored.domains)
    this.pruneExpired()
  }

  // Cross-process reload, another webview in the same org writes
  // the jar and this picks it up. The watch handler ignores echoes
  // of this process's own writes by comparing `writeToken`, and
  // rejects malformed payloads so a future schema mismatch does
  // not kill the listener.
  private async setupWatcher(): Promise<void> {
    const watcher = await Store.watch(STORE_NAMESPACE, STORE_KEYS.JAR)
    watcher.on("change", ({ value }: { value?: unknown }) => {
      if (!value) {
        return
      }
      let stored: StoredCookieJar
      try {
        stored = this.parseStored(value)
      } catch (e) {
        console.error("[CookieJar] Watcher rejected malformed payload:", e)
        return
      }
      if (stored.writeToken && this.recentWriteTokens.has(stored.writeToken)) {
        return
      }
      this.cookieJar.value = this.toMap(stored.domains)
      this.pruneExpired()
    })
  }

  private parseStored(value: unknown): StoredCookieJar {
    if (typeof value !== "object" || value === null) {
      throw new Error("payload is not an object")
    }
    const v = value as Partial<StoredCookieJar>
    if (typeof v.domains !== "object" || v.domains === null) {
      throw new Error("payload missing domains record")
    }
    // Per-domain entries must be arrays of minimally-shaped cookie
    // objects. Without the per-cookie shape check a malformed
    // cross-process write (cookie with non-string name or value)
    // would survive parseStored, slip past `isCookieNameValid`'s
    // regex when `.test` coerces undefined to the string
    // "undefined", and ship `Cookie: undefined=undefined` on the
    // wire. The schema-grade fields the rest of the service relies
    // on are name, value, and domain, so those get the typeof
    // check at the boundary.
    for (const cookies of Object.values(v.domains)) {
      if (!Array.isArray(cookies)) {
        throw new Error("payload has non-array domain entry")
      }
      for (const c of cookies) {
        if (
          typeof c !== "object" ||
          c === null ||
          typeof (c as { name?: unknown }).name !== "string" ||
          typeof (c as { value?: unknown }).value !== "string" ||
          typeof (c as { domain?: unknown }).domain !== "string" ||
          typeof (c as { path?: unknown }).path !== "string" ||
          typeof (c as { secure?: unknown }).secure !== "boolean"
        ) {
          // `path` is what `pathMatches` reads to decide whether
          // a cookie applies, `secure` is what gates the HTTPS-only
          // attach in `applyCookiesToRequest`, so a schema-drifted
          // payload that smuggled a string `"false"` past either
          // would silently mismatch path scope or attach over HTTP.
          throw new Error("payload has malformed cookie")
        }
      }
    }
    return v as StoredCookieJar
  }

  // Migration-aware hydration. A jar persisted before the RFC
  // 6265 canon work could carry `.example.com` or `Example.COM`
  // keys, and the new `domainMatches` would never line those up
  // with an incoming `example.com` request, so the cookies would
  // load into memory and never apply. The canon pass runs on
  // every load (initial and watcher) so the on-disk shape
  // upgrades on first read after the upgrade, and collisions
  // between two non-canonical keys that map to the same canonical
  // form dedupe by `(name, path)` with last-occurrence wins, so
  // `applyCookiesToRequest` never emits two cookies with the same
  // name and path in one Cookie header. Each cookie's own
  // `domain` is also canonicalized so `domainMatches` sees the
  // canonical form on both sides.
  private toMap(domains: Record<string, Cookie[]>): Map<string, Cookie[]> {
    const dedup = new Map<string, Map<string, Cookie>>()
    for (const [rawKey, cookies] of Object.entries(domains)) {
      const key = this.canonStoreDomain(rawKey)
      if (key.length === 0) {
        continue
      }
      let bucket = dedup.get(key)
      if (!bucket) {
        bucket = new Map<string, Cookie>()
        dedup.set(key, bucket)
      }
      for (const c of cookies) {
        const canonized: Cookie = {
          ...c,
          domain: this.canonStoreDomain(c.domain ?? key) || key,
        }
        // NUL separator matches the `cookieKey` pattern in
        // `RequestRunner.ts`. Empty-string path collapses to
        // `/` so an empty and a `/` cookie dedupe onto the same
        // key.
        const dedupKey = `${canonized.name}\0${canonized.path && canonized.path.length > 0 ? canonized.path : "/"}`
        bucket.set(dedupKey, canonized)
      }
    }
    const map = new Map<string, Cookie[]>()
    for (const [key, bucket] of dedup) {
      map.set(key, Array.from(bucket.values()))
    }
    return map
  }

  private persistJar(): void {
    if (this.initFailed) {
      return
    }
    const token = `${this.writePrefix}-${++this.writeCounter}`
    if (this.recentWriteTokens.size >= this.recentWriteTokensCap) {
      const oldest = this.recentWriteTokens.values().next().value
      if (oldest !== undefined) {
        this.recentWriteTokens.delete(oldest)
      }
    }
    this.recentWriteTokens.add(token)

    this.writeChain = this.writeChain
      .then(async () => {
        const stored: StoredCookieJar = {
          version: "v1",
          domains: Object.fromEntries(this.cookieJar.value),
          lastUpdated: new Date().toISOString(),
          writeToken: token,
        }

        const saveResult = await Store.set(
          STORE_NAMESPACE,
          STORE_KEYS.JAR,
          stored
        )
        if (E.isLeft(saveResult)) {
          console.error("[CookieJar] Failed to persist jar:", saveResult.left)
        }
      })
      .catch((e) => {
        console.error("[CookieJar] Persist chain error:", e)
      })
  }

  public parseSetCookieString(setCookieString: string) {
    return setCookieParse(setCookieString)
  }

  // The single merge path. Response capture and the post-request
  // script both route here so they reconcile by (domain, name, path)
  // instead of one wholesale-replacing the other. The in-memory
  // update is synchronous so callers in the request flow do not block
  // on disk, the write-through runs after.
  public async upsertCookies(cookies: Cookie[]): Promise<void> {
    await this.whenReady()
    for (const cookie of cookies) {
      // A script that returns a cookie without a domain (or with an
      // empty string) would otherwise persist under the Map key
      // `undefined` which serializes as the literal string
      // `"undefined"`, so the entry is dropped with a warning.
      if (!cookie.domain) {
        console.warn(
          `[CookieJar] Skipping cookie "${cookie.name}" with empty domain`
        )
        continue
      }
      // Domain is canonicalized (strip leading dot, lowercase) at
      // the entry boundary so script-supplied and modal-supplied
      // entries like `.Example.COM` end up as `example.com`, the
      // same form `domainMatches` compares against.
      // A canonicalized domain that contains whitespace or comes
      // out empty cannot match any request host, so the cookie is
      // skipped instead of polluting the jar with an unreachable
      // entry.
      // Path is normalized too so the merge key (`name`, `path`)
      // is comparable across response captures, script returns,
      // and modal edits. An undefined incoming path would otherwise
      // miss a stored `"/"` and produce a duplicate.
      const canonDomain = this.canonStoreDomain(cookie.domain)
      if (canonDomain.length === 0 || /\s/.test(canonDomain)) {
        console.warn(
          `[CookieJar] Skipping cookie "${cookie.name}" with invalid domain "${cookie.domain}"`
        )
        continue
      }
      // An empty-string `path` falls through `??` (only `undefined`
      // triggers it) and would otherwise produce `startsWith("")`
      // matching every request path under the domain, plus a
      // duplicate jar entry alongside the canonical `/` form. The
      // explicit length check collapses both empty and undefined
      // to `/`.
      // Scripting sandbox callers (`hopp.cookies.set(...)`) are
      // untyped at runtime, so a `name` or `value` that comes
      // through as a non-string would later crash
      // `serializeCookieHeader` and the persisted-payload
      // `parseStored` check. The cookie is skipped instead of
      // sneaking a bad shape onto disk.
      if (typeof cookie.name !== "string" || typeof cookie.value !== "string") {
        console.warn(
          `[CookieJar] Skipping cookie with non-string name or value on domain "${cookie.domain}"`
        )
        continue
      }
      const normalized: Cookie = {
        ...cookie,
        domain: canonDomain,
        path: cookie.path && cookie.path.length > 0 ? cookie.path : "/",
        // `parseStored` validates `secure` as a boolean, so a
        // script-set cookie that omitted the flag (or sent a
        // non-boolean) would crash the entire jar load on next
        // launch via the load-time shape check. Default to
        // `false` so an in-memory write survives the persist
        // round-trip.
        secure: typeof cookie.secure === "boolean" ? cookie.secure : false,
        httpOnly:
          typeof cookie.httpOnly === "boolean" ? cookie.httpOnly : false,
      }
      const existing = this.cookieJar.value.get(normalized.domain) ?? []

      const idx = existing.findIndex(
        (c) => c.name === normalized.name && c.path === normalized.path
      )
      if (idx === -1) {
        existing.push(normalized)
      } else {
        existing[idx] = normalized
      }

      this.cookieJar.value.set(normalized.domain, existing)
    }

    this.persistJar()
  }

  // Kept for existing callers, now reconciles instead of blind-pushing
  // duplicates.
  public async bulkApplyCookiesToDomain(
    cookies: Cookie[],
    domain: string
  ): Promise<void> {
    await this.upsertCookies(cookies.map((c) => ({ ...c, domain })))
  }

  // Trims, strips a leading dot the way RFC 6265 5.2.3 requires
  // (the dot is wire-format history and is not part of the
  // matching algorithm), then lowercases per RFC 6265 5.1.2. Used
  // at every boundary that writes into the jar so the stored key
  // always matches `domainMatches`'s lowercase comparison. Public
  // so the post-request script delta in `RequestRunner` and the
  // modal save in `AllModal` can build matching keys without
  // re-implementing the same normalization in three places.
  public canonStoreDomain(raw: string): string {
    const trimmed = raw.trim()
    const stripped = trimmed.startsWith(".") ? trimmed.slice(1) : trimmed
    return stripped.toLowerCase()
  }

  // Canonicalizes a cookie domain that came from a Set-Cookie
  // `Domain` attribute. Calls `canonStoreDomain` then rejects a
  // single-label domain that would let the cookie attach to every
  // site under that suffix. Returns null for a domain that should
  // not be stored.
  private canonAttrDomain(raw: string): string | null {
    const lower = this.canonStoreDomain(raw)
    if (lower.length === 0 || !lower.includes(".")) {
      return null
    }
    return lower
  }

  // Canonicalizes the host used for a host-only cookie, where the
  // response had no `Domain` attribute so the request host is the
  // entire domain. The single-label rule does not apply here, the
  // host is the literal endpoint the user spoke to. `localhost` and
  // other single-label internal hostnames stay valid.
  private canonHostOnly(host: string): string {
    return host.toLowerCase()
  }

  // RFC 6265 5.1.4 default-path. A response that omits the `Path`
  // attribute defaults to the directory of the request URI path,
  // i.e. the substring up to but not including the rightmost `/`.
  // A path with no `/` or only the leading `/` defaults to `/`.
  private defaultPath(uriPath: string): string {
    if (uriPath.length === 0 || uriPath[0] !== "/") {
      return "/"
    }
    const last = uriPath.lastIndexOf("/")
    if (last === 0) {
      return "/"
    }
    return uriPath.slice(0, last)
  }

  // Normalizes the kernel relay response cookies into the
  // `@hoppscotch/data` shape and merges them. Domain falls back to the
  // request host (host-only cookie), path to "/", the flags default
  // off, and SameSite to "Lax" matching the browser default.
  public async extractFromResponse(
    cookies: ResponseCookie[] | undefined,
    requestURL: URL
  ): Promise<void> {
    if (!cookies || cookies.length === 0) {
      return
    }

    const requestHost = requestURL.hostname.toLowerCase()
    const normalized: Cookie[] = []
    for (const c of cookies) {
      let domain: string | null
      if (c.domain) {
        domain = this.canonAttrDomain(c.domain)
      } else {
        domain = this.canonHostOnly(requestHost)
      }
      if (domain === null) {
        console.warn(
          "[CookieJar] Dropped cookie with unusable domain:",
          c.domain
        )
        continue
      }
      // `new Date(c.expires).toISOString()` throws RangeError on an
      // Invalid Date (kernel passes a Date built from an unparseable
      // Expires attribute). The expires field is dropped instead so
      // the cookie still captures, treated as a session cookie.
      let expires: string | undefined
      if (c.expires) {
        const t = new Date(c.expires).getTime()
        if (Number.isFinite(t)) {
          expires = new Date(t).toISOString()
        }
      }
      // RFC 6265 5.1.4 requires the Path attribute to begin with
      // `/`. A response that sends `Path=foo` (or anything else
      // not starting with the separator) falls back to the
      // default-path so the cookie is stored under a key the
      // request matcher can actually hit.
      const explicitPath =
        c.path && c.path.length > 0 && c.path.startsWith("/") ? c.path : null
      normalized.push({
        name: c.name,
        value: c.value,
        domain,
        path: explicitPath ?? this.defaultPath(requestURL.pathname),
        httpOnly: c.httpOnly ?? false,
        secure: c.secure ?? false,
        sameSite: c.sameSite ?? "Lax",
        ...(expires !== undefined ? { expires } : {}),
      })
    }

    if (normalized.length === 0) {
      return
    }
    await this.upsertCookies(normalized)
  }

  // Replaces the entire jar. The argument is defensive-copied so a
  // caller that keeps the reference and continues mutating its own
  // Map cannot inadvertently mutate the live jar after the swap.
  public async replaceAll(jar: Map<string, Cookie[]>): Promise<void> {
    await this.whenReady()
    const copy = new Map<string, Cookie[]>()
    for (const [domain, cookies] of jar.entries()) {
      copy.set(
        domain,
        cookies.map((c) => ({ ...c }))
      )
    }
    this.cookieJar.value = copy
    this.persistJar()
  }

  // Deletes the named cookies from the jar, matching by
  // `(domain, name, path)`. The post-request script path computes
  // a set difference between its pre-script view and the script's
  // returned `updatedCookies` and calls this for the entries that
  // disappeared, restoring delete-by-omission semantics without
  // the wholesale-replace behaviour that clobbered concurrent
  // response captures.
  public async deleteCookies(
    targets: Array<{ domain: string; name: string; path?: string }>
  ): Promise<void> {
    await this.whenReady()
    let changed = false
    for (const target of targets) {
      // Domain is canonicalized at the lookup boundary so a target
      // built from raw user input or a script-supplied value (e.g.
      // ".Example.COM") finds the canonical bucket the jar
      // actually stored.
      const domain = this.canonStoreDomain(target.domain)
      const existing = this.cookieJar.value.get(domain)
      if (!existing) {
        continue
      }
      const path = target.path && target.path.length > 0 ? target.path : "/"
      const next = existing.filter(
        (c) => !(c.name === target.name && c.path === path)
      )
      if (next.length === existing.length) {
        continue
      }
      changed = true
      if (next.length === 0) {
        this.cookieJar.value.delete(domain)
      } else {
        this.cookieJar.value.set(domain, next)
      }
    }
    if (changed) {
      this.persistJar()
    }
  }

  // Drops expired cookies from the jar. Called on load and before
  // every read so a stale cookie never gets forwarded. Persists only
  // when something was actually removed. A cookie whose `expires`
  // is unparseable (the kernel handed back an Invalid Date that
  // serialized strangely, or a cross-process write stored something
  // non-ISO) is treated as a session cookie instead of as expired,
  // so a malformed payload cannot silently evaporate jar entries.
  public pruneExpired(): void {
    const now = Date.now()
    let changed = false

    for (const [domain, cookies] of this.cookieJar.value.entries()) {
      const live = cookies.filter((c) => {
        if (!c.expires) return true
        const t = new Date(c.expires).getTime()
        return !Number.isFinite(t) || t >= now
      })
      if (live.length === cookies.length) {
        continue
      }
      changed = true
      if (live.length === 0) {
        this.cookieJar.value.delete(domain)
      } else {
        this.cookieJar.value.set(domain, live)
      }
    }

    if (changed) {
      this.persistJar()
    }
  }

  // RFC 6265 5.1.3 domain matching. The host matches a stored domain
  // when it is the domain or a subdomain of it. The old code used a
  // bare `hostname.endsWith(domain)`, which let `evil-example.com`
  // match `example.com` because there was no label boundary. Hosts
  // are lowercased here, stored domains were lowercased on capture,
  // so the comparison is case-insensitive per RFC 6265 5.1.2.
  private domainMatches(host: string, domain: string): boolean {
    const h = host.toLowerCase()
    return h === domain || h.endsWith(`.${domain}`)
  }

  // RFC 6265 5.1.4 path matching. The request path matches the cookie
  // path when they are equal, or the cookie path is a prefix that ends
  // at a "/" boundary.
  private pathMatches(reqPath: string, cookiePath: string): boolean {
    if (reqPath === cookiePath) {
      return true
    }
    if (!reqPath.startsWith(cookiePath)) {
      return false
    }
    return cookiePath.endsWith("/") || reqPath[cookiePath.length] === "/"
  }

  public getCookiesForURL(url: URL): Cookie[] {
    this.pruneExpired()

    const result: Cookie[] = []

    for (const [domain, cookies] of this.cookieJar.value.entries()) {
      if (!this.domainMatches(url.hostname, domain)) {
        continue
      }

      for (const cookie of cookies) {
        const passesPath = this.pathMatches(url.pathname, cookie.path || "/")

        const passesExpires = (() => {
          if (!cookie.expires) return true
          const t = new Date(cookie.expires).getTime()
          return !Number.isFinite(t) || t >= Date.now()
        })()

        const passesSecure = !cookie.secure || url.protocol === "https:"

        if (passesPath && passesExpires && passesSecure) {
          result.push(cookie)
        }
      }
    }

    // RFC 6265 5.4 step 2, cookies with a longer path go first so a
    // server that reads the first matching cookie picks the more
    // specific value over an inherited one. Stable sort because a tie
    // on path length keeps capture order.
    result.sort((a, b) => (b.path?.length ?? 1) - (a.path?.length ?? 1))

    return result
  }

  // RFC 6265 4.1.1 cookie-name is an RFC 7230 `token`, alphanumeric
  // plus `!#$%&'*+-.^_` `` ` ``|~. Anything outside that set
  // (whitespace, `=`, `;`, control chars, etc.) would either
  // corrupt the header or be ambiguous on parse, so the cookie is
  // skipped at serialization time.
  private isCookieNameValid(name: string): boolean {
    return name.length > 0 && /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)
  }

  // RFC 6265 5.4 cookie-value disallows CTL, whitespace, comma,
  // semicolon, double-quote, and backslash. A value with any of
  // these would corrupt the header on the wire, so the cookie is
  // skipped and a warning logged. Most jars hit this only for
  // server-set values that arrived already malformed; the matched
  // cookie still exists in the in-memory jar for inspection.
  private isCookieValueValid(value: string): boolean {
    return !/[\x00-\x1f\x7f\s,;"\\]/.test(value)
  }

  // RFC 6265 5.4 Cookie header serialization, `name=value` pairs
  // joined by "; ".
  public serializeCookieHeader(cookies: Cookie[]): string {
    const parts: string[] = []
    for (const c of cookies) {
      if (!this.isCookieNameValid(c.name)) {
        console.warn(
          `[CookieJar] Skipping cookie with invalid name "${c.name}"`
        )
        continue
      }
      if (!this.isCookieValueValid(c.value)) {
        console.warn(
          `[CookieJar] Skipping cookie "${c.name}" with invalid value`
        )
        continue
      }
      parts.push(`${c.name}=${c.value}`)
    }
    return parts.join("; ")
  }

  // Returns the parsed URL, or `null` if `raw` is unparseable. A
  // request reaches the interceptor with an unresolved environment
  // template, a relative URL, or a typo-ed scheme often enough that
  // throwing inside the cookie path would surface as a request
  // failure when the rest of the pipeline could have produced a
  // clearer error.
  private parseRequestURL(raw: string): URL | null {
    try {
      return new URL(raw)
    } catch {
      return null
    }
  }

  // The one shared send path. Native, agent, and proxy all call this
  // so a request gets the same Cookie header regardless of which
  // interceptor runs it, replacing the three slightly different inline
  // blocks they used to carry.
  public async applyCookiesToRequest(request: {
    url?: string
    headers?: Record<string, string>
  }): Promise<void> {
    await this.whenReady()
    if (!request.url) {
      return
    }
    const url = this.parseRequestURL(request.url)
    if (url === null) {
      return
    }

    // Empty or whitespace-only `Cookie` placeholders are stripped
    // unconditionally so a leftover row from a request template
    // never reaches the wire, regardless of whether the jar ends
    // up contributing cookies on this request.
    if (request.headers) {
      for (const key of Object.keys(request.headers)) {
        if (
          key.toLowerCase() === "cookie" &&
          (request.headers[key] === undefined ||
            request.headers[key].trim() === "")
        ) {
          delete request.headers[key]
        }
      }
    }
    // A user who set a non-empty `Cookie` header through the
    // request panel (any case-variant) is asserting deliberate
    // intent for this request, so the jar yields and the user's
    // header is preserved as written. The jar still updates from
    // response capture and the manager remains the place to
    // inspect or edit it.
    if (request.headers) {
      for (const key of Object.keys(request.headers)) {
        if (key.toLowerCase() === "cookie") {
          return
        }
      }
    }

    const cookies = this.getCookiesForURL(url)
    if (cookies.length === 0) {
      return
    }
    // `serializeCookieHeader` may drop every cookie if the values
    // fail validation, returning an empty string. The Cookie header
    // is set only when the serialized form has content, so a request
    // never goes out with `Cookie: ""` which some servers reject.
    const serialized = this.serializeCookieHeader(cookies)
    if (serialized.length === 0) {
      return
    }

    if (!request.headers) {
      request.headers = {}
    }
    // The user may have left a case-variant `cookie` / `COOKIE`
    // key with an empty value (treated as absent above and not
    // suppressing the jar). Removing every case-variant before
    // writing the canonical `Cookie` ensures the request goes out
    // with one header line, never two.
    for (const key of Object.keys(request.headers)) {
      if (key !== "Cookie" && key.toLowerCase() === "cookie") {
        delete request.headers[key]
      }
    }
    request.headers["Cookie"] = serialized
  }

  // The one shared receive path. Captures structured cookies the
  // relay parsed out of the response into the jar.
  public async captureResponseCookies(
    response: { cookies?: ResponseCookie[] },
    requestUrl: string | undefined
  ): Promise<void> {
    if (!requestUrl) {
      return
    }
    const url = this.parseRequestURL(requestUrl)
    if (url === null) {
      return
    }
    await this.extractFromResponse(response.cookies, url)
  }
}
