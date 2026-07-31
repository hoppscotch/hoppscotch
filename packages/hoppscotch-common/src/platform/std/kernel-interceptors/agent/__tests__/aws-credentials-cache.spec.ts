import { describe, expect, test } from "vitest"

import {
  awsCredentialsCacheExpiry,
  awsCredentialsCacheKey,
} from "../aws-credentials-cache"

const NOW = Date.parse("2024-01-01T12:00:00Z")
const MIN = 60 * 1000

describe("awsCredentialsCacheExpiry", () => {
  test("expires 5 minutes before a valid expiration", () => {
    const expiration = new Date(NOW + 60 * MIN).toISOString()
    expect(awsCredentialsCacheExpiry(expiration, NOW)).toBe(NOW + 55 * MIN)
  })

  test("falls back to a 5-minute TTL when expiration is null", () => {
    expect(awsCredentialsCacheExpiry(null, NOW)).toBe(NOW + 5 * MIN)
  })

  test("falls back to a 5-minute TTL when expiration is unparseable", () => {
    expect(awsCredentialsCacheExpiry("not-a-date", NOW)).toBe(NOW + 5 * MIN)
  })

  test("yields a past timestamp for credentials expiring within the skew window", () => {
    // Expires in 2 minutes — inside the 5-minute skew, so it must never be
    // served from cache (expiry <= now).
    const expiration = new Date(NOW + 2 * MIN).toISOString()
    expect(awsCredentialsCacheExpiry(expiration, NOW)).toBeLessThan(NOW)
  })
})

describe("awsCredentialsCacheKey", () => {
  test("distinguishes regions for the same profile", () => {
    expect(awsCredentialsCacheKey("prod", "us-east-1")).not.toBe(
      awsCredentialsCacheKey("prod", "eu-west-1")
    )
  })

  test("treats a missing region as empty", () => {
    expect(awsCredentialsCacheKey("prod")).toBe(
      awsCredentialsCacheKey("prod", "")
    )
  })

  test("does not collide across different profiles", () => {
    expect(awsCredentialsCacheKey("prod")).not.toBe(
      awsCredentialsCacheKey("dev")
    )
  })
})
