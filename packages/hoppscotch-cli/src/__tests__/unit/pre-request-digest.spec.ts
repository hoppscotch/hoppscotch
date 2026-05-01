import { Environment, HoppRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetchInitialDigestAuthInfo, mockGenerateDigestAuthHeader } =
  vi.hoisted(() => ({
    mockFetchInitialDigestAuthInfo: vi.fn(),
    mockGenerateDigestAuthHeader: vi.fn(),
  }));

vi.mock("../../utils/auth/digest", () => ({
  fetchInitialDigestAuthInfo: mockFetchInitialDigestAuthInfo,
  generateDigestAuthHeader: mockGenerateDigestAuthHeader,
}));

import { getEffectiveRESTRequest } from "../../utils/pre-request";
import {
  fetchInitialDigestAuthInfo,
  generateDigestAuthHeader,
} from "../../utils/auth/digest";

const DEFAULT_ENV = <Environment>{
  name: "Env",
  variables: [],
};

const DIGEST_HEADER =
  'Digest username="user", realm="realm", nonce="nonce", uri="/", algorithm="MD5", response="response", qop=auth, nc=00000001, cnonce="cnonce"';

const DEFAULT_REQUEST = <HoppRESTRequest>{
  v: "1",
  name: "name",
  method: "GET",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  requestVariables: [],
  responses: {},
  auth: {
    authActive: true,
    authType: "digest",
    username: "user",
    password: "pass",
    realm: "",
    nonce: "user-nonce",
    algorithm: "MD5",
    qop: "",
    nc: "00000001",
    cnonce: "",
    opaque: "",
    disableRetry: false,
  },
  body: {
    contentType: null,
    body: null,
  },
};

describe("CLI digest auth request generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(fetchInitialDigestAuthInfo).mockResolvedValue({
      realm: "realm",
      nonce: "server-nonce",
      qop: "auth",
      algorithm: "MD5",
      opaque: "",
    });
    vi.mocked(generateDigestAuthHeader).mockResolvedValue(DIGEST_HEADER);
  });

  it("uses the user-provided nonce override instead of the fetched nonce", async () => {
    const result = await getEffectiveRESTRequest(DEFAULT_REQUEST, DEFAULT_ENV);

    expect(fetchInitialDigestAuthInfo).toHaveBeenCalledWith(
      "https://example.com",
      "GET",
      false
    );
    expect(generateDigestAuthHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        nonce: "user-nonce",
        qop: "auth",
      })
    );

    expect(E.isRight(result)).toBe(true);

    if (E.isRight(result)) {
      expect(
        result.right.effectiveRequest.effectiveFinalHeaders
      ).toContainEqual(
        expect.objectContaining({
          key: "Authorization",
          value: DIGEST_HEADER,
        })
      );
    }
  });
});
