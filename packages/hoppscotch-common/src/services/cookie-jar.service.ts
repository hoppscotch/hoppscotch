import { Service } from "dioc"
import { ref } from "vue"
import { parseString as setCookieParse } from "set-cookie-parser-es"

export type CookieDef = {
  name: string
  value: string
  domain: string
  path: string
  expires: string
}

export class CookieJarService extends Service {
  public static readonly ID = "COOKIE_JAR_SERVICE"

  /**
   * The cookie jar that stores all relevant cookie info.
   * The keys correspond to the domain of the cookie.
   * The cookie strings are stored as an array of strings corresponding to the domain
   */
  public cookieJar = ref(new Map<string, string[]>())

  constructor() {
    super()

    // TODO: Remove this, only for testing
    this.cookieJar.value.set("hoppscotch.io", [
      "cookie1=value1;",
      "cookie2=value2;",
      "cookie6=value6; Expires=Mon, 23 Oct 2023 14:53:22 GMT",
    ])

    this.cookieJar.value.set("echo.hoppscotch.io", [
      "cookie3=value3;",
      "cookie4=value4; Path=/test",
      "cookie5=value5; Expires=Mon, 23 Oct 2023 12:23:22 GMT",
    ])
  }

  public parseSetCookieString(setCookieString: string) {
    return setCookieParse(setCookieString)
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
          this.parseSetCookieString(cookieString)
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
}
