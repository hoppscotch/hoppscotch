/**
 * @file Response BDD Status Shortcuts — Missing status range assertions (PM301–PM304)
 *
 * Tests for newly implemented pm.response.to.be shortcuts:
 *   - pm.response.to.be.info        → passes for 1xx status codes (property getter, no parens)
 *   - pm.response.to.be.redirection → passes for 3xx status codes (property getter, no parens)
 *   - pm.response.to.be.error       → passes for 4xx and 5xx status codes (property getter, no parens)
 *   - pm.response.to.be.withBody    → passes when response body is non-empty (property getter, no parens)
 *
 * NOTE: Real Postman scripts access these as property getters WITHOUT parentheses
 * (e.g. `pm.response.to.be.ok`). The assertion fires on property access.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

type TestResponse = { status: number; statusText: string; body: string; headers: { key: string; value: string }[] }

// ─── A1: pm.response.to.be.info (PM301) ────────────────────────────────────
describe("pm.response.to.be.info — 1xx status (PM301)", () => {
  test("passes for 100 Continue", () => {
    const response: TestResponse = { status: 100, statusText: "Continue", body: "", headers: [] }
    return expect(
      runTest(`pm.test("info", () => { pm.response.to.be.info })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ descriptor: "info", expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("passes for 101 Switching Protocols", () => {
    const response: TestResponse = { status: 101, statusText: "Switching Protocols", body: "", headers: [] }
    return expect(
      runTest(`pm.test("info", () => { pm.response.to.be.info })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ descriptor: "info", expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("fails for 200 OK (not 1xx)", () => {
    const response: TestResponse = { status: 200, statusText: "OK", body: "{}", headers: [] }
    return expect(
      runTest(`pm.test("info", () => { pm.response.to.be.info })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "fail", message: expect.any(String) }] })],
    })])
  })
})

// ─── A2: pm.response.to.be.redirection (PM302) ─────────────────────────────
describe("pm.response.to.be.redirection — 3xx status (PM302)", () => {
  test("passes for 301 Moved Permanently", () => {
    const response: TestResponse = { status: 301, statusText: "Moved Permanently", body: "", headers: [] }
    return expect(
      runTest(`pm.test("redir", () => { pm.response.to.be.redirection })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ descriptor: "redir", expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("passes for 302 Found", () => {
    const response: TestResponse = { status: 302, statusText: "Found", body: "", headers: [] }
    return expect(
      runTest(`pm.test("redir", () => { pm.response.to.be.redirection })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("fails for 200 (not 3xx)", () => {
    const response: TestResponse = { status: 200, statusText: "OK", body: "{}", headers: [] }
    return expect(
      runTest(`pm.test("redir", () => { pm.response.to.be.redirection })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "fail", message: expect.any(String) }] })],
    })])
  })
})

// ─── A3: pm.response.to.be.error (PM303) ───────────────────────────────────
describe("pm.response.to.be.error — 4xx or 5xx status (PM303)", () => {
  test("passes for 400 Bad Request", () => {
    const response: TestResponse = { status: 400, statusText: "Bad Request", body: "", headers: [] }
    return expect(
      runTest(`pm.test("err", () => { pm.response.to.be.error })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("passes for 500 Internal Server Error", () => {
    const response: TestResponse = { status: 500, statusText: "Internal Server Error", body: "", headers: [] }
    return expect(
      runTest(`pm.test("err", () => { pm.response.to.be.error })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("fails for 200 OK (not an error)", () => {
    const response: TestResponse = { status: 200, statusText: "OK", body: "{}", headers: [] }
    return expect(
      runTest(`pm.test("err", () => { pm.response.to.be.error })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "fail", message: expect.any(String) }] })],
    })])
  })
})

// ─── A4: pm.response.to.be.withBody (PM304) ────────────────────────────────
describe("pm.response.to.be.withBody — non-empty body (PM304)", () => {
  test("passes when body has content", () => {
    const response: TestResponse = { status: 200, statusText: "OK", body: '{"id":1}', headers: [] }
    return expect(
      runTest(`pm.test("body", () => { pm.response.to.be.withBody })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("fails for empty body", () => {
    const response: TestResponse = { status: 204, statusText: "No Content", body: "", headers: [] }
    return expect(
      runTest(`pm.test("body", () => { pm.response.to.be.withBody })`, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "fail", message: expect.any(String) }] })],
    })])
  })
})

