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
})

describe("redactSensitiveChatValues", () => {
  test("removes existing request credentials before context leaves the client", () => {
    expect(
      redactSensitiveChatValues(
        "Authorization: Bearer sk_test_Secret\nwebhook=whsec_Secret"
      )
    ).toBe("Authorization: [REDACTED]\nwebhook=[REDACTED]")
  })

  test("keeps safe environment placeholders visible in request context", () => {
    expect(
      redactSensitiveChatValues("Authorization: Bearer <<stripeSecretKey>>")
    ).toBe("Authorization: Bearer <<stripeSecretKey>>")
  })
})
