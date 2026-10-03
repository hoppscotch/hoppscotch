import {
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from "vitest";
import { collectionsRunner } from "../../../utils/collections";
import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";

import "@relmify/jest-fp-ts";

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  const mockAxios = Object.assign(vi.fn(), {
    create: vi.fn(),
    get: vi.fn(),
    request: vi.fn(),
    isAxiosError: vi.fn(),
  });

  mockAxios.create.mockReturnValue(mockAxios);

  return { ...actual, default: mockAxios };
});
vi.mock("axios-cookiejar-support", () => ({
  wrapper: (instance: unknown) => instance,
}));
vi.mock("tough-cookie", () => ({
  CookieJar: vi.fn(),
}));

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
  requestVariables: [],
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
    (axios.create as unknown as Mock).mockReturnValue(axios);
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
            auth: { authActive: false, authType: "none" },
            headers: [],
            variables: [],
            preRequestScript: "",
            testScript: "",
            description: null,
            requests: [],
          },
        ],
        envs: SAMPLE_ENVS,
      })
    ).resolves.toMatchObject([]);
  });

  test("Non-empty requests in collection.", () => {
    (axios as unknown as Mock).mockResolvedValue(SAMPLE_RESOLVED_RESPONSE);

    return expect(
      collectionsRunner({
        collections: [
          {
            v: 1,
            name: "collection",
            folders: [],
            auth: { authActive: false, authType: "none" },
            headers: [],
            variables: [],
            preRequestScript: "",
            testScript: "",
            description: null,
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
    (axios as unknown as Mock).mockResolvedValue(SAMPLE_RESOLVED_RESPONSE);

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
                auth: { authActive: false, authType: "none" },
                headers: [],
                variables: [],
                preRequestScript: "",
                testScript: "",
                description: null,
                requests: [SAMPLE_HOPP_REQUEST],
              },
            ],
            requests: [],
            auth: { authActive: false, authType: "none" },
            headers: [],
            variables: [],
            preRequestScript: "",
            testScript: "",
            description: null,
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
