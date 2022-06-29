import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";
import { processRequest } from "../../../utils/request";
import { HoppEnvs } from "../../../types/request";

import "@relmify/jest-fp-ts";

jest.mock("axios");

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
    jest.clearAllMocks();
  });

  afterEach(() => {
    SAMPLE_REQUEST = DEFAULT_REQUEST;
  });

  test("With empty envs for 'true' result.", () => {
    (axios as unknown as jest.Mock).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest(SAMPLE_REQUEST, DEFAULT_ENVS, "fake/collection/path")()
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

    (axios as unknown as jest.Mock).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest(SAMPLE_REQUEST, DEFAULT_ENVS, "fake/collection/path")()
    ).resolves.toMatchObject({
      envs: {
        selected: [{ key: "ENDPOINT", value: "https://example.com" }],
      },
      report: {
        result: true,
      },
    });
  });

  test("With invalid-pre-request-script.", () => {
    SAMPLE_REQUEST.preRequestScript = `invalid`;

    (axios as unknown as jest.Mock).mockResolvedValue(DEFAULT_RESPONSE);

    return expect(
      processRequest(SAMPLE_REQUEST, DEFAULT_ENVS, "fake/request/path")()
    ).resolves.toMatchObject({
      report: { result: false },
    });
  });
});
