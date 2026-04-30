import { Service } from "dioc"
import { ref, watch } from "vue"
import { parseString as setCookieParse } from "set-cookie-parser-es"
import { Cookie } from "@hoppscotch/data"
import {
  cookieHeaderForURL,
  deserializeJar,
  mergeCookiesIntoJar,
  parseSetCookieHeaders,
  pruneExpiredCookies,
  serializeJar,
} from "~/helpers/cookie/cookie-utils"
import { PersistenceService } from "./persistence"
import { getService } from "~/modules/dioc"

const STORAGE_KEY = "zapro.cookieJar.v1"
const PERSIST_DEBOUNCE_MS = 75

const persistenceService = getService(PersistenceService)

export class CookieJarService extends Service {
  public static readonly ID = "COOKIE_JAR_SERVICE"

  /**
   * The cookie jar that stores all relevant cookie info.
   * The keys correspond to the domain of the cookie.
   * The cookie strings are stored as an array of strings corresponding to the domain
   */
  public cookieJar = ref(new Map<string, Cookie[]>())

  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private persistenceReady = false

  override onServiceInit(): void {
    // Set up the watcher first; schedulePersist no-ops until persistenceReady flips
    // so changes triggered by hydration itself won't write back partial state.
    watch(this.cookieJar, () => this.schedulePersist(), { deep: true })
    void this.hydrateFromStorage().finally(() => {
      this.persistenceReady = true
    })
  }

  public parseSetCookieString(setCookieString: string) {
    return setCookieParse(setCookieString)
  }

  public bulkApplyCookiesToDomain(cookies: Cookie[], domain: string) {
    const existingDomainEntries = this.cookieJar.value.get(domain) ?? []
    // Replace the Map with a new instance so Vue's reactivity is triggered
    // for downstream consumers (the cookies modal, request runner, persistence watcher).
    const next = new Map(this.cookieJar.value)
    next.set(domain, [...existingDomainEntries, ...cookies])
    this.cookieJar.value = next
  }

  public getCookiesForURL(url: URL) {
    const relevantDomains = Array.from(this.cookieJar.value.keys()).filter(
      (domain) => url.hostname.endsWith(domain)
    )

    return relevantDomains
      .flatMap((domain) => {
        // Assemble the list of cookie entries from all the relevant domains

        const cookieStrings = this.cookieJar.value.get(domain)! // We know not nullable from how we filter above

        return cookieStrings.map((cookieString) =>
          this.parseSetCookieString(cookieString.value)
        )
      })
      .filter((cookie) => {
        // Perform the required checks on the cookies

        const passesPathCheck = url.pathname.startsWith(cookie.path ?? "/")

        const passesExpiresCheck = !cookie.expires
          ? true
          : cookie.expires.getTime() >= new Date().getTime()

        const passesSecureCheck = !cookie.secure
          ? true
          : url.protocol === "https:"

        return passesPathCheck && passesExpiresCheck && passesSecureCheck
      })
  }

  /**
   * Captures `Set-Cookie` headers received from a proxied (or otherwise non-native)
   * response and merges them into the jar. Multiple cookies in a single header
   * value are expected to be newline-separated (matching the proxyscotch wire
   * format).
   */
  public captureSetCookieHeader(rawSetCookie: string, requestUrl: URL): void {
    if (!rawSetCookie) return
    const parsed = parseSetCookieHeaders(rawSetCookie, requestUrl.hostname)
    if (parsed.length === 0) return
    this.cookieJar.value = mergeCookiesIntoJar(this.cookieJar.value, parsed)
  }

  /**
   * Returns a value suitable for the `Cookie` request header for the given URL,
   * derived directly from stored cookie objects (no re-parse).
   */
  public buildCookieHeader(url: URL): string | null {
    return cookieHeaderForURL(this.cookieJar.value, url)
  }

  private async hydrateFromStorage(): Promise<void> {
    try {
      const raw = await persistenceService.getLocalConfig(STORAGE_KEY)
      if (!raw) return
      const restored = pruneExpiredCookies(deserializeJar(raw))
      if (restored.size > 0) {
        this.cookieJar.value = restored
      }
    } catch (err) {
      console.warn("[CookieJarService] failed to hydrate from storage", err)
    }
  }

  private schedulePersist(): void {
    if (!this.persistenceReady) return
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      void persistenceService
        .setLocalConfig(STORAGE_KEY, serializeJar(this.cookieJar.value))
        .catch((err) => {
          console.warn("[CookieJarService] failed to persist", err)
        })
    }, PERSIST_DEBOUNCE_MS)
  }
}
