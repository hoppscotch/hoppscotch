/**
 * Regression tests for the env-propagation bug in processRequest.
 *
 * Root cause (fixed in utils/request.ts):
 *   `result.envs` was initialised to the raw `params.envs` and only
 *   overwritten inside the test-runner *success* branch.  When the test
 *   script threw (E.isLeft), `result.envs` was never updated, so env
 *   mutations written by the pre-request script were silently discarded.
 *   The *next* request in the collection therefore received the stale,
 *   pre-run environment.
 *
 * Fix: assign `result.envs = updatedEnvs` immediately after the
 * pre-request script succeeds, before the test runner runs.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";
import { makeCollection, makeRESTRequest } from "@hoppscotch/data";

// vi.hoisted runs before module import hoisting so the variable is available
// inside vi.mock factory closures.
const { mockAxiosCallable } = vi.hoisted(() => {
  const mockAxiosCallable = vi.fn();
  return { mockAxiosCallable };
});

// `requestRunner` in utils/request.ts calls `axios(config)` directly, so the
// default export must be a callable function.  hopp-fetch.ts calls
// `axios.create()`, so that method must also exist.
vi.mock("axios", () => ({
  default: Object.assign(mockAxiosCallable, {
    create: vi.fn().mockReturnValue(vi.fn()),
    isAxiosError: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock("axios-cookiejar-support", () => ({
  wrapper: (instance: any) => instance,
}));

vi.mock("tough-cookie", () => ({
  CookieJar: vi.fn(),
}));

import axios, { AxiosResponse } from "axios";
import { collectionsRunner } from "../../utils/collections";
import { processRequest } from "../../utils/request";
import { HoppEnvs } from "../../types/request";

const MOCK_200: AxiosResponse = {
  data: {},
  status: 200,
  statusText: "OK",
  config: { url: "https://example.com", method: "GET" } as any,
  headers: {},
  request: {},
};

const EMPTY_ENVS: HoppEnvs = { global: [], selected: [] };

describe("processRequest – env propagation on test-script failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosCallable.mockResolvedValue(MOCK_200);
    (axios as any).create.mockReturnValue(vi.fn());
    (axios as any).isAxiosError.mockReturnValue(false);
  });

  test("env variable set in pre-request script is present in result.envs even when test script fails", async () => {
    const request = makeRESTRequest({
      name: "req",
      method: "GET",
      endpoint: "https://example.com",
      params: [],
      headers: [],
      // pre-request sets a variable
      preRequestScript: `pw.env.set("TOKEN", "abc123");`,
      // test script references an undeclared variable — should throw ReferenceError
      testScript: `undeclaredVariableThatDoesNotExist;`,
      auth: { authActive: false, authType: "none" },
      body: { contentType: null, body: null },
      requestVariables: [],
      description: null,
      responses: {},
    });

    const result = await processRequest({
      request,
      envs: EMPTY_ENVS,
      path: "test/req",
      delay: 0,
      legacySandbox: false,
    })();

    // The request itself fails (test error), but the pre-request env mutation
    // must still be visible so the next request in the collection can use it.
    const tokenVar = result.envs.selected.find((v) => v.key === "TOKEN");
    expect(tokenVar).toBeDefined();
    expect(tokenVar?.currentValue).toBe("abc123");
  });

  test("env variable from pre-request propagates to next sequential request even when the first request's test script fails", async () => {
    // Request 1: sets TOKEN via pre-request, has a broken test script
    const req1 = makeRESTRequest({
      name: "set-token",
      method: "GET",
      endpoint: "https://example.com",
      params: [],
      headers: [],
      preRequestScript: `pw.env.set("TOKEN", "secret");`,
      testScript: `undeclaredVariableThatDoesNotExist;`,  // fails
      auth: { authActive: false, authType: "none" },
      body: { contentType: null, body: null },
      requestVariables: [],
      description: null,
      responses: {},
    });

    // Request 2: uses TOKEN in a passing test — only passes if TOKEN propagated
    const req2 = makeRESTRequest({
      name: "use-token",
      method: "GET",
      endpoint: "https://example.com",
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: `
        pw.test("TOKEN is propagated from previous request", () => {
          pw.expect(pw.env.get("TOKEN")).toBe("secret");
        });
      `,
      auth: { authActive: false, authType: "none" },
      body: { contentType: null, body: null },
      requestVariables: [],
      description: null,
      responses: {},
    });

    const collection = makeCollection({
      name: "col",
      folders: [],
      requests: [req1 as any, req2 as any],
      headers: [],
      auth: { authActive: false, authType: "none" },
      variables: [],
    });

    const reports = await collectionsRunner({
      collections: [collection],
      envs: EMPTY_ENVS,
    });

    expect(reports).toHaveLength(2);

    const req1Report = reports[0];
    const req2Report = reports[1];

    // First request fails because of the broken test script
    expect(req1Report.result).toBe(false);

    // Second request's test should pass — TOKEN must have propagated despite req1 failing
    expect(req2Report.result).toBe(true);
    expect(req2Report.errors).toHaveLength(0);
    expect(
      req2Report.tests.some(
        (t) =>
          t.descriptor === "TOKEN is propagated from previous request" &&
          t.failed === 0 &&
          t.passed === 1
      )
    ).toBe(true);
  });
});
