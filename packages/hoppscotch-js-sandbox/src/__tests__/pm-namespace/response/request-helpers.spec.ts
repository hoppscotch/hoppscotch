/**
 * @file Request Helpers — Headers, Body & URL utilities (PM310–PM312)
 *
 * Tests for newly implemented request-side helper methods (pre-request + test scripts):
 *   - pm.request.headers.one(key)       → alias for get(key)  (PM310)
 *   - pm.request.body.isEmpty()         → true when body is null/empty  (PM311)
 *   - pm.request.url.getOAuth1BaseUrl() → URL without query string  (PM312)
 */

import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"
import type { HoppRESTRequest } from "@hoppscotch/data"

type TestResponse = { status: number; statusText: string; body: string; headers: { key: string; value: string }[] }

const mockResponse: TestResponse = { status: 200, statusText: "OK", body: "{}", headers: [] }

const mockRequest = (overrides: Partial<HoppRESTRequest> = {}): HoppRESTRequest => ({
  v: "2",
  id: "test-req",
  name: "Test Request",
  method: "POST",
  endpoint: "https://api.example.com/users?role=admin",
  params: [],
  headers: [
    { key: "Content-Type", value: "application/json", active: true, description: "" },
    { key: "Authorization", value: "Bearer token123", active: true, description: "" },
  ],
  preRequestScript: "",
  testScript: "",
  auth: { authType: "none", authActive: false },
  body: { contentType: "application/json", body: '{"name":"alice"}' },
  requestVariables: [],
  ...overrides,
} as unknown as HoppRESTRequest)

// ─── D1: pm.request.headers.one(key) (PM310) ───────────────────────────────
describe("pm.request.headers.one(key) — PM310", () => {
  test("returns value for existing header in test script", () => {
    return expect(
      runTest(`
        pm.test("headers one", () => {
          const val = pm.request.headers.one("Authorization")
          pm.expect(val).to.equal("Bearer token123")
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns null for missing header in test script", () => {
    return expect(
      runTest(`
        pm.test("headers one missing", () => {
          const val = pm.request.headers.one("X-Not-Here")
          pm.expect(val).to.be.null
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns value for existing header in pre-request script", () => {
    return expect(
      runPreRequest(`
        const val = pm.request.headers.one("Content-Type")
        pm.environment.set("ct", val || "missing")
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: [expect.objectContaining({ key: "ct", currentValue: "application/json" })],
    }))
  })
})

// ─── D2: pm.request.body.isEmpty() (PM311) ─────────────────────────────────
describe("pm.request.body.isEmpty() — PM311", () => {
  test("returns false for a request with a JSON body in test script", () => {
    return expect(
      runTest(`
        pm.test("body not empty", () => {
          pm.expect(pm.request.body.isEmpty()).to.be.false
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns false for a request with body in pre-request script", () => {
    return expect(
      runPreRequest(`
        const empty = pm.request.body.isEmpty()
        pm.environment.set("isEmpty", String(empty))
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: [expect.objectContaining({ key: "isEmpty", currentValue: "false" })],
    }))
  })
})

// ─── D3: pm.request.url.getOAuth1BaseUrl() (PM312) ─────────────────────────
describe("pm.request.url.getOAuth1BaseUrl() — PM312", () => {
  test("returns URL without query string in test script", () => {
    return expect(
      runTest(`
        pm.test("oauth1 base url", () => {
          const base = pm.request.url.getOAuth1BaseUrl()
          pm.expect(base).to.equal("https://api.example.com/users")
          pm.expect(base).to.not.include("?")
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })

  test("returns URL without query string in pre-request script", () => {
    return expect(
      runPreRequest(`
        const base = pm.request.url.getOAuth1BaseUrl()
        pm.environment.set("baseUrl", base)
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: [expect.objectContaining({ key: "baseUrl", currentValue: "https://api.example.com/users" })],
    }))
  })
})

