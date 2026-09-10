import { describe, expect, test } from "vitest"
import {
  getLocalSecretReferenceID,
  redactSensitiveChatValues,
  replaceSensitiveChatValues,
} from "../secret-references"

describe("replaceSensitiveChatValues", () => {
  test("replaces a named Stripe secret while preserving its variable name", () => {
    const values = new Map<string, string>()
    let sequence = 0
    const content = replaceSensitiveChatValues(
      "Create STRIPE_API_KEY=sk_test_51StripeSecretToken",
      (secret) => {
        const id = `secret_${++sequence}`
        values.set(id, secret)
        return id
      }
    )

    expect(content).toBe("Create STRIPE_API_KEY=<<local-ref:secret_1>>")
    expect(values.get("secret_1")).toBe("sk_test_51StripeSecretToken")
    expect(getLocalSecretReferenceID("<<local-ref:secret_1>>")).toBe("secret_1")
  })

  test("replaces bearer and webhook credentials without leaking their values", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "Authorization: Bearer sk_test_Secret and webhook whsec_Secret",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )

    expect(content).toBe(
      "Authorization: Bearer <<local-ref:secret_1>> and webhook <<local-ref:secret_2>>"
    )
    expect(captured).toEqual(["sk_test_Secret", "whsec_Secret"])
  })

  test("preserves safe environment placeholders", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "STRIPE_API_KEY=<<stripeSecretKey>>",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )

    expect(content).toBe("STRIPE_API_KEY=<<stripeSecretKey>>")
    expect(captured).toEqual([])
  })

  test("does not re-capture an existing local reference", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "add header Authorization: Bearer <<local-ref:secret_1>>",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length + 1}`
      }
    )
    expect(content).toBe(
      "add header Authorization: Bearer <<local-ref:secret_1>>"
    )
    expect(captured).toEqual([])
  })

  test("captures a whole cookie value as one secret", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "add header Cookie: session=abc123; theme=dark",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )
    expect(content).toBe("add header Cookie: <<local-ref:secret_1>>")
    expect(captured).toEqual(["session=abc123; theme=dark"])
  })
})

describe("redactSensitiveChatValues", () => {
  test("removes existing request credentials before context leaves the client", () => {
    expect(
      redactSensitiveChatValues(
        "Authorization: Bearer sk_test_Secret\nwebhook=whsec_Secret"
      )
    ).toBe("Authorization: Bearer [REDACTED]\nwebhook=[REDACTED]")
  })

  test("keeps JSON literals after keyword field names and redacts whole cookie values", () => {
    expect(
      redactSensitiveChatValues(
        '{"secret":true,"password":{"type":"string"}}\nCookie: a=1; b=2\nAuthorization: Basic dXNlcjpwYXNz'
      )
    ).toBe(
      '{"secret":true,"password":{"type":"string"}}\nCookie: [REDACTED]\nAuthorization: Basic [REDACTED]'
    )
  })

  test("redacts bare JWTs but leaves prose and short sk- ids alone", () => {
    expect(
      redactSensitiveChatValues(
        "how do I set a bearer token? eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij /sk-123/items"
      )
    ).toBe("how do I set a bearer token? [REDACTED] /sk-123/items")
  })

  test("stays linear on adversarial whitespace", () => {
    const started = Date.now()
    redactSensitiveChatValues(`password${" ".repeat(200_000)}x`)
    expect(Date.now() - started).toBeLessThan(500)
  })

  test("keeps safe environment placeholders visible in request context", () => {
    expect(
      redactSensitiveChatValues("Authorization: Bearer <<stripeSecretKey>>")
    ).toBe("Authorization: Bearer <<stripeSecretKey>>")
  })
})
