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

  // Writes are serialized through this chain so two concurrent
  // mutations cannot race on `Store.set`. Each write captures the
  // current in-memory map at the time its turn runs, so the latest
  // state always lands on disk.
  private writeChain: Promise<void> = Promise.resolve()

  private writeCounter = 0
  private lastWriteToken: string | null = null

  async onServiceInit(): Promise<void> {
    this.hydrated = (async () => {
      const initResult = await Store.init()
      if (E.isLeft(initResult)) {
        console.error(
          "[CookieJar] Failed to initialize store:",
          initResult.left
        )
        return
      }

      await this.loadJar()
      await this.setupWatcher()
    })()
    await this.hydrated
  }

  public async whenReady(): Promise<void> {
    if (this.hydrated) {
      await this.hydrated
    }
  }

  private async loadJar(): Promise<void> {
    const loadResult = await Store.get<StoredCookieJar>(
      STORE_NAMESPACE,
      STORE_KEYS.JAR
    )

    if (E.isRight(loadResult) && loadResult.right) {
      this.cookieJar.value = this.toMap(loadResult.right.domains)
      this.pruneExpired()
    }
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
      if (stored.writeToken && stored.writeToken === this.lastWriteToken) {
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
    return v as StoredCookieJar
  }

  private toMap(domains: Record<string, Cookie[]>): Map<string, Cookie[]> {
    return new Map(Object.entries(domains))
  }

  private persistJar(): void {
    const token = `${++this.writeCounter}`
    this.lastWriteToken = token

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
      const domain = cookie.domain
      const existing = this.cookieJar.value.get(domain) ?? []

      const idx = existing.findIndex(
        (c) => c.name === cookie.name && c.path === cookie.path
      )
      if (idx === -1) {
        existing.push(cookie)
      } else {
        existing[idx] = cookie
      }

      this.cookieJar.value.set(domain, existing)
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

  // Canonicalizes a cookie domain per RFC 6265 5.1.2 and 5.2.3,
  // returns null for a domain that should not be stored. Strips a
  // leading dot the way the spec requires (the dot is wire-format
  // history and is not part of the matching algorithm), lowercases
  // the result, and rejects a single-label domain that would let
  // the cookie attach to every site under that suffix.
  private canonDomain(raw: string): string | null {
    const stripped = raw.startsWith(".") ? raw.slice(1) : raw
    const lower = stripped.toLowerCase()
    if (lower.length === 0 || !lower.includes(".")) {
      return null
    }
    return lower
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
      const domain = this.canonDomain(c.domain ?? requestHost)
      if (domain === null) {
        console.warn(
          "[CookieJar] Dropped cookie with unusable domain:",
          c.domain ?? requestHost
        )
        continue
      }
      normalized.push({
        name: c.name,
        value: c.value,
        domain,
        path: c.path ?? "/",
        httpOnly: c.httpOnly ?? false,
        secure: c.secure ?? false,
        sameSite: c.sameSite ?? "Lax",
        ...(c.expires ? { expires: new Date(c.expires).toISOString() } : {}),
      })
    }

    if (normalized.length === 0) {
      return
    }
    await this.upsertCookies(normalized)
  }

  // Replaces the entire jar, used by the manual cookie editor. Routed
  // through the service so the edit persists.
  public async replaceAll(jar: Map<string, Cookie[]>): Promise<void> {
    await this.whenReady()
    this.cookieJar.value = jar
    this.persistJar()
  }

  // Drops expired cookies from the jar. Called on load and before
  // every read so a stale cookie never gets forwarded. Persists only
  // when something was actually removed.
  public pruneExpired(): void {
    const now = Date.now()
    let changed = false

    for (const [domain, cookies] of this.cookieJar.value.entries()) {
      const live = cookies.filter(
        (c) => !c.expires || new Date(c.expires).getTime() >= now
      )
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

        const passesExpires =
          !cookie.expires || new Date(cookie.expires).getTime() >= Date.now()

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

    const cookies = this.getCookiesForURL(url)
    if (cookies.length === 0) {
      return
    }

    if (!request.headers) {
      request.headers = {}
    }
    // The request map is case-sensitive so a user-supplied `cookie`
    // or `COOKIE` would survive next to our `Cookie` and ship two
    // header lines. Strips any case-variant before setting the
    // canonical-case name.
    for (const key of Object.keys(request.headers)) {
      if (key !== "Cookie" && key.toLowerCase() === "cookie") {
        delete request.headers[key]
      }
    }
    request.headers["Cookie"] = this.serializeCookieHeader(cookies)
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
