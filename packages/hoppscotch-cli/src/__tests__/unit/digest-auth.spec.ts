import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    request: mockRequest,
  },
}));

import { fetchInitialDigestAuthInfo } from "../../utils/auth/digest";

describe("fetchInitialDigestAuthInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses digest challenges with quoted equals values and qop lists", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "www-authenticate":
          'Basic realm="fallback", Digest realm="Protected Area", nonce="abc==", qop="auth,auth-int", opaque="xyz==", algorithm=MD5',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET", false)
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "abc==",
      qop: "auth",
      opaque: "xyz==",
      algorithm: "MD5",
    });
  });

  it("normalizes auth-int and md5-sess challenges without opaque", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "WWW-Authenticate":
          'realm="Protected Area", nonce="nonce123==", qop="auth-int", algorithm=md5-sess',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "POST", false)
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "nonce123==",
      qop: "auth-int",
      opaque: undefined,
      algorithm: "MD5-sess",
    });
  });

  it("ignores preceding schemes with quoted Digest text and keyless tokens", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Bearer realm="Digest realm required", Digest stale, realm="Protected Area", nonce="nonce123==", qop=auth-conf,auth, algorithm=MD5',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET", false)
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "nonce123==",
      qop: "auth",
      opaque: undefined,
      algorithm: "MD5",
    });
  });

  it("skips malformed =value directives without hanging or losing later params", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Digest realm="Protected Area", =badvalue, nonce="nonce123==", qop=auth-conf,auth',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET", false)
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "nonce123==",
      qop: "auth",
      opaque: undefined,
      algorithm: "MD5",
    });
  });

  it("ignores trailing non-digest schemes after valid digest params", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Digest realm="Protected Area", nonce="nonce123==", qop="auth", algorithm=MD5, Basic realm="fallback"',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET", false)
    ).resolves.toEqual({
      realm: "Protected Area",
      nonce: "nonce123==",
      qop: "auth",
      opaque: undefined,
      algorithm: "MD5",
    });
  });

  it("rejects digest challenges with unsupported qop values", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Digest realm="Protected Area", nonce="nonce123==", qop="auth-conf", algorithm=MD5',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET", false)
    ).rejects.toThrow(
      "Failed to parse authentication parameters from WWW-Authenticate header"
    );
  });

  it("rejects digest challenges with unsupported algorithms", async () => {
    mockRequest.mockResolvedValue({
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Digest realm="Protected Area", nonce="nonce123==", qop="auth", algorithm=SHA-256',
      },
    });

    await expect(
      fetchInitialDigestAuthInfo("https://api.example.com/data", "GET", false)
    ).rejects.toThrow(
      "Failed to parse authentication parameters from WWW-Authenticate header"
    );
  });
});
