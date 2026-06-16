import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock modules before imports - NO external variable references in factory
// (mirrors the pattern used in hopp-fetch.spec.ts). `axios` needs to be
// callable directly (used by `requestRunner`) as well as expose `create`/
// `isAxiosError` (used by `createHoppFetchHook` inside the scripting sandbox).
vi.mock("axios", () => {
  const mockAxios: any = vi.fn();
  mockAxios.create = vi.fn();
  mockAxios.isAxiosError = vi.fn().mockReturnValue(false);
  return { default: mockAxios };
});

vi.mock("axios-cookiejar-support", () => ({
  wrapper: (instance: any) => instance,
}));

vi.mock("tough-cookie", () => ({
  CookieJar: vi.fn(),
}));

import { makeRESTRequest } from "@hoppscotch/data";
import axios from "axios";

import { processRequest } from "../../utils/request";
import { HoppEnvs } from "../../types/request";

const mockAxios = axios as unknown as ReturnType<typeof vi.fn> & {
  create: ReturnType<typeof vi.fn>;
};

const SAMPLE_REQUEST = makeRESTRequest({
  name: "request",
  method: "GET",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: { authActive: false, authType: "none" },
  body: { contentType: null, body: null },
  requestVariables: [],
  description: null,
  responses: {},
});

describe("processRequest - envs propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAxios.mockResolvedValue({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config: { url: "https://example.com", method: "GET" },
    });
    mockAxios.create.mockReturnValue(vi.fn());
  });

  // Regression: a pre-request script's env mutations were discarded from the
  // value handed back to the collection runner whenever the *test* script
  // that ran afterwards failed (e.g. a runtime error). `processRequest` only
  // wrote `result.envs` from the test-runner's success branch, so a failing
  // test script (or any error after the pre-request step) silently rolled
  // the visible envs back to their pre-pre-request-script state. Downstream
  // requests in the same collection run would then never see variables set
  // by this request, even though the pre-request script itself succeeded.
  test("propagates pre-request-script env mutations even when the test script errors", async () => {
    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      preRequestScript: `pw.env.set("FROM_PRE", "set-by-pre-request");`,
      testScript: `nonExistentFn();`, // throws a ReferenceError at runtime
    });

    const envs: HoppEnvs = { global: [], selected: [] };

    const result = await processRequest({
      request,
      envs,
      path: "fake/path",
      delay: 0,
    })();

    expect(result.report.result).toBe(false);
    expect(
      result.report.errors.some((e) => e.code === "TEST_SCRIPT_ERROR")
    ).toBe(true);

    const fromPre = result.envs.selected.find((v) => v.key === "FROM_PRE");
    expect(fromPre?.currentValue).toBe("set-by-pre-request");
  });

  test("propagates pre-request-script env mutations even when the request itself errors", async () => {
    mockAxios.mockRejectedValue(new Error("network down"));

    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      preRequestScript: `pw.env.set("FROM_PRE", "set-by-pre-request");`,
    });

    const envs: HoppEnvs = { global: [], selected: [] };

    const result = await processRequest({
      request,
      envs,
      path: "fake/path",
      delay: 0,
    })();

    expect(result.report.result).toBe(false);

    const fromPre = result.envs.selected.find((v) => v.key === "FROM_PRE");
    expect(fromPre?.currentValue).toBe("set-by-pre-request");
  });

  test("still reflects the test-script's own env mutations when it succeeds", async () => {
    const request = makeRESTRequest({
      ...SAMPLE_REQUEST,
      preRequestScript: `pw.env.set("FROM_PRE", "set-by-pre-request");`,
      testScript: `pw.env.set("FROM_TEST", "set-by-test-script");`,
    });

    const envs: HoppEnvs = { global: [], selected: [] };

    const result = await processRequest({
      request,
      envs,
      path: "fake/path",
      delay: 0,
    })();

    expect(result.report.result).toBe(true);

    const fromPre = result.envs.selected.find((v) => v.key === "FROM_PRE");
    const fromTest = result.envs.selected.find((v) => v.key === "FROM_TEST");
    expect(fromPre?.currentValue).toBe("set-by-pre-request");
    expect(fromTest?.currentValue).toBe("set-by-test-script");
  });
});
