import axios, { AxiosError, AxiosResponse } from "axios";
import fs from "fs/promises";
import { describe, expect, test, vi } from "vitest";

import {
  CollectionSchemaVersion,
  HoppCollection,
  getDefaultRESTRequest,
} from "@hoppscotch/data";

import { DEFAULT_DURATION_PRECISION } from "../../utils/constants";
import {
  getDurationInSeconds,
  getEffectiveFinalMetaData,
  getResolvedVariables,
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
    const environmentVariables = [
      {
        key: "PARAM",
        initialValue: "parsed_param",
        currentValue: "parsed_param",
        secret: false,
      },
    ];

    test("Empty list of meta-data", () => {
      expect(
        getEffectiveFinalMetaData([], environmentVariables)
      ).toSubsetEqualRight([]);
    });

    test("Non-empty active list of meta-data with unavailable ENV", () => {
      expect(
        getEffectiveFinalMetaData(
          [
            {
              active: true,
              key: "<<UNKNOWN_KEY>>",
              value: "<<UNKNOWN_VALUE>>",
              description: "",
            },
          ],
          environmentVariables
        )
      ).toSubsetEqualRight([{ active: true, key: "", value: "" }]);
    });

    test("Inactive list of meta-data", () => {
      expect(
        getEffectiveFinalMetaData(
          [{ active: false, key: "KEY", value: "<<PARAM>>", description: "" }],
          environmentVariables
        )
      ).toSubsetEqualRight([]);
    });

    test("Active list of meta-data", () => {
      expect(
        getEffectiveFinalMetaData(
          [{ active: true, key: "PARAM", value: "<<PARAM>>", description: "" }],
          environmentVariables
        )
      ).toSubsetEqualRight([
        { active: true, key: "PARAM", value: "parsed_param" },
      ]);
    });
  });

  describe("getResourceContents", () => {
    describe("Network call failure", () => {
      const args = {
        pathOrId: "test-collection-id-or-path",
        resourceType: "collection" as const,
        accessToken: "test-token",
        serverUrl: "test-url",
      };

      const cases = [
        {
          description:
            "Promise rejects with the code `SERVER_CONNECTION_REFUSED` if the network call fails with the code `ECONNREFUSED`",
          args,
          axiosMock: {
            code: "ECONNREFUSED",
          },
          expected: {
            code: "SERVER_CONNECTION_REFUSED",
            data: args.serverUrl,
          },
        },
        {
          description:
            "Promise rejects with the code `INVALID_SERVER_URL` if the network call fails with the code `ERR_INVALID_URL`",
          args,
          axiosMock: {
            code: "ERR_INVALID_URL",
          },
          expected: {
            code: "INVALID_SERVER_URL",
            data: args.serverUrl,
          },
        },
        {
          description:
            "Promise rejects with the code `INVALID_SERVER_URL` if the network call fails with the code `ENOTFOUND`",
          args,
          axiosMock: {
            code: "ENOTFOUND",
          },
          expected: {
            code: "INVALID_SERVER_URL",
            data: args.serverUrl,
          },
        },
        {
          description:
            "Promise rejects with the code `INVALID_SERVER_URL` if the network call returns a response with a status code of `404`",
          args,
          axiosMock: {
            response: {
              status: 404,
            },
          },
          expected: {
            code: "INVALID_SERVER_URL",
            data: args.serverUrl,
          },
        },
        {
          description:
            "Promise rejects with the code `TOKEN_EXPIRED` if the network call fails for the same reason",
          args,
          axiosMock: {
            response: {
              data: {
                reason: "TOKEN_EXPIRED",
              },
            },
          },
          expected: {
            code: "TOKEN_EXPIRED",
            data: args.accessToken,
          },
        },
        {
          description:
            "Promise rejects with the code `TOKEN_INVALID` if the network call fails for the same reason",
          args,
          axiosMock: {
            response: {
              data: {
                reason: "TOKEN_INVALID",
              },
            },
          },
          expected: {
            code: "TOKEN_INVALID",
            data: args.accessToken,
          },
        },
        {
          description:
            "Promise rejects with the code `INVALID_ID` if the network call fails for the same reason when the supplied collection ID or path is invalid",
          args,
          axiosMock: {
            response: {
              data: {
                reason: "INVALID_ID",
              },
            },
          },
          expected: {
            code: "INVALID_ID",
            data: args.pathOrId,
          },
        },
        {
          description:
            "Promise rejects with the code `INVALID_ID` if the network call fails for the same reason when the supplied environment ID or path is invalid",
          args: {
            ...args,
            pathOrId: "test-environment-id-or-path",
            resourceType: "environment" as const,
          },
          axiosMock: {
            response: {
              data: {
                reason: "INVALID_ID",
              },
            },
          },
          expected: {
            code: "INVALID_ID",
            data: "test-environment-id-or-path",
          },
        },
      ];

      test.each(cases)("$description", ({ args, axiosMock, expected }) => {
        const { code, response } = axiosMock;
        const axiosErrMessage = code ?? response?.data?.reason;

        vi.spyOn(axios, "get").mockImplementation(() =>
          Promise.reject(
            new AxiosError(
              axiosErrMessage,
              code,
              undefined,
              undefined,
              response as AxiosResponse
            )
          )
        );

        expect(getResourceContents(args)).rejects.toEqual(expected);
      });

      test("Promise rejects with the code `INVALID_SERVER_URL` if the network call succeeds and the received response content type is not `application/json`", () => {
        const expected = {
          code: "INVALID_SERVER_URL",
          data: args.serverUrl,
        };

        vi.spyOn(axios, "get").mockImplementation(() =>
          Promise.resolve({
            data: "",
            headers: { "content-type": "text/html; charset=UTF-8" },
          })
        );

        expect(getResourceContents(args)).rejects.toEqual(expected);
      });

      test("Promise rejects with the code `UNKNOWN_ERROR` while encountering an error that is not an instance of `AxiosError`", () => {
        const expected = {
          code: "UNKNOWN_ERROR",
          data: new Error("UNKNOWN_ERROR"),
        };

        vi.spyOn(axios, "get").mockImplementation(() =>
          Promise.reject(new Error("UNKNOWN_ERROR"))
        );

        expect(getResourceContents(args)).rejects.toEqual(expected);
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
          "transformWorkspaceCollections"
        ).mockImplementation(() => [sampleCollectionContents]);

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
          workspaceAccessHelpers.transformWorkspaceCollections
        ).toBeCalled();
        expect(mutators.readJsonFile).not.toHaveBeenCalled();
      });
    });
  });

  describe("getResolvedVariables", () => {
    const requestVariables = [
      {
        key: "SHARED_KEY_I",
        value: "request-variable-shared-value-I",
        active: true,
      },
      {
        key: "SHARED_KEY_II",
        value: "",
        active: true,
      },
      {
        key: "REQUEST_VAR_III",
        value: "request-variable-value-III",
        active: true,
      },
      {
        key: "REQUEST_VAR_IV",
        value: "request-variable-value-IV",
        active: false,
      },
      {
        key: "REQUEST_VAR_V",
        value: "request-variable-value-V",
        active: false,
      },
    ];

    const environmentVariables = [
      {
        key: "SHARED_KEY_I",
        initialValue: "environment-variable-shared-value-I",
        currentValue: "environment-variable-shared-value-I",
        secret: false,
      },
      {
        key: "SHARED_KEY_II",
        initialValue: "environment-variable-shared-value-II",
        currentValue: "environment-variable-shared-value-II",
        secret: false,
      },
      {
        key: "ENV_VAR_III",
        initialValue: "environment-variable-value-III",
        currentValue: "environment-variable-value-III",
        secret: false,
      },
      {
        key: "ENV_VAR_IV",
        initialValue: "environment-variable-value-IV",
        currentValue: "environment-variable-value-IV",
        secret: false,
      },
      {
        key: "ENV_VAR_V",
        initialValue: "environment-variable-value-V",
        currentValue: "environment-variable-value-V",
        secret: false,
      },
    ];

    test("Filters request variables by active status and value fields, then remove environment variables sharing the same keys", () => {
      const expected = [
        {
          key: "SHARED_KEY_I",
          currentValue: "request-variable-shared-value-I",
          initialValue: "request-variable-shared-value-I",
          secret: false,
        },
        {
          key: "REQUEST_VAR_III",
          currentValue: "request-variable-value-III",
          initialValue: "request-variable-value-III",
          secret: false,
        },
        {
          key: "SHARED_KEY_II",
          currentValue: "environment-variable-shared-value-II",
          initialValue: "environment-variable-shared-value-II",
          secret: false,
        },
        {
          key: "ENV_VAR_III",
          currentValue: "environment-variable-value-III",
          initialValue: "environment-variable-value-III",
          secret: false,
        },
        {
          key: "ENV_VAR_IV",
          currentValue: "environment-variable-value-IV",
          initialValue: "environment-variable-value-IV",
          secret: false,
        },
        {
          key: "ENV_VAR_V",
          currentValue: "environment-variable-value-V",
          initialValue: "environment-variable-value-V",
          secret: false,
        },
      ];

      expect(
        getResolvedVariables(requestVariables, environmentVariables)
      ).toEqual(expected);
    });
  });
});
