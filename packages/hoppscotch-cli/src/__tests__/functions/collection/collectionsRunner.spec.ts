import { vi, describe, test, beforeEach, afterAll, expect } from "vitest";
import { collectionsRunner } from "../../../utils/collections";
import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";
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
// runPreRequestScript should return a Right TaskEither with updated envs.
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

const SAMPLE_HOPP_REQUEST = {
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
  responses: {},
} as unknown as HoppRESTRequest;

const SAMPLE_RESOLVED_RESPONSE = {
  data: { body: 1 },
  status: 200,
  statusText: "OK",
  config: {
    url: "https://example.com",
    supported: true,
    method: "GET",
  },
  headers: {},
} as unknown as AxiosResponse;

const SAMPLE_ENVS = { global: [], selected: [] };

const SAMPLE_COLLECTION = {
  v: 1,
  name: "collection",
  folders: [],
  requests: [SAMPLE_HOPP_REQUEST],
  headers: [],
  auth: { authType: "none", authActive: false },
  variables: [],
};

const SAMPLE_COLLECTION_WITH_FOLDER = {
  v: 1,
  name: "collection",
  folders: [
    {
      v: 1,
      name: "folder",
      folders: [],
      requests: [SAMPLE_HOPP_REQUEST],
      headers: [],
      auth: { authType: "none", authActive: false },
      variables: [],
    },
  ],
  requests: [],
  headers: [],
  auth: { authType: "none", authActive: false },
  variables: [],
};

describe("collectionsRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  test("Empty HoppCollection.", () => {
    return expect(
      collectionsRunner({
        collections: [],
        envs: SAMPLE_ENVS,
        legacySandbox: false,
      })
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
            headers: [],
            auth: { authType: "none", authActive: false },
            variables: [],
          },
        ],
        envs: SAMPLE_ENVS,
        legacySandbox: false,
      })
    ).resolves.toMatchObject([]);
  });

  test("Non-empty requests in collection.", () => {
    (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      SAMPLE_RESOLVED_RESPONSE
    );

    return expect(
      collectionsRunner({
        collections: [SAMPLE_COLLECTION],
        envs: SAMPLE_ENVS,
        legacySandbox: false,
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
    (axios as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      SAMPLE_RESOLVED_RESPONSE
    );

    return expect(
      collectionsRunner({
        collections: [SAMPLE_COLLECTION_WITH_FOLDER],
        envs: SAMPLE_ENVS,
        legacySandbox: false,
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