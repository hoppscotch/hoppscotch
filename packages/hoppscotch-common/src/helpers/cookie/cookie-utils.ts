import { parseString as setCookieParse } from "set-cookie-parser-es"
import type { Cookie } from "@hoppscotch/data"

type SerializedJar = Array<[string, Cookie[]]>

const SAME_SITE_VALUES: Cookie["sameSite"][] = ["None", "Lax", "Strict"]

const normalizeSameSite = (value: unknown): Cookie["sameSite"] => {
  if (typeof value !== "string") return "Lax"
  const titled = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
  return (SAME_SITE_VALUES as string[]).includes(titled)
    ? (titled as Cookie["sameSite"])
    : "Lax"
}

const stripLeadingDot = (domain: string) =>
  domain.startsWith(".") ? domain.slice(1) : domain

export const parseSetCookieHeaders = (
  rawHeader: string,
  fallbackDomain: string
): Cookie[] => {
  return rawHeader
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parsed = setCookieParse(line)
      const expires =
        parsed.expires instanceof Date
          ? parsed.expires.toISOString()
          : undefined

      return {
        name: parsed.name ?? "",
        value: parsed.value ?? "",
        domain: stripLeadingDot(parsed.domain ?? fallbackDomain),
        path: parsed.path ?? "/",
        expires,
        maxAge: typeof parsed.maxAge === "number" ? parsed.maxAge : undefined,
        httpOnly: Boolean(parsed.httpOnly),
        secure: Boolean(parsed.secure),
        sameSite: normalizeSameSite(parsed.sameSite),
      }
    })
    .filter((cookie) => cookie.name.length > 0)
}

const cookieIsLive = (cookie: Cookie): boolean => {
  if (!cookie.expires) return true
  const exp = Date.parse(cookie.expires)
  if (Number.isNaN(exp)) return true
  return exp >= Date.now()
}

const domainMatches = (cookieDomain: string, requestHost: string): boolean => {
  const cookieHost = stripLeadingDot(cookieDomain).toLowerCase()
  const reqHost = requestHost.toLowerCase()
  if (!cookieHost) return false
  if (cookieHost === reqHost) return true
  return reqHost.endsWith(`.${cookieHost}`)
}

const pathMatches = (cookiePath: string, requestPath: string): boolean => {
  const cp = cookiePath || "/"
  if (cp === "/") return true
  if (requestPath === cp) return true
  if (requestPath.startsWith(cp)) {
    return cp.endsWith("/") || requestPath[cp.length] === "/"
  }
  return false
}

export const cookieHeaderForURL = (
  jar: Map<string, Cookie[]>,
  url: URL
): string | null => {
  const isHttps = url.protocol === "https:"
  const matches: Cookie[] = []

  for (const [, cookies] of jar) {
    for (const cookie of cookies) {
      if (!cookie.name || !domainMatches(cookie.domain, url.hostname)) continue
      if (!pathMatches(cookie.path, url.pathname)) continue
      if (cookie.secure && !isHttps) continue
      if (!cookieIsLive(cookie)) continue
      matches.push(cookie)
    }
  }

  if (matches.length === 0) return null
  return matches.map((c) => `${c.name}=${c.value}`).join("; ")
}

export const mergeCookiesIntoJar = (
  jar: Map<string, Cookie[]>,
  incoming: Cookie[]
): Map<string, Cookie[]> => {
  const next = new Map<string, Cookie[]>()
  for (const [domain, cookies] of jar) {
    next.set(domain, cookies.slice())
  }

  for (const cookie of incoming) {
    if (!cookie.domain) continue
    const existing = next.get(cookie.domain) ?? []
    const filtered = existing.filter(
      (c) => !(c.name === cookie.name && c.path === cookie.path)
    )
    next.set(cookie.domain, [...filtered, cookie])
  }

  return next
}

export const pruneExpiredCookies = (
  jar: Map<string, Cookie[]>
): Map<string, Cookie[]> => {
  const next = new Map<string, Cookie[]>()
  for (const [domain, cookies] of jar) {
    const live = cookies.filter(cookieIsLive)
    if (live.length > 0) next.set(domain, live)
  }
  return next
}

export const serializeJar = (jar: Map<string, Cookie[]>): string => {
  const payload: SerializedJar = Array.from(jar.entries())
  return JSON.stringify(payload)
}

export const deserializeJar = (raw: string): Map<string, Cookie[]> => {
  try {
    const parsed = JSON.parse(raw) as SerializedJar
    if (!Array.isArray(parsed)) return new Map()
    return new Map(parsed)
  } catch {
    return new Map()
  }
}
