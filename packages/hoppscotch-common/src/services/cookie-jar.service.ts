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

  public parseSetCookieString(setCookieString: string) {
    return setCookieParse(setCookieString)
  }

  public bulkApplyCookiesToDomain(cookies: Cookie[], domain: string) {
    const existingDomainEntries = this.cookieJar.value.get(domain) ?? []
    existingDomainEntries.push(...cookies)

    this.cookieJar.value.set(domain, existingDomainEntries)
  }

  public applySetCookieHeaders(setCookieStrings: string[], requestURL: URL) {
    const domain = requestURL.hostname

    const newCookies: Cookie[] = setCookieStrings
      .map((str) => this.parseSetCookieString(str))
      .filter((parsed) => parsed.name != null)
      .map((parsed) => ({
        name: parsed.name!,
        value: parsed.value,
        domain: parsed.domain
          ? parsed.domain.startsWith(".")
            ? parsed.domain.toLowerCase()
            : `.${parsed.domain.toLowerCase()}`
          : domain.toLowerCase(),
        path: parsed.path ?? "/",
        httpOnly: parsed.httpOnly ?? false,
        secure: parsed.secure ?? false,
        sameSite: ((): "None" | "Lax" | "Strict" => {
          if (typeof parsed.sameSite === "string") {
            const lower = parsed.sameSite.toLowerCase()
            if (lower === "none") return "None"
            if (lower === "strict") return "Strict"
          }
          return "Lax"
        })(),
        expires: parsed.expires?.toISOString(),
        maxAge: parsed.maxAge,
      }))

    for (const cookie of newCookies) {
      const existing = this.cookieJar.value.get(cookie.domain) ?? []
      const idx = existing.findIndex(
        (c: Cookie) => c.name === cookie.name && c.path === cookie.path
      )
      if (idx !== -1) {
        existing[idx] = cookie
      } else {
        existing.push(cookie)
      }
      this.cookieJar.value.set(cookie.domain, existing)
    }
  }

  public getCookiesForURL(url: URL) {
    const relevantDomains = Array.from(this.cookieJar.value.keys()).filter(
      (domain) =>
        domain.startsWith(".")
          ? url.hostname === domain.slice(1) || url.hostname.endsWith(domain)
          : url.hostname === domain
    )

    return relevantDomains
      .flatMap((domain) => {
        return this.cookieJar.value.get(domain)!
      })
      .filter((cookie) => {
        const passesPathCheck = url.pathname.startsWith(cookie.path ?? "/")

        const passesExpiresCheck = !cookie.expires
          ? true
          : new Date(cookie.expires).getTime() >= Date.now()

        const passesSecureCheck = !cookie.secure
          ? true
          : url.protocol === "https:"

        return passesPathCheck && passesExpiresCheck && passesSecureCheck
      })
  }
}
