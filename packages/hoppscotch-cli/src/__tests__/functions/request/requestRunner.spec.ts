import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import axios, { AxiosError, AxiosResponse } from "axios";
import { RequestConfig } from "../../../interfaces/request";
import { requestRunner } from "../../../utils/request";
import { RequestRunnerResponse } from "../../../interfaces/response";

import "@relmify/jest-fp-ts";

vi.mock("axios");

describe("requestRunner", () => {
  let SAMPLE_REQUEST_CONFIG: RequestConfig = {
    url: "https://example.com",
    supported: false,
    method: "GET",
  };

  beforeEach(() => {
    SAMPLE_REQUEST_CONFIG.url = "https://example.com";
    SAMPLE_REQUEST_CONFIG.method = "GET";
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it("Should handle axios-error with response info.", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    vi.mocked(axios).mockRejectedValueOnce(<AxiosError>{
      name: "name",
      message: "message",
      config: SAMPLE_REQUEST_CONFIG,
      isAxiosError: true,
      response: {
        data: "data",
        status: 404,
        statusText: "NOT FOUND",
        headers: [],
        config: SAMPLE_REQUEST_CONFIG,
      },
      toJSON: () => Object({}),
    });

    return expect(
      requestRunner(SAMPLE_REQUEST_CONFIG)()
    ).resolves.toSubsetEqualRight(<RequestRunnerResponse>{
      body: "data",
      status: 404,
    });
  });

  it("Should handle axios-error for unsupported request.", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    vi.mocked(axios).mockRejectedValueOnce(<AxiosError>{
      name: "name",
      message: "message",
      config: SAMPLE_REQUEST_CONFIG,
      isAxiosError: true,
      toJSON: () => Object({}),
    });

    return expect(
      requestRunner(SAMPLE_REQUEST_CONFIG)()
    ).resolves.toSubsetEqualRight(<RequestRunnerResponse>{
      status: 501,
      body: {},
    });
  });

  it("Should handle axios-error with request info.", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    vi.mocked(axios).mockRejectedValueOnce(<AxiosError>{
      name: "name",
      message: "message",
      config: SAMPLE_REQUEST_CONFIG,
      isAxiosError: true,
      request: {},
      toJSON: () => Object({}),
    });

    return expect(requestRunner(SAMPLE_REQUEST_CONFIG)()).resolves.toBeLeft();
  });

  it("Should handle unknown error.", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(false);
    vi.mocked(axios).mockRejectedValueOnce({});

    return expect(requestRunner(SAMPLE_REQUEST_CONFIG)()).resolves.toBeLeft();
  });

  it("Should successfully execute.", () => {
    vi.mocked(axios).mockResolvedValue(<AxiosResponse>{
      data: "data",
      status: 200,
      config: SAMPLE_REQUEST_CONFIG,
      statusText: "OK",
      headers: [],
    });

    return expect(
      requestRunner(SAMPLE_REQUEST_CONFIG)()
    ).resolves.toSubsetEqualRight(<RequestRunnerResponse>{
      status: 200,
      body: "data",
      method: "GET",
    });
  });
});
