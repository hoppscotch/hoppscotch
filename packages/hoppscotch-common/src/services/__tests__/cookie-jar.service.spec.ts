import { beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { Cookie } from "@hoppscotch/data"

import { CookieJarService } from "../cookie-jar.service"

const cookie = (
  overrides: Partial<Cookie> & Pick<Cookie, "name" | "value">
): Cookie => ({
  domain: "example.com",
  path: "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax",
  ...overrides,
})

describe("CookieJarService", () => {
  let container: TestContainer
  let service: CookieJarService

  beforeEach(async () => {
    container = new TestContainer()
    service = container.bind(CookieJarService)
    // `Store.init` fails outside the desktop runtime, the service
    // sets `initFailed` and stays operational on its in-memory
    // map. `whenReady` resolves either way.
    await service.whenReady()
  })

  describe("canonStoreDomain", () => {
    it("strips a leading dot, lowercases, and trims", () => {
      expect(service.canonStoreDomain(".Example.COM")).toBe("example.com")
      expect(service.canonStoreDomain("  example.com  ")).toBe("example.com")
      expect(service.canonStoreDomain("Example.COM")).toBe("example.com")
    })
  })

  describe("toMap migration on hydrate", () => {
    it("canonicalizes a leading-dot domain key from on-disk payload", () => {
      const map = (service as any).toMap({
        ".Example.COM": [
          cookie({ name: "a", value: "1", domain: ".Example.COM" }),
        ],
      })
      expect(map.has("example.com")).toBe(true)
      expect(map.get("example.com")?.[0].domain).toBe("example.com")
    })

    it("merges two non-canonical keys that collapse to the same canon", () => {
      const map = (service as any).toMap({
        ".Example.COM": [
          cookie({ name: "a", value: "1", domain: ".Example.COM" }),
        ],
        "EXAMPLE.com": [
          cookie({ name: "b", value: "2", domain: "EXAMPLE.com" }),
        ],
      })
      expect(map.get("example.com")).toHaveLength(2)
    })

    it("dedupes by (name, path) across non-canonical keys that collapse onto the same canon", () => {
      const map = (service as any).toMap({
        ".Example.COM": [cookie({ name: "sid", value: "old", path: "/" })],
        "EXAMPLE.com": [cookie({ name: "sid", value: "new", path: "/" })],
      })
      const bucket = map.get("example.com")
      expect(bucket).toHaveLength(1)
      expect(bucket?.[0].value).toBe("new")
    })

    it("drops an entry whose key canonicalizes to empty", () => {
      const map = (service as any).toMap({
        ".": [cookie({ name: "a", value: "1" })],
      })
      expect(map.size).toBe(0)
    })
  })

  describe("getCookiesForURL", () => {
    it("matches the exact host per RFC 6265 5.1.3", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const cookies = service.getCookiesForURL(new URL("https://example.com/"))
      expect(cookies).toHaveLength(1)
      expect(cookies[0].value).toBe("1")
    })

    it("does not match `evil-example.com` against `example.com`", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const cookies = service.getCookiesForURL(
        new URL("https://evil-example.com/")
      )
      expect(cookies).toHaveLength(0)
    })

    it("matches a subdomain when the cookie has a parent domain", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const cookies = service.getCookiesForURL(
        new URL("https://api.example.com/")
      )
      expect(cookies).toHaveLength(1)
    })

    it("compares the host case-insensitively per RFC 6265 5.1.2", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const cookies = service.getCookiesForURL(new URL("https://EXAMPLE.com/"))
      expect(cookies).toHaveLength(1)
    })

    it("sorts results longest-path-first per RFC 6265 5.4", async () => {
      await service.upsertCookies([
        cookie({ name: "sid", value: "root", path: "/" }),
        cookie({ name: "sid", value: "admin", path: "/admin" }),
      ])
      const cookies = service.getCookiesForURL(
        new URL("https://example.com/admin/users")
      )
      expect(cookies).toHaveLength(2)
      expect(cookies[0].path).toBe("/admin")
      expect(cookies[1].path).toBe("/")
    })

    it("drops secure cookies on http URLs", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "1", secure: true }),
      ])
      expect(
        service.getCookiesForURL(new URL("http://example.com/"))
      ).toHaveLength(0)
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(1)
    })

    it("treats a non-finite expires as a session cookie, not expired", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "1", expires: "not-a-date" }),
      ])
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(1)
    })

    it("respects path boundary per RFC 6265 5.1.4", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "1", path: "/admin" }),
      ])
      expect(
        service.getCookiesForURL(new URL("https://example.com/admin"))
      ).toHaveLength(1)
      expect(
        service.getCookiesForURL(new URL("https://example.com/admin/x"))
      ).toHaveLength(1)
      expect(
        service.getCookiesForURL(new URL("https://example.com/administrator"))
      ).toHaveLength(0)
    })
  })

  describe("upsertCookies", () => {
    it("canonicalizes domain (strip leading dot, lowercase, trim)", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "1", domain: " .Example.COM " }),
      ])
      const cookies = service.getCookiesForURL(new URL("https://example.com/"))
      expect(cookies).toHaveLength(1)
    })

    it("normalizes an empty-string path to `/`", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1", path: "" })])
      const stored = service.cookieJar.value.get("example.com")?.[0]
      expect(stored?.path).toBe("/")
    })

    it("skips a cookie with empty domain", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "1", domain: "" }),
      ])
      expect(service.cookieJar.value.size).toBe(0)
    })

    it("skips a cookie whose canonicalized domain has internal whitespace", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "1", domain: "ex ample.com" }),
      ])
      expect(service.cookieJar.value.size).toBe(0)
    })

    it("defaults secure to false when a script-set cookie omits the flag", async () => {
      await service.upsertCookies([
        { name: "a", value: "1", domain: "example.com", path: "/" } as Cookie,
      ])
      const stored = service.cookieJar.value.get("example.com")?.[0]
      expect(stored?.secure).toBe(false)
    })

    it("defaults httpOnly to false when a script-set cookie omits the flag", async () => {
      await service.upsertCookies([
        { name: "a", value: "1", domain: "example.com", path: "/" } as Cookie,
      ])
      const stored = service.cookieJar.value.get("example.com")?.[0]
      expect(stored?.httpOnly).toBe(false)
    })

    it("skips a script-set cookie whose name is not a string", async () => {
      await service.upsertCookies([
        {
          name: 42 as unknown as string,
          value: "1",
          domain: "example.com",
        } as Cookie,
      ])
      expect(service.cookieJar.value.size).toBe(0)
    })

    it("produces a cookie that parseStored accepts after upsert", async () => {
      await service.upsertCookies([
        { name: "a", value: "1", domain: "example.com" } as Cookie,
      ])
      const stored = service.cookieJar.value.get("example.com")
      expect(stored).toBeDefined()
      // Round-trip through parseStored to confirm the upsert output
      // satisfies the load-time shape check.
      const payload = {
        domains: { "example.com": stored },
      }
      expect(() => (service as any).parseStored(payload)).not.toThrow()
    })

    it("merges by (domain, name, path) instead of duplicating", async () => {
      await service.upsertCookies([
        cookie({ name: "a", value: "old" }),
        cookie({ name: "a", value: "new" }),
      ])
      const stored = service.cookieJar.value.get("example.com")
      expect(stored).toHaveLength(1)
      expect(stored?.[0].value).toBe("new")
    })

    it("drops a non-boolean hostOnly instead of persisting it", async () => {
      await service.upsertCookies([
        cookie({
          name: "a",
          value: "1",
          hostOnly: "true" as unknown as boolean,
        }),
      ])
      const stored = service.cookieJar.value.get("example.com")?.[0]
      expect(stored?.hostOnly).toBeUndefined()
    })
  })

  describe("deleteCookies", () => {
    it("canonicalizes the target domain", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      await service.deleteCookies([
        { domain: ".Example.COM", name: "a", path: "/" },
      ])
      expect(service.cookieJar.value.size).toBe(0)
    })

    it("treats an empty path as `/`", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      await service.deleteCookies([
        { domain: "example.com", name: "a", path: "" },
      ])
      expect(service.cookieJar.value.size).toBe(0)
    })
  })

  describe("applyCookiesToRequest", () => {
    it("attaches matching cookies to the Cookie header", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const req = {
        url: "https://example.com/",
        headers: {} as Record<string, string>,
      }
      await service.applyCookiesToRequest(req)
      expect(req.headers["Cookie"]).toBe("a=1")
    })

    it("yields to a user-set non-empty Cookie header (any case)", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const req = {
        url: "https://example.com/",
        headers: { cookie: "user=set" } as Record<string, string>,
      }
      await service.applyCookiesToRequest(req)
      expect(req.headers["cookie"]).toBe("user=set")
      expect(req.headers["Cookie"]).toBeUndefined()
    })

    it("strips empty case-variant Cookie headers before setting the canonical one", async () => {
      await service.upsertCookies([cookie({ name: "a", value: "1" })])
      const req = {
        url: "https://example.com/",
        headers: { cookie: "" } as Record<string, string>,
      }
      await service.applyCookiesToRequest(req)
      expect(req.headers["Cookie"]).toBe("a=1")
      expect(req.headers["cookie"]).toBeUndefined()
    })

    it("does not set Cookie when the URL is unparseable", async () => {
      const req = {
        url: "not-a-url",
        headers: {} as Record<string, string>,
      }
      await service.applyCookiesToRequest(req)
      expect(req.headers["Cookie"]).toBeUndefined()
    })

    it("strips an empty case-variant Cookie header even when the jar has no match", async () => {
      const req = {
        url: "https://no-match.example.com/",
        headers: { cookie: "" } as Record<string, string>,
      }
      await service.applyCookiesToRequest(req)
      expect(req.headers["cookie"]).toBeUndefined()
      expect(req.headers["Cookie"]).toBeUndefined()
    })

    it('does not send `Cookie: ""` when every matching cookie fails value validation', async () => {
      await service.upsertCookies([cookie({ name: "a", value: "has;semi" })])
      const req = {
        url: "https://example.com/",
        headers: {} as Record<string, string>,
      }
      await service.applyCookiesToRequest(req)
      expect(req.headers["Cookie"]).toBeUndefined()
    })
  })

  describe("parseStored", () => {
    it("rejects a payload whose cookie has non-string path", () => {
      expect(() =>
        (service as any).parseStored({
          domains: {
            "example.com": [
              {
                name: "a",
                value: "1",
                domain: "example.com",
                path: 1,
                secure: false,
              },
            ],
          },
        })
      ).toThrow()
    })

    it("rejects a payload whose cookie has non-boolean secure", () => {
      expect(() =>
        (service as any).parseStored({
          domains: {
            "example.com": [
              {
                name: "a",
                value: "1",
                domain: "example.com",
                path: "/",
                secure: "false",
              },
            ],
          },
        })
      ).toThrow()
    })
  })

  describe("extractFromResponse", () => {
    it("defaults the path to the request directory per RFC 6265 5.1.4", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1" }],
        new URL("https://example.com/v1/users/42")
      )
      expect(
        service.getCookiesForURL(new URL("https://example.com/v1/users"))
      ).toHaveLength(1)
      expect(
        service.getCookiesForURL(new URL("https://example.com/other"))
      ).toHaveLength(0)
    })

    it("tolerates an Invalid Date in `expires`", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1", expires: new Date("not-a-date") }],
        new URL("https://example.com/")
      )
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(1)
    })

    it("accepts a single-label host as a host-only cookie", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1" }],
        new URL("http://localhost:3000/")
      )
      expect(
        service.getCookiesForURL(new URL("http://localhost:3000/"))
      ).toHaveLength(1)
    })

    it("rejects a single-label Domain attribute (public-suffix gate)", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1", domain: "com" }],
        new URL("https://example.com/")
      )
      expect(service.cookieJar.value.size).toBe(0)
    })

    it("rejects a Domain the response host does not domain-match", async () => {
      await service.extractFromResponse(
        [{ name: "sid", value: "attacker", domain: "example.com" }],
        new URL("https://attacker.invalid/")
      )
      expect(service.cookieJar.value.size).toBe(0)
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(0)
    })

    it("accepts a parent Domain from a subdomain host", async () => {
      await service.extractFromResponse(
        [{ name: "sid", value: "1", domain: "example.com" }],
        new URL("https://api.example.com/")
      )
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(1)
    })

    it("rejects a partial IP suffix as a Domain attribute", async () => {
      await service.extractFromResponse(
        [{ name: "sid", value: "1", domain: "1.1" }],
        new URL("https://192.168.1.1/")
      )
      expect(service.cookieJar.value.size).toBe(0)
      expect(
        service.getCookiesForURL(new URL("https://10.0.1.1/"))
      ).toHaveLength(0)
    })

    it("accepts a Domain attribute equal to the IP host", async () => {
      await service.extractFromResponse(
        [{ name: "sid", value: "1", domain: "192.168.1.1" }],
        new URL("https://192.168.1.1/")
      )
      expect(
        service.getCookiesForURL(new URL("https://192.168.1.1/"))
      ).toHaveLength(1)
    })

    it("falls back to default-path when the Path attribute does not start with /", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1", path: "foo" }],
        new URL("https://example.com/v1/users/42")
      )
      const stored = service.cookieJar.value.get("example.com")?.[0]
      expect(stored?.path).toBe("/v1/users")
    })
  })

  describe("captureResponseCookies header fallback", () => {
    it("parses the Set-Cookie header when structured cookies are undefined", async () => {
      await service.captureResponseCookies(
        { headers: { "set-cookie": "sid=abc123; Path=/; HttpOnly" } },
        "https://example.com/"
      )
      const stored = service.getCookiesForURL(new URL("https://example.com/"))
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe("sid")
      expect(stored[0].value).toBe("abc123")
    })

    it("resolves Max-Age into an expiry on the header fallback", async () => {
      await service.captureResponseCookies(
        { headers: { "set-cookie": "sid=abc; Max-Age=60; Path=/" } },
        "https://example.com/"
      )
      const stored = service.getCookiesForURL(new URL("https://example.com/"))
      expect(stored).toHaveLength(1)
      expect(stored[0].expires).toBeDefined()
      expect(new Date(stored[0].expires!).getTime()).toBeGreaterThan(Date.now())
    })

    it("keeps a percent-encoded value undecoded on the header fallback", async () => {
      await service.captureResponseCookies(
        { headers: { "set-cookie": "sid=abc%20123; Path=/" } },
        "https://example.com/"
      )
      const stored = service.getCookiesForURL(new URL("https://example.com/"))
      expect(stored).toHaveLength(1)
      expect(stored[0].value).toBe("abc%20123")
    })

    it("splits newline-joined Set-Cookie headers the agent relay concatenates", async () => {
      await service.captureResponseCookies(
        { headers: { "set-cookie": "a=1; Path=/\nb=2; Path=/" } },
        "https://example.com/"
      )
      const stored = service.getCookiesForURL(new URL("https://example.com/"))
      expect(stored).toHaveLength(2)
      expect(stored.map((c) => c.name).sort()).toEqual(["a", "b"])
    })

    it("drops an existing cookie on a Max-Age=0 fallback capture", async () => {
      // Frozen so the read happens at the same instant as the
      // capture, which is the only window in which an expiry equal
      // to the capture time still reads as live.
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
      try {
        await service.captureResponseCookies(
          { headers: { "set-cookie": "sid=abc; Path=/" } },
          "https://example.com/"
        )
        await service.captureResponseCookies(
          { headers: { "set-cookie": "sid=abc; Max-Age=0; Path=/" } },
          "https://example.com/"
        )
        expect(
          service.getCookiesForURL(new URL("https://example.com/"))
        ).toHaveLength(0)
      } finally {
        vi.useRealTimers()
      }
    })

    it("rejects a cross-domain Domain on the header fallback", async () => {
      await service.captureResponseCookies(
        {
          headers: {
            "set-cookie": "sid=attacker; Domain=example.com; Path=/",
          },
        },
        "https://attacker.invalid/"
      )
      expect(service.cookieJar.value.size).toBe(0)
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(0)
    })

    it("does not re-parse headers when cookies is a defined empty array", async () => {
      await service.captureResponseCookies(
        { cookies: [], headers: { "set-cookie": "sid=abc123; Path=/" } },
        "https://example.com/"
      )
      expect(service.cookieJar.value.size).toBe(0)
    })

    it("does nothing when cookies is undefined and no Set-Cookie header is present", async () => {
      await service.captureResponseCookies(
        { headers: { "content-type": "application/json" } },
        "https://example.com/"
      )
      expect(service.cookieJar.value.size).toBe(0)
    })
  })

  describe("serializeCookieHeader", () => {
    it("joins `name=value` pairs with `; `", () => {
      expect(
        service.serializeCookieHeader([
          cookie({ name: "a", value: "1" }),
          cookie({ name: "b", value: "2" }),
        ])
      ).toBe("a=1; b=2")
    })

    it("skips a cookie whose value contains an RFC 6265 5.4 forbidden character", () => {
      expect(
        service.serializeCookieHeader([
          cookie({ name: "a", value: "has;semi" }),
          cookie({ name: "b", value: "ok" }),
        ])
      ).toBe("b=ok")
    })

    it("skips a cookie whose name is not a valid RFC 7230 token", () => {
      expect(
        service.serializeCookieHeader([
          cookie({ name: "has;semi", value: "1" }),
          cookie({ name: "b", value: "2" }),
        ])
      ).toBe("b=2")
    })
  })

  describe("host-only cookies (FE-1284)", () => {
    it("marks a Set-Cookie with no Domain attribute as host-only", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1" }],
        new URL("https://example.com/")
      )
      expect(service.cookieJar.value.get("example.com")?.[0].hostOnly).toBe(true)
    })

    it("does not mark a Domain-scoped Set-Cookie as host-only", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1", domain: "example.com" }],
        new URL("https://example.com/")
      )
      expect(service.cookieJar.value.get("example.com")?.[0].hostOnly).toBe(
        false
      )
    })

    it("sends a host-only cookie to its exact host", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1" }],
        new URL("https://example.com/")
      )
      expect(
        service.getCookiesForURL(new URL("https://example.com/"))
      ).toHaveLength(1)
    })

    it("does not send a host-only cookie to a subdomain of its host", async () => {
      await service.extractFromResponse(
        [{ name: "a", value: "1" }],
        new URL("https://example.com/")
      )
      expect(
        service.getCookiesForURL(new URL("https://api.example.com/"))
      ).toHaveLength(0)
    })

    it("does not duplicate a cookie name across a host-only and a Domain-scoped bucket on a child-host request", async () => {
      // Host-only cookie set at the parent host (no Domain attribute).
      await service.extractFromResponse(
        [{ name: "sid", value: "host" }],
        new URL("https://example.com/")
      )
      // Same name, Domain-scoped to the child host it legitimately applies to.
      await service.extractFromResponse(
        [{ name: "sid", value: "child", domain: "api.example.com" }],
        new URL("https://api.example.com/")
      )
      const cookies = service.getCookiesForURL(
        new URL("https://api.example.com/")
      )
      expect(cookies).toHaveLength(1)
      expect(cookies[0].value).toBe("child")
    })

    it("treats a legacy persisted cookie with no hostOnly flag as non-host-only", () => {
      const map = (service as any).toMap({
        "example.com": [cookie({ name: "a", value: "1" })],
      })
      service.cookieJar.value = map
      // Backward compatibility, the pre-flag entry still matches the
      // subdomains it matched before the upgrade.
      expect(map.get("example.com")?.[0].hostOnly).toBe(false)
      expect(
        service.getCookiesForURL(new URL("https://api.example.com/"))
      ).toHaveLength(1)
    })
  })
})
