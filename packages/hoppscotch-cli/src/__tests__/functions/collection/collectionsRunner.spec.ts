import { collectionsRunner } from "../../../utils/collections";
import { HoppRESTRequest } from "@hoppscotch/data";
import axios, { AxiosResponse } from "axios";

import "@relmify/jest-fp-ts";

jest.mock("axios");

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

describe("collectionsRunner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("Empty HoppCollection.", () => {
    return expect(collectionsRunner([])()).resolves.toStrictEqual([]);
  });

  test("Empty requests and folders in collection.", () => {
    return expect(
      collectionsRunner([
        {
          v: 1,
          name: "name",
          folders: [],
          requests: [],
        },
      ])()
    ).resolves.toMatchObject([]);
  });

  test("Non-empty requests in collection.", () => {
    (axios as unknown as jest.Mock).mockResolvedValue(SAMPLE_RESOLVED_RESPONSE);

    return expect(
      collectionsRunner([
        {
          v: 1,
          name: "collection",
          folders: [],
          requests: [SAMPLE_HOPP_REQUEST],
        },
      ])()
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
    (axios as unknown as jest.Mock).mockResolvedValue(SAMPLE_RESOLVED_RESPONSE);

    return expect(
      collectionsRunner([
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
      ])()
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
