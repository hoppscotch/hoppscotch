// @vitest-environment node
import { describe, expect, it } from "vitest"
import { parseCurlCommand } from "../curl/curlparser"

describe("parseCurlCommand", () => {
  it("correctly parses standard curl commands", () => {
    const curl = "curl https://api.example.com/users"
    const req = parseCurlCommand(curl)
    expect(req.endpoint).toBe("https://api.example.com/users")
    expect(req.method).toBe("GET")
  })

  it("correctly parses curl command with -s and -sS option without swallowing URL", () => {
    const curl1 = "curl -sS https://example.com"
    const req1 = parseCurlCommand(curl1)
    expect(req1.endpoint).toBe("https://example.com/")
    expect(req1.method).toBe("GET")

    const curl2 = "curl -s https://example.com"
    const req2 = parseCurlCommand(curl2)
    expect(req2.endpoint).toBe("https://example.com/")
    expect(req2.method).toBe("GET")

    const curl3 = "curl --silent https://example.com"
    const req3 = parseCurlCommand(curl3)
    expect(req3.endpoint).toBe("https://example.com/")
    expect(req3.method).toBe("GET")
  })

  it("correctly parses curl command with connection options like -k/--insecure, -L/--location", () => {
    const curl1 = "curl -k https://example.com/insecure"
    const req1 = parseCurlCommand(curl1)
    expect(req1.endpoint).toBe("https://example.com/insecure")

    const curl2 = "curl --insecure https://example.com/insecure"
    const req2 = parseCurlCommand(curl2)
    expect(req2.endpoint).toBe("https://example.com/insecure")

    const curl3 = "curl -L https://example.com/redirect"
    const req3 = parseCurlCommand(curl3)
    expect(req3.endpoint).toBe("https://example.com/redirect")

    const curl4 = "curl --location https://example.com/redirect"
    const req4 = parseCurlCommand(curl4)
    expect(req4.endpoint).toBe("https://example.com/redirect")
  })

  it("correctly parses and deduces HEAD request method from -I/--head", () => {
    const curl1 = "curl -I https://example.com/headers"
    const req1 = parseCurlCommand(curl1)
    expect(req1.endpoint).toBe("https://example.com/headers")
    expect(req1.method).toBe("HEAD")

    const curl2 = "curl --head https://example.com/headers"
    const req2 = parseCurlCommand(curl2)
    expect(req2.endpoint).toBe("https://example.com/headers")
    expect(req2.method).toBe("HEAD")
  })

  it("correctly parses complex combination of flags", () => {
    const curl =
      "curl -fsS -L -k -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer mytoken' -d '{\"foo\":\"bar\"}' https://example.com/post"
    const req = parseCurlCommand(curl)
    expect(req.endpoint).toBe("https://example.com/post")
    expect(req.method).toBe("POST")
    expect(req.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Authorization",
          value: "Bearer mytoken",
        }),
      ])
    )
    expect(req.body.contentType).toBe("application/json")
    expect(JSON.parse(req.body.body)).toEqual({ foo: "bar" })
  })
})
