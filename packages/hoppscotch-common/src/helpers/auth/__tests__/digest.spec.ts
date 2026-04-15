import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockExecute, mockGetI18n, mockGetService } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockGetI18n: vi.fn(),
  mockGetService: vi.fn(),
}))

vi.mock("~/modules/dioc", () => ({
  getService: mockGetService,
}))

vi.mock("~/modules/i18n", () => ({
  getI18n: mockGetI18n,
}))

vi.mock("~/services/kernel-interceptor.service", () => ({
  KernelInterceptorService: vi.fn(),
}))

import { fetchInitialDigestAuthInfo } from "../digest"

const createDigestChallenge = (authHeader: string) => ({
  response: Promise.resolve(
    E.right({
      status: 401,
      headers: {
        "WWW-Authenticate": authHeader,
      },
    })
  ),
})

describe("fetchInitialDigestAuthInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetI18n.mockReturnValue(vi.fn())
    mockGetService.mockReturnValue({
      execute: mockExecute,
    })
  })

  it("parses digest challenges with quoted equals values and qop lists", async () => {
    mockExecute.mockResolvedValue(
      createDigestChallenge(
        'Basic realm="fallback", Digest realm="Protected Area", nonce="abc==", qop="auth,auth-int", opaque="xyz==", algorithm=MD5'
      )
    )

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET")
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "abc==",
      qop: "auth",
      opaque: "xyz==",
      algorithm: "MD5",
    })
  })

  it("normalizes auth-int and md5-sess challenges without opaque", async () => {
    mockExecute.mockResolvedValue(
      createDigestChallenge(
        'realm="Protected Area", nonce="nonce123==", qop="auth-int", algorithm=md5-sess'
      )
    )

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "POST")
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "nonce123==",
      qop: "auth-int",
      opaque: undefined,
      algorithm: "MD5-sess",
    })
  })

  it("ignores preceding schemes with quoted Digest text and keyless tokens", async () => {
    mockExecute.mockResolvedValue(
      createDigestChallenge(
        'Bearer realm="Digest realm required", Digest stale, realm="Protected Area", nonce="nonce123==", qop=auth-conf,auth, algorithm=MD5'
      )
    )

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET")
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "nonce123==",
      qop: "auth",
      opaque: undefined,
      algorithm: "MD5",
    })
  })
})
