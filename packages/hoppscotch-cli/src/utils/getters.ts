import chalk from "chalk";
import { pipe } from "fp-ts/function";
import qs from "qs";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import { TestResponse } from "@hoppscotch/js-sandbox";
import {
  HoppRESTRequest,
  Environment,
  parseRawKeyValueEntriesE,
  parseBodyEnvVariablesE,
  parseTemplateString,
  parseTemplateStringE,
} from "@hoppscotch/data";
import { Method } from "axios";
import {
  TableResponse,
  RunnerResponseInfo,
  EffectiveHoppRESTRequest,
} from "../interfaces";
import { arrayFlatMap, arraySort, toFormData, tupleToRecord } from ".";
import { createStream, getBorderCharacters } from "table";
import { error, HoppCLIError } from "../types";

/**
 * Getter object methods for file test.ts
 */
export const GTest = {
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
      message += chalk.dim(`out of ${total} tests.`);
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
 * Getter object methods for file request.ts
 */
export const GRequest = {
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
 * @returns TableResponse
 */
export const getTableResponse = (
  runnerResponseInfo: RunnerResponseInfo
): TableResponse => {
  const { path, endpoint, statusText, status, method } = runnerResponseInfo;
  const tableResponse: TableResponse = {
    path: path,
    endpoint: endpoint,
    method: method,
    statusCode: getColorStatusCode(status, statusText),
  };

  return tableResponse;
};

/**
 * @param runnerResponseInfo
 * @returns TestResponse
 */
export const getTestResponse = (
  runnerResponseInfo: RunnerResponseInfo
): TestResponse => {
  const { status, headers, body } = runnerResponseInfo;
  const testResponse: TestResponse = {
    status,
    headers,
    body,
  };
  return testResponse;
};

function getFinalBodyFromRequest(
  request: HoppRESTRequest,
  envVariables: Environment["variables"]
): E.Either<HoppCLIError, string | null | FormData> {
  if (request.body.contentType === null) {
    return E.right(null);
  }

  if (request.body.contentType === "application/x-www-form-urlencoded") {
    const requestBody = parseRawKeyValueEntriesE(request.body.body);
    if (E.isLeft(requestBody)) {
      return E.left(
        error({ code: "PARSING_ERROR", data: requestBody.left.message })
      );
    }

    return pipe(
      requestBody.right.slice(),
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
      qs.stringify,
      E.right
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
      toFormData,
      E.right
    );
  } else {
    const parsedBodyEnvVar = parseBodyEnvVariablesE(
      request.body.body,
      envVariables
    );
    if (E.isLeft(parsedBodyEnvVar)) {
      return E.left(
        error({ code: "PARSING_ERROR", data: parsedBodyEnvVar.left })
      );
    }
    return parsedBodyEnvVar;
  }
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
): E.Either<HoppCLIError, EffectiveHoppRESTRequest> {
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
  if (E.isLeft(effectiveFinalBody)) {
    return effectiveFinalBody;
  }

  if (request.body.contentType)
    effectiveFinalHeaders.push({
      active: true,
      key: "content-type",
      value: request.body.contentType,
    });

  const effectiveFinalURL = parseTemplateStringE(
    request.endpoint,
    envVariables
  );
  if (E.isLeft(effectiveFinalURL)) {
    return E.left(
      error({ code: "PARSING_ERROR", data: effectiveFinalURL.left })
    );
  }

  return E.right({
    ...request,
    effectiveFinalURL: effectiveFinalURL.right,
    effectiveFinalHeaders,
    effectiveFinalParams,
    effectiveFinalBody: effectiveFinalBody.right,
  });
}

/**
 * Get writable stream to stdout response in table format.
 * @returns WritableStream
 */
export const getTableStream = () =>
  createStream({
    columnDefault: {
      width: 30,
      alignment: "center",
      verticalAlignment: "middle",
      wrapWord: true,
      paddingLeft: 0,
      paddingRight: 0,
    },
    columnCount: 4,
    border: getBorderCharacters("norc"),
  });
