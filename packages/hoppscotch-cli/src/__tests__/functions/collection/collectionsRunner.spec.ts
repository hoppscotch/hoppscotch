import { describe, test, expect, beforeEach, afterAll, vi } from "vitest";
import { collectionsRunner } from "../../../utils/collections";
import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";

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

const SAMPLE_HOPP_REQUEST = <HoppRESTRequest>{
  v: "1",
  name: "request",
  method: "GET",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: {
    authActive: false,
    authType: "none",
  },
  body: {
    contentType: null,
    body: null,
  },
};

const SAMPLE_RESOLVED_RESPONSE = <AxiosResponse>{
  data: { body: 1 },
  status: 200,
  statusText: "OK",
  config: {
    url: "https://example.com",
    supported: true,
    method: "GET",
  },
  headers: [],
};

const SAMPLE_ENVS = { global: [], selected: [] };

describe("collectionsRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  test("Empty HoppCollection.", () => {
    return expect(
      collectionsRunner({ collections: [], envs: SAMPLE_ENVS })
    ).resolves.toStrictEqual([]);
  });

  test("Empty requests and folders in collection.", () => {
    return expect(
      collectionsRunner({
        collections: [
          {
            v: 1,
            name: "name",
            folders: [],
            requests: [],
          },
        ],
        envs: SAMPLE_ENVS,
      })
    ).resolves.toMatchObject([]);
  });

  test("Non-empty requests in collection.", () => {
    vi.mocked(axios).mockResolvedValue(SAMPLE_RESOLVED_RESPONSE);

    return expect(
      collectionsRunner({
        collections: [
          {
            v: 1,
            name: "collection",
            folders: [],
            requests: [SAMPLE_HOPP_REQUEST],
          },
        ],
        envs: SAMPLE_ENVS,
      })
    ).resolves.toMatchObject([
      {
        path: "collection/request",
        tests: [],
        errors: [],
        result: true,
      },
    ]);
  });

  test("Non-empty folders in collection.", () => {
    vi.mocked(axios).mockResolvedValue(SAMPLE_RESOLVED_RESPONSE);

    return expect(
      collectionsRunner({
        collections: [
          {
            v: 1,
            name: "collection",
            folders: [
              {
                v: 1,
                name: "folder",
                folders: [],
                requests: [SAMPLE_HOPP_REQUEST],
              },
            ],
            requests: [],
          },
        ],
        envs: SAMPLE_ENVS,
      })
    ).resolves.toMatchObject([
      {
        path: "collection/folder/request",
        tests: [],
        errors: [],
        result: true,
      },
    ]);
  });
});
