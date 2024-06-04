import axios from "axios";
import fs from "fs/promises";
import { describe, expect, it, test, vi } from "vitest";

import {
  CollectionSchemaVersion,
  Environment,
  HoppCollection,
  getDefaultRESTRequest,
} from "@hoppscotch/data";

import { DEFAULT_DURATION_PRECISION } from "../../utils/constants";
import {
  getDurationInSeconds,
  getEffectiveFinalMetaData,
  getResourceContents,
} from "../../utils/getters";
import * as mutators from "../../utils/mutators";

import * as workspaceAccessHelpers from "../../utils/workspace-access";

describe("getters", () => {
  describe("getDurationInSeconds", () => {
    const testDurations = [
      { end: [1, 111111111], precision: 1, expected: 1.1 },
      { end: [2, 333333333], precision: 2, expected: 2.33 },
      {
        end: [3, 555555555],
        precision: DEFAULT_DURATION_PRECISION,
        expected: 3.556,
      },
      { end: [4, 777777777], precision: 4, expected: 4.7778 },
    ];

    test.each(testDurations)(
      "($end.0 s + $end.1 ns) rounded-off to $expected",
      ({ end, precision, expected }) => {
        expect(getDurationInSeconds(end as [number, number], precision)).toBe(
          expected
        );
      }
    );
  });

  describe("getEffectiveFinalMetaData", () => {
    const DEFAULT_ENV = <Environment>{
      name: "name",
      variables: [{ key: "PARAM", value: "parsed_param" }],
    };

    test("Empty list of meta-data.", () => {
      expect(getEffectiveFinalMetaData([], DEFAULT_ENV)).toSubsetEqualRight([]);
    });

    test("Non-empty active list of meta-data with unavailable ENV.", () => {
      expect(
        getEffectiveFinalMetaData(
          [
            {
              active: true,
              key: "<<UNKNOWN_KEY>>",
              value: "<<UNKNOWN_VALUE>>",
            },
          ],
          DEFAULT_ENV
        )
      ).toSubsetEqualRight([{ active: true, key: "", value: "" }]);
    });

    test("Inactive list of meta-data.", () => {
      expect(
        getEffectiveFinalMetaData(
          [{ active: false, key: "KEY", value: "<<PARAM>>" }],
          DEFAULT_ENV
        )
      ).toSubsetEqualRight([]);
    });

    test("Active list of meta-data.", () => {
      expect(
        getEffectiveFinalMetaData(
          [{ active: true, key: "PARAM", value: "<<PARAM>>" }],
          DEFAULT_ENV
        )
      ).toSubsetEqualRight([
        { active: true, key: "PARAM", value: "parsed_param" },
      ]);
    });
  });

  describe("getResourceContents", () => {
    describe("Network call failure", () => {
      it("Promise rejects with the code `SERVER_CONNECTION_REFUSED` if the network call fails with the code `ECONNREFUSED`", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "invalid-url";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            code: "ECONNREFUSED",
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "SERVER_CONNECTION_REFUSED",
          data: serverUrl,
        });
      });

      it("Promise rejects with the code `INVALID_SERVER_URL` if the network call fails with the code `ERR_INVALID_URL`", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "htp://example.com";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            code: "ERR_INVALID_URL",
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "INVALID_SERVER_URL",
          data: serverUrl,
        });
      });

      it("Promise rejects with the code `INVALID_SERVER_URL` if the network call succeeds and the received response content type is not `application/json`", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "https://stage-hoppscotch.io";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            message: "INVALID_CONTENT_TYPE",
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "INVALID_SERVER_URL",
          data: serverUrl,
        });
      });

      it("Promise rejects with the code `INVALID_SERVER_URL` if the network call fails with the code `ENOTFOUND`", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "https://stage-hoppscotch.io";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            code: "ENOTFOUND",
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "INVALID_SERVER_URL",
          data: serverUrl,
        });
      });

      it("Promise rejects with the code `INVALID_SERVER_URL` if the network call yields a response with status code of `404`", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "https://stage-hoppscotch.io";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            response: {
              status: 404,
            },
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "INVALID_SERVER_URL",
          data: serverUrl,
        });
      });

      it("Promise rejects with the code `TOKEN_EXPIRED` if the network call fails with the same reason", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "expired-access-token";
        const serverUrl = "https://stage-hoppscotch.io/backend";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            response: {
              data: {
                reason: "TOKEN_EXPIRED",
              },
            },
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "TOKEN_EXPIRED",
          data: accessToken,
        });
      });

      it("Promise rejects with the code `TOKEN_INVALID` if the network call fails with the same reason", () => {
        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "invalid-access-token";
        const serverUrl = "https://stage-hoppscotch.io/backend";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            response: {
              data: {
                reason: "TOKEN_INVALID",
              },
            },
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "TOKEN_INVALID",
          data: accessToken,
        });
      });

      it("Promise rejects with the code `INVALID_ID` if the network call fails with the same reason for a supplied collection ID", () => {
        const pathOrId = "invalid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "https://stage-hoppscotch.io/backend";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            response: {
              data: {
                reason: "INVALID_ID",
              },
            },
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "INVALID_ID",
          data: pathOrId,
        });
      });

      it("Promise rejects with the code `INVALID_ID` if the network call fails with the same reason for a supplied environment ID", () => {
        const pathOrId = "invalid-environment-id";
        const resourceType = "environment";
        const accessToken = "valid-access-token";
        const serverUrl = "https://stage-hoppscotch.io/backend";

        vi.spyOn(axios, "get").mockImplementation(() => {
          return Promise.reject({
            response: {
              data: {
                reason: "INVALID_ID",
              },
            },
          });
        });

        expect(
          getResourceContents({
            pathOrId,
            accessToken,
            serverUrl,
            resourceType,
          })
        ).rejects.toEqual({
          code: "INVALID_ID",
          data: pathOrId,
        });
      });
    });

    describe("Success", () => {
      test("Proceeds with reading from the file system if the supplied file exists in the path", async () => {
        fs.access = vi.fn().mockResolvedValueOnce(undefined);

        const sampleCollectionContents: HoppCollection = {
          v: CollectionSchemaVersion,
          id: "valid-collection-id",
          name: "valid-collection-title",
          folders: [],
          requests: [],
          headers: [],
          auth: {
            authType: "none",
            authActive: false,
          },
        };

        axios.get = vi.fn();

        vi.spyOn(mutators, "readJsonFile").mockImplementation(() =>
          Promise.resolve(sampleCollectionContents)
        );

        const pathOrId = "valid-collection-file-path";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "valid-url";

        const contents = await getResourceContents({
          pathOrId,
          accessToken,
          serverUrl,
          resourceType,
        });

        expect(fs.access).toHaveBeenCalledWith(pathOrId);
        expect(axios.get).not.toBeCalled();
        expect(mutators.readJsonFile).toHaveBeenCalledWith(pathOrId, true);

        expect(contents).toEqual(sampleCollectionContents);
      });

      test("Proceeds with the network call if a value for the access token is specified and the supplied path/id is not a valid file path", async () => {
        fs.access = vi.fn().mockRejectedValueOnce(undefined);

        const sampleCollectionContents: HoppCollection = {
          v: CollectionSchemaVersion,
          name: "test-coll",
          folders: [],
          requests: [getDefaultRESTRequest()],
          headers: [],
          auth: {
            authType: "none",
            authActive: false,
          },
        };

        axios.get = vi.fn().mockImplementation(() =>
          Promise.resolve({
            data: {
              id: "clx06ik0o00028t6uwywwnxgg",
              data: null,
              title: "test-coll",
              parentID: null,
              folders: [],
              requests: [
                {
                  id: "clx06imin00038t6uynt5vyk4",
                  collectionID: "clx06ik0o00028t6uwywwnxgg",
                  teamID: "clwt6r6j10031kc6pu0b08y6e",
                  title: "req1",
                  request:
                    '{"v":"4","auth":{"authType":"inherit","authActive":true},"body":{"body":null,"contentType":null},"name":"req1","method":"GET","params":[],"headers":[],"endpoint":"https://echo.hoppscotch.io","testScript":"","preRequestScript":"","requestVariables":[]}',
                },
              ],
            },
            headers: {
              "content-type": "application/json",
            },
          })
        );

        vi.spyOn(mutators, "readJsonFile").mockImplementation(() =>
          Promise.resolve(sampleCollectionContents)
        );

        vi.spyOn(
          workspaceAccessHelpers,
          "transformWorkspaceCollection"
        ).mockImplementation(() => sampleCollectionContents);

        const pathOrId = "valid-collection-id";
        const resourceType = "collection";
        const accessToken = "valid-access-token";
        const serverUrl = "valid-url";

        await getResourceContents({
          pathOrId,
          accessToken,
          serverUrl,
          resourceType,
        });

        expect(fs.access).toHaveBeenCalledWith(pathOrId);
        expect(axios.get).toBeCalledWith(
          `${serverUrl}/v1/access-tokens/${resourceType}/${pathOrId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        expect(
          workspaceAccessHelpers.transformWorkspaceCollection
        ).toBeCalled();
        expect(mutators.readJsonFile).not.toHaveBeenCalled();
      });
    });
  });
});
