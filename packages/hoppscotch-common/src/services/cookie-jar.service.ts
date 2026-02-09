import { Service } from "dioc"
import { ref, watch } from "vue"
import { parseString as setCookieParse } from "set-cookie-parser-es"
import { Cookie } from "@hoppscotch/data"

const COOKIE_JAR_STORAGE_KEY = "hoppscotch_cookie_jar"

export class CookieJarService extends Service {
  public static readonly ID = "COOKIE_JAR_SERVICE"

  /**
   * The cookie jar that stores all relevant cookie info.
   * The keys correspond to the domain of the cookie.
   * The cookie strings are stored as an array of strings corresponding to the domain
   */
  public cookieJar = ref(new Map<string, Cookie[]>())

  constructor() {
    super()
    console.log('[CookieJar] Service instance created')
    this.loadCookiesFromStorage()
  }

  override onServiceInit() {
    console.log('[CookieJar] Service initialized, jar size:', this.cookieJar.value.size)
    
    // Watch for changes and persist to storage
    watch(
      () => this.cookieJar.value,
      (newJar) => {
        this.saveCookiesToStorage(newJar)
      },
      { deep: true }
    )
  }

  /**
   * Load cookies from localStorage/platform storage on initialization
   */
  private loadCookiesFromStorage() {
    try {
      const stored = localStorage.getItem(COOKIE_JAR_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const cookieMap = new Map<string, Cookie[]>()
        
        // Reconstruct the Map from the stored array
        for (const [domain, cookies] of parsed) {
          cookieMap.set(domain, cookies)
        }
        
        this.cookieJar.value = cookieMap
        console.log('[CookieJar] Loaded cookies from storage. Domains:', cookieMap.size)
      }
    } catch (error) {
      console.error('[CookieJar] Error loading cookies from storage:', error)
    }
  }

  /**
   * Save cookies to localStorage/platform storage
   */
  private saveCookiesToStorage(cookieJar: Map<string, Cookie[]>) {
    try {
      // Convert Map to array for JSON serialization
      const cookieArray = Array.from(cookieJar.entries())
      localStorage.setItem(COOKIE_JAR_STORAGE_KEY, JSON.stringify(cookieArray))
      console.log('[CookieJar] Saved cookies to storage. Domains:', cookieJar.size)
    } catch (error) {
      console.error('[CookieJar] Error saving cookies to storage:', error)
    }
  }

  public parseSetCookieString(setCookieString: string) {
    return setCookieParse(setCookieString)
  }

  public bulkApplyCookiesToDomain(cookies: Cookie[], domain: string) {
    const existingDomainEntries = this.cookieJar.value.get(domain) ?? []
    
    // Create new array reference to trigger Vue reactivity
    const newEntries = [...existingDomainEntries, ...cookies]

    // Create new Map to trigger Vue reactivity
    const newJar = new Map(this.cookieJar.value)
    newJar.set(domain, newEntries)
    this.cookieJar.value = newJar
  }

  /**
   * Extract and store cookies from response Set-Cookie headers
   * @param setCookieHeaders Array of Set-Cookie header values
   * @param requestUrl The URL of the request that generated the response
   */
  public extractCookiesFromResponse(setCookieHeaders: string[], requestUrl: string) {
    console.log('[CookieJar] extractCookiesFromResponse called', { headersCount: setCookieHeaders.length, requestUrl })
    
    if (!setCookieHeaders || setCookieHeaders.length === 0) return

    try {
      const url = new URL(requestUrl)
      const defaultDomain = url.hostname
      console.log('[CookieJar] Processing cookies for domain:', defaultDomain)

      setCookieHeaders.forEach((setCookieHeader, index) => {
        console.log(`[CookieJar] Processing cookie ${index + 1}:`, setCookieHeader)
        const parsedCookie = setCookieParse(setCookieHeader)
        if (parsedCookie) {
          const cookieDomain = parsedCookie.domain || defaultDomain
          console.log('[CookieJar] Parsed cookie:', { name: parsedCookie.name, domain: cookieDomain })
          this.addCookie(setCookieHeader, cookieDomain)
        } else {
          console.warn('[CookieJar] Failed to parse cookie:', setCookieHeader)
        }
      })
      console.log('[CookieJar] Cookie extraction completed. Total domains:', this.cookieJar.value.size)
    } catch (error) {
      console.error("Error extracting cookies from response:", error)
    }
  }

  /**
   * Add a single cookie to the jar
   * @param cookieString The full Set-Cookie header value
   * @param domain The domain for the cookie
   */
  public addCookie(cookieString: string, domain: string) {
    const existingDomainEntries = this.cookieJar.value.get(domain) ?? []
    console.log('[CookieJar] addCookie - existing entries:', existingDomainEntries.length)

    // Parse the new cookie
    const parsedCookie = setCookieParse(cookieString)
    if (!parsedCookie) return

    // Convert parsed cookie to Cookie type
    const cookieEntry: Cookie = {
      name: parsedCookie.name,
      value: parsedCookie.value,
      domain: parsedCookie.domain || domain,
      path: parsedCookie.path || "/",
      expires: parsedCookie.expires ? parsedCookie.expires.toISOString() : undefined,
      maxAge: parsedCookie.maxAge,
      httpOnly: parsedCookie.httpOnly ?? false,
      secure: parsedCookie.secure ?? false,
      sameSite: parsedCookie.sameSite === "none" ? "None" : parsedCookie.sameSite === "lax" ? "Lax" : parsedCookie.sameSite === "strict" ? "Strict" : "None",
    }

    console.log('[CookieJar] addCookie - new cookie:', { name: cookieEntry.name, domain: cookieEntry.domain, path: cookieEntry.path })

    // Remove any existing cookie with the same name and path
    const filteredEntries = existingDomainEntries.filter((existingCookie) => {
      return !(existingCookie.name === cookieEntry.name && existingCookie.path === cookieEntry.path)
    })

    // Add the new cookie and create a new array reference
    const newEntries = [...filteredEntries, cookieEntry]
    
    console.log('[CookieJar] addCookie - new entries count:', newEntries.length)

    // Create new Map to trigger Vue reactivity
    const newJar = new Map(this.cookieJar.value)
    newJar.set(domain, newEntries)
    this.cookieJar.value = newJar
    
    console.log('[CookieJar] addCookie - jar updated. Total domains:', this.cookieJar.value.size, 'Cookies in domain:', this.cookieJar.value.get(domain)?.length)
  }

  /**
   * Remove a cookie from the jar
   * @param name Cookie name
   * @param domain Cookie domain
   * @param path Cookie path (optional)
   */
  public removeCookie(name: string, domain: string, path?: string) {
    console.log('[CookieJar] removeCookie called:', { name, domain, path })
    const domainEntries = this.cookieJar.value.get(domain)
    if (!domainEntries) {
      console.log('[CookieJar] No entries found for domain:', domain)
      return
    }

    console.log('[CookieJar] Before removal, entries count:', domainEntries.length)

    // Filter returns a new array, so this already creates a new reference
    const filteredEntries = domainEntries.filter((cookie) => {
      if (path) {
        return !(cookie.name === name && cookie.path === path)
      }
      return cookie.name !== name
    })

    console.log('[CookieJar] After filtering, entries count:', filteredEntries.length)

    // Create a completely new Map with all entries copied to ensure Vue reactivity
    const newJar = new Map<string, Cookie[]>()
    
    // Copy all domains except the one we're modifying
    for (const [key, value] of this.cookieJar.value.entries()) {
      if (key === domain) {
        // Only add the domain back if there are remaining cookies
        if (filteredEntries.length > 0) {
          newJar.set(key, filteredEntries)
        }
      } else {
        // Copy other domains as-is (create new array reference for consistency)
        newJar.set(key, [...value])
      }
    }

    // Assign the new Map to trigger Vue reactivity
    this.cookieJar.value = newJar
    
    console.log('[CookieJar] After removal, total domains:', this.cookieJar.value.size)
    console.log('[CookieJar] Remaining cookies for domain:', this.cookieJar.value.get(domain)?.length ?? 0)
  }

  /**
   * Clear all cookies for a specific domain
   * @param domain Domain to clear cookies for
   */
  public clearCookiesForDomain(domain: string) {
    console.log('[CookieJar] clearCookiesForDomain called for:', domain)
    console.trace('[CookieJar] clearCookiesForDomain stack trace')
    // Create new Map to trigger Vue reactivity
    const newJar = new Map(this.cookieJar.value)
    newJar.delete(domain)
    this.cookieJar.value = newJar
    console.log('[CookieJar] After clear, jar size:', this.cookieJar.value.size)
  }

  /**
   * Clear all cookies
   */
  public clearAllCookies() {
    console.log('[CookieJar] clearAllCookies called')
    console.trace('[CookieJar] clearAllCookies stack trace')
    // Create new Map to trigger Vue reactivity
    this.cookieJar.value = new Map()
    console.log('[CookieJar] After clearAll, jar size:', this.cookieJar.value.size)
  }

  public getCookiesForURL(url: URL | string) {
    let urlObj: URL

    try {
      urlObj = typeof url === 'string' ? new URL(url) : url
    } catch {
      // If URL parsing fails, return empty array
      return []
    }

    const relevantDomains = Array.from(this.cookieJar.value.keys()).filter(
      (domain) => urlObj.hostname.endsWith(domain)
    )

    return relevantDomains
      .flatMap((domain) => {
        // Assemble the list of cookie entries from all the relevant domains

        const cookieEntries = this.cookieJar.value.get(domain)! // We know not nullable from how we filter above

        return cookieEntries.map((cookie) => ({
          ...cookie,
          // Parse expires if it's a string to check expiration
          expires: cookie.expires ? new Date(cookie.expires) : undefined,
        }))
      })
      .filter((cookie) => {
        // Perform the required checks on the cookies

        const passesPathCheck = urlObj.pathname.startsWith(cookie.path ?? "/")

        const passesExpiresCheck = !cookie.expires
          ? true
          : cookie.expires.getTime() >= new Date().getTime()

        const passesSecureCheck = !cookie.secure
          ? true
          : urlObj.protocol === "https:"

        return passesPathCheck && passesExpiresCheck && passesSecureCheck
      })
  }
}
