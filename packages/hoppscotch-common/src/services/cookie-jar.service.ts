import { Service } from "dioc"
import { ref } from "vue"
import { parseString as setCookieParse } from "set-cookie-parser-es"
import { Cookie } from "@hoppscotch/data"

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
  }

  override onServiceInit() {
    console.log('[CookieJar] Service initialized, jar size:', this.cookieJar.value.size)
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
    const domainEntries = this.cookieJar.value.get(domain)
    if (!domainEntries) return

    // Filter returns a new array, so this already creates a new reference
    const filteredEntries = domainEntries.filter((cookie) => {
      if (path) {
        return !(cookie.name === name && cookie.path === path)
      }
      return cookie.name !== name
    })

    // Create new Map to trigger Vue reactivity
    const newJar = new Map(this.cookieJar.value)
    newJar.set(domain, filteredEntries)
    this.cookieJar.value = newJar
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
