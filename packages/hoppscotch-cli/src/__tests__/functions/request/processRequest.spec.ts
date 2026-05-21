import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";
import { processRequest } from "../../../utils/request";
import { HoppEnvs } from "../../../types/request";

import "@relmify/jest-fp-ts";

vi.mock("axios", () => {
  const mockAxios: any = vi.fn();
  mockAxios.create = vi.fn(() => mockAxios);
  mockAxios.interceptors = {
    request: { use: vi.fn(), eject: vi.fn(), handlers: [] },
    response: { use: vi.fn(), eject: vi.fn(), handlers: [] },
  };
  mockAxios.isAxiosError = vi.fn();
  return {
    default: mockAxios,
    isAxiosError: mockAxios.isAxiosError,
  };
});

const DEFAULT_REQUEST = <HoppRESTRequest>{
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
};

const DEFAULT_RESPONSE = <AxiosResponse>{
  data: {},
  status: 200,
  config: {
    url: "https://example.com",
    supported: true,
    method: "POST",
  },
  statusText: "OK",
  headers: [],
};

const DEFAULT_ENVS = <HoppEnvs>{
  global: [],
  selected: [],
};

describe("processRequest", () => {
  let SAMPLE_REQUEST = DEFAULT_REQUEST;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    SAMPLE_REQUEST = DEFAULT_REQUEST;
  });

  test("With empty envs for 'true' result.", () => {
    vi.mocked(axios).mockResolvedValue(DEFAULT_RESPONSE);

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

  test("With non-empty envs, pre-request-script and test-script.", () => {
    SAMPLE_REQUEST.preRequestScript = `
			pw.env.set("ENDPOINT", "https://example.com");
		`;
    SAMPLE_REQUEST.testScript = `
			pw.test("check status.", () => {
				pw.expect(pw.response.status).toBe(200);
			});
		`;

    vi.mocked(axios).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest({
        request: SAMPLE_REQUEST,
        envs: DEFAULT_ENVS,
        path: "fake/collection/path",
        delay: 0,
      })()
    ).resolves.toMatchObject({
      envs: {
        selected: [{ key: "ENDPOINT", currentValue: "https://example.com" }],
      },
      report: {
        result: true,
      },
    });
  });

  test("With invalid-pre-request-script.", () => {
    SAMPLE_REQUEST.preRequestScript = `invalid`;

    vi.mocked(axios).mockResolvedValue(DEFAULT_RESPONSE);

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
