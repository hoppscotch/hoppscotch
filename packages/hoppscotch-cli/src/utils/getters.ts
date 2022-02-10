import chalk from "chalk";
import { pipe } from "fp-ts/function";
import qs from "qs";
import * as A from "fp-ts/Array";
import { TestResponse } from "@hoppscotch/js-sandbox/lib/test-runner";
import { HoppRESTRequest } from "@hoppscotch/data";
import { Method } from "axios";
import {
  TableResponse,
  RunnerResponseInfo,
  Environment,
  EffectiveHoppRESTRequest,
} from "../interfaces";
import {
  arrayFlatMap,
  arraySort,
  parseBodyEnvVariables,
  parseRawKeyValueEntries,
  parseTemplateString,
  toFormData,
  tupleToRecord,
} from ".";

/**
 * Getter object methods for file test-parser.ts
 */
export const GTestParser = {
  /**
   * @param failing
   * @param passing
   * @returns template string with failing, passing & total tests info.
   */
  testMessage: (failing: number, passing: number) => {
    let message: string = "";
    const total: number = failing + passing;

    if (total > 0) {
      if (failing > 0) {
        message += chalk.redBright(`${failing} failing, `);
      }
      if (passing > 0) {
        message += chalk.greenBright(`${passing} successful, `);
      }
      message += `out of ${total} tests.`;
    }

    return message;
  },

  /**
   * @param message
   * @returns template string with failed expected message.
   */
  expectFailedMessage: (message: string) =>
    `${chalk.bold(`${chalk.redBright("✖")} ${message}`)} ${chalk.grey(
      "- test failed"
    )}\n`,

  /**
   * @param message
   * @returns template string with passed expected message.
   */
  expectPassedMessage: (message: string) =>
    `${chalk.bold(`${chalk.greenBright("✔")} ${message}`)} ${chalk.grey(
      "- test passed"
    )}\n`,
};

/**
 * Getter object methods for file request-parser.ts
 */
export const GRequestRunner = {
  /**
   * @param value
   * @returns Method string
   */
  method: (value: string | undefined) =>
    value ? (value.toUpperCase() as Method) : "GET",

  /**
   * @param value
   * @returns Endpoint string
   */
  endpoint: (value: string | undefined): string => (value ? value : ""),
};

/**
 * @param status
 * @param statusText
 * @returns template string
 */
export const getColorStatusCode = (
  status: number | string,
  statusText: string
): string => {
  const statusCode = `${status == 0 ? "Error" : status} : ${statusText}`;

  if (status.toString().startsWith("2")) {
    return chalk.greenBright(statusCode);
  } else if (status.toString().startsWith("3")) {
    return chalk.yellowBright(statusCode);
  }

  return chalk.redBright(statusCode);
};

/**
 * @param runnerResponseInfo
 * @returns Promise<TableResponse>
 */
export const getResponseTable = async (
  runnerResponseInfo: RunnerResponseInfo
): Promise<TableResponse> => {
  const { path, endpoint, statusText, status, method } = runnerResponseInfo;
  const responseTable: TableResponse = {
    path: path,
    endpoint: endpoint,
    method: method,
    statusCode: getColorStatusCode(status, statusText),
  };

  return responseTable;
};

/**
 * @param runnerResponseInfo
 * @returns Promise<TestResponse>
 */
export const getTestResponse = async (
  runnerResponseInfo: RunnerResponseInfo
): Promise<TestResponse> => {
  const { status, headers, body } = runnerResponseInfo;
  const testResponse: TestResponse = {
    status,
    headers,
    body: typeof body !== "object" ? JSON.parse(body) : body,
  };
  return testResponse;
};

function getFinalBodyFromRequest(
  request: HoppRESTRequest,
  envVariables: Environment["variables"]
): FormData | string | null {
  if (request.body.contentType === null) {
    return null;
  }

  if (request.body.contentType === "application/x-www-form-urlencoded") {
    return pipe(
      request.body.body,
      parseRawKeyValueEntries,

      // Filter out active
      A.filter((x) => x.active),
      // Convert to tuple
      A.map(
        ({ key, value }) =>
          [
            parseTemplateString(key, envVariables),
            parseTemplateString(value, envVariables),
          ] as [string, string]
      ),
      // Tuple to Record object
      tupleToRecord,
      // Stringify
      qs.stringify
    );
  }

  if (request.body.contentType === "multipart/form-data") {
    return pipe(
      request.body.body,
      A.filter((x) => x.key !== "" && x.active), // Remove empty keys

      // Sort files down
      arraySort((a, b) => {
        if (a.isFile) return 1;
        if (b.isFile) return -1;
        return 0;
      }),

      // FormData allows only a single blob in an entry,
      // we split array blobs into separate entries (FormData will then join them together during exec)
      arrayFlatMap((x) =>
        x.isFile
          ? x.value.map((v) => ({
              key: parseTemplateString(x.key, envVariables),
              value: v as string | Blob,
            }))
          : [
              {
                key: parseTemplateString(x.key, envVariables),
                value: parseTemplateString(x.value, envVariables),
              },
            ]
      ),
      toFormData
    );
  } else return parseBodyEnvVariables(request.body.body, envVariables);
}

/**
 * Outputs an executable request format with environment variables applied
 *
 * @param request The request to source from
 * @param environment The environment to apply
 *
 * @returns An object with extra fields defining a complete request
 */
export function getEffectiveRESTRequest(
  request: HoppRESTRequest,
  environment: Environment
): EffectiveHoppRESTRequest {
  const envVariables = [...environment.variables];

  const effectiveFinalHeaders = request.headers
    .filter(
      (x) =>
        x.key !== "" && // Remove empty keys
        x.active // Only active
    )
    .map((x) => ({
      // Parse out environment template strings
      active: true,
      key: parseTemplateString(x.key, envVariables),
      value: parseTemplateString(x.value, envVariables),
    }));

  const effectiveFinalParams = request.params
    .filter(
      (x) =>
        x.key !== "" && // Remove empty keys
        x.active // Only active
    )
    .map((x) => ({
      active: true,
      key: parseTemplateString(x.key, envVariables),
      value: parseTemplateString(x.value, envVariables),
    }));

  // Authentication
  if (request.auth.authActive) {
    // TODO: Support a better b64 implementation than btoa ?
    if (request.auth.authType === "basic") {
      const username = parseTemplateString(request.auth.username, envVariables);
      const password = parseTemplateString(request.auth.password, envVariables);

      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Basic ${btoa(`${username}:${password}`)}`,
      });
    } else if (
      request.auth.authType === "bearer" ||
      request.auth.authType === "oauth-2"
    ) {
      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Bearer ${parseTemplateString(
          request.auth.token,
          envVariables
        )}`,
      });
    } else if (request.auth.authType === "api-key") {
      const { key, value, addTo } = request.auth;
      if (addTo === "Headers") {
        effectiveFinalHeaders.push({
          active: true,
          key: parseTemplateString(key, envVariables),
          value: parseTemplateString(value, envVariables),
        });
      } else if (addTo === "Query params") {
        effectiveFinalParams.push({
          active: true,
          key: parseTemplateString(key, envVariables),
          value: parseTemplateString(value, envVariables),
        });
      }
    }
  }

  const effectiveFinalBody = getFinalBodyFromRequest(request, envVariables);
  if (request.body.contentType)
    effectiveFinalHeaders.push({
      active: true,
      key: "content-type",
      value: request.body.contentType,
    });

  return {
    ...request,
    effectiveFinalURL: parseTemplateString(request.endpoint, envVariables),
    effectiveFinalHeaders,
    effectiveFinalParams,
    effectiveFinalBody,
  };
}
