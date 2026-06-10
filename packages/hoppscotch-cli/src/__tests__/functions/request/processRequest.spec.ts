import { vi, describe, test, beforeEach, afterEach, expect } from "vitest";
import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";
import { processRequest } from "../../../utils/request";
import { HoppEnvs } from "../../../types/request";
import * as E from "fp-ts/Either";

// Mock axios with create() for hopp-fetch
vi.mock("axios", () => ({
  default: Object.assign(vi.fn(), {
    isAxiosError: vi.fn(),
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  }),
}));

// Mock cookie support (used by hopp-fetch.ts)
vi.mock("axios-cookiejar-support", () => ({
  wrapper: (instance: any) => instance,
}));

vi.mock("tough-cookie", () => ({
  CookieJar: vi.fn(),
}));

// Mock the js-sandbox so we don't spin up a real QuickJS VM.
vi.mock("@hoppscotch/js-sandbox/node", () => ({
  runPreRequestScript: vi.fn((_script: string, params: any) => async () =>
    E.right({
      updatedEnvs: params.envs,
      updatedRequest: {},
    })
  ),
  runTestScript: vi.fn((_script: string, params: any) => async () =>
    E.right({
      envs: params.envs,
      tests: [],
    })
  ),
}));

vi.mock("@hoppscotch/js-sandbox/scripting", () => ({
  combineScriptsWithIIFE: vi.fn(
    (scripts: string[]) => scripts.filter(Boolean).join("\n")
  ),
  filterValidScripts: vi.fn((scripts: string[]) =>
    scripts.filter((s: string) => s && s.trim() !== "")
  ),
}));

const DEFAULT_REQUEST = {
  v: "1",
  name: "name",
  method: "POST",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: {
    authType: "none",
    authActive: false,
  },
  body: {
    contentType: null,
    body: null,
  },
  requestVariables: [],
  responses: {},
} as unknown as HoppRESTRequest;

const DEFAULT_RESPONSE = {
  data: {},
  status: 200,
  config: {
    url: "https://example.com",
    supported: true,
    method: "POST",
  },
  statusText: "OK",
  headers: {},
} as unknown as AxiosResponse;

const DEFAULT_ENVS = {
  global: [],
  selected: [],
} as unknown as HoppEnvs;

describe("processRequest", () => {
  let SAMPLE_REQUEST: HoppRESTRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    // Deep-clone default request so mutations in one test don't leak to others
    SAMPLE_REQUEST = JSON.parse(JSON.stringify(DEFAULT_REQUEST)) as HoppRESTRequest;
  });

  afterEach(() => {
    // no-op
  });

  test("With empty envs for 'true' result.", () => {
    (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest({
        request: SAMPLE_REQUEST,
        envs: DEFAULT_ENVS,
        path: "fake/collection/path",
        delay: 0,
      })()
    ).resolves.toMatchObject({
      report: {
        result: true,
      },
    });
  });

  test("With non-empty envs, pre-request-script and test-script.", async () => {
    SAMPLE_REQUEST.preRequestScript = `
      pw.env.set("ENDPOINT", "https://example.com");
    `;
    SAMPLE_REQUEST.testScript = `
      pw.test("check status.", () => {
        pw.expect(pw.response.status).toBe(200);
      });
    `;

    // Override the mock to simulate env being set by pre-request script
    const { runPreRequestScript } = await import("@hoppscotch/js-sandbox/node");
    (runPreRequestScript as ReturnType<typeof vi.fn>).mockImplementation(
      (_script: string, params: any) => async () =>
        E.right({
          updatedEnvs: {
            global: params.envs.global,
            selected: [
              ...params.envs.selected,
              { key: "ENDPOINT", value: "https://example.com" },
            ],
          },
          updatedRequest: {},
        })
    );

    (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest({
        request: SAMPLE_REQUEST,
        envs: DEFAULT_ENVS,
        path: "fake/collection/path",
        delay: 0,
      })()
    ).resolves.toMatchObject({
      envs: {
        selected: [{ key: "ENDPOINT", value: "https://example.com" }],
      },
      report: {
        result: true,
      },
    });
  });

  test("With invalid-pre-request-script.", async () => {
    SAMPLE_REQUEST.preRequestScript = `invalid`;

    // Override mock to simulate pre-request script failure
    const { runPreRequestScript } = await import("@hoppscotch/js-sandbox/node");
    (runPreRequestScript as ReturnType<typeof vi.fn>).mockImplementation(
      () => async () =>
        E.left("PRE_REQUEST_SCRIPT_ERROR" as any)
    );

    (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest({
        request: SAMPLE_REQUEST,
        envs: DEFAULT_ENVS,
        path: "fake/request/path",
        delay: 0,
      })()
    ).resolves.toMatchObject({
      report: { result: false },
    });
  });
});