/**
 * @file Response Helpers — Headers, Cookies, Body & Test Utilities (PM305–PM315)
 *
 * Tests for newly implemented response-side helper methods:
 *   Headers  (PM305–PM308): toObject(), each(), one(), count()
 *   Cookies  (PM309):       each()
 *   Body     (PM313–PM314): blob(), toJSON()
 *   Test     (PM315):       pm.test.index()
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

type TestResponse = { status: number; statusText: string; body: string; headers: { key: string; value: string }[] }

const baseResponse: TestResponse = {
  status: 200,
  statusText: "OK",
  body: '{"id":1,"name":"alice"}',
  headers: [
    { key: "Content-Type", value: "application/json" },
    { key: "X-Request-Id", value: "req-abc" },
    { key: "Cache-Control", value: "no-cache" },
  ],
}

// ─── B1: pm.response.headers.toObject() (PM305) ────────────────────────────
describe("pm.response.headers.toObject() — PM305", () => {
  test("returns an object with lowercased header keys", () => {
    return expect(
      runTest(`
        pm.test("toObject", () => {
          const obj = pm.response.headers.toObject()
          pm.expect(obj).to.be.an("object")
          pm.expect(obj["content-type"]).to.equal("application/json")
          pm.expect(obj["x-request-id"]).to.equal("req-abc")
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }, { status: "pass", message: expect.any(String) }, { status: "pass", message: expect.any(String) }] })],
    })])
  })
})

// ─── B2: pm.response.headers.each(fn) (PM306) ──────────────────────────────
describe("pm.response.headers.each(fn) — PM306", () => {
  test("iterates over all response headers", () => {
    return expect(
      runTest(`
        pm.test("each", () => {
          const keys = []
          pm.response.headers.each(h => keys.push(h.key))
          pm.expect(keys.length).to.equal(3)
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })
})

// ─── B3: pm.response.headers.one(key) (PM307) ──────────────────────────────
describe("pm.response.headers.one(key) — PM307", () => {
  test("returns header value for existing key", () => {
    return expect(
      runTest(`
        pm.test("one", () => {
          const val = pm.response.headers.one("Content-Type")
          pm.expect(val).to.equal("application/json")
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns undefined for missing key", () => {
    return expect(
      runTest(`
        pm.test("one missing", () => {
          const val = pm.response.headers.one("X-Does-Not-Exist")
          pm.expect(val).to.be.undefined
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })
})

// ─── B4: pm.response.headers.count() (PM308) ───────────────────────────────
describe("pm.response.headers.count() — PM308", () => {
  test("returns the correct number of headers", () => {
    return expect(
      runTest(`
        pm.test("count", () => {
          pm.expect(pm.response.headers.count()).to.equal(3)
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })
})

// ─── C1: pm.response.cookies.each(fn) (PM309) ──────────────────────────────
describe("pm.response.cookies.each(fn) — PM309", () => {
  const cookieResponse: TestResponse = {
    status: 200,
    statusText: "OK",
    body: "{}",
    headers: [
      { key: "Set-Cookie", value: "session=abc123; Path=/; HttpOnly" },
      { key: "Set-Cookie", value: "theme=dark; Path=/" },
    ],
  }

  test("iterates over all response cookies", () => {
    return expect(
      runTest(`
        pm.test("cookies each", () => {
          const keys = []
          pm.response.cookies.each(c => keys.push(c.key))
          pm.expect(keys.length).to.equal(2)
          pm.expect(keys).to.include("session")
          pm.expect(keys).to.include("theme")
        })
      `, { global: [], selected: [] }, cookieResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })
})

// ─── E1: pm.response.blob() (PM313) ────────────────────────────────────────
describe("pm.response.blob() — PM313", () => {
  test("does not throw and returns a value", () => {
    return expect(
      runTest(`
        pm.test("blob", () => {
          const b = pm.response.blob()
          pm.expect(b).to.not.be.null
          pm.expect(b).to.not.be.undefined
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })
})

// ─── E2: pm.response.toJSON() (PM314) ──────────────────────────────────────
describe("pm.response.toJSON() — PM314", () => {
  test("returns plain object with code, status, headers, body", () => {
    return expect(
      runTest(`
        pm.test("toJSON", () => {
          const r = pm.response.toJSON()
          pm.expect(r).to.be.an("object")
          pm.expect(r.code).to.equal(200)
          pm.expect(r.status).to.equal("OK")
          pm.expect(r.headers).to.be.an("array")
          pm.expect(r.body).to.be.a("string")
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })
})

// ─── F1: pm.test.index() (PM315) ───────────────────────────────────────────
describe("pm.test.index() — PM315", () => {
  test("returns incrementing index for each call", () => {
    return expect(
      runTest(`
        pm.test("index check", () => {
          const i0 = pm.test.index()
          const i1 = pm.test.index()
          pm.expect(typeof i0).to.equal("number")
          pm.expect(i1).to.be.greaterThan(i0)
        })
      `, { global: [], selected: [] }, baseResponse)()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })
})

