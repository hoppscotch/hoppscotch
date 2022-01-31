import chalk from "chalk";
import { TestResponse } from "@hoppscotch/js-sandbox/lib/test-runner";
import { Method } from "axios";
import { TableResponse } from "../interfaces";
import { RunnerResponseInfo } from "../interfaces/table";

/**
 * Getter object methods for @file test-parser.ts
 */
export const testParserGetters = {
  /**
   * @param failing
   * @param passing
   * @returns template string with failing, passing & total tests info.
   */
  testMessage: (failing: number, passing: number) => {
    let message: string = "";
    let total: number = failing + passing;

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
 * Getter object methods for @file request-parser.ts
 */
export const requestRunnerGetters = {
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
    body,
  };
  return testResponse;
};
