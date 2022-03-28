import { bold } from "chalk";
import { groupEnd, group, log } from "console";
import { handleError } from "../handlers/error";
import { RequestConfig } from "../interfaces/request";
import { RequestRunnerResponse, TestReport } from "../interfaces/response";
import { HoppCLIError } from "../types/errors";
import { exceptionColors, getColorStatusCode } from "./getters";
import {
  getFailedExpectedResults,
  getFailedTestsReport,
  getTestMetrics,
} from "./test";
const { FAIL, SUCCESS, BG_INFO } = exceptionColors;

/**
 * Prints test-suites in pretty-way describing each test-suites failed/passed
 * status.
 * @param testsReport Providing details of each test-suites with tests-report.
 */
export const printTestSuitesReport = (testsReport: TestReport[]) => {
  group();
  for (const testReport of testsReport) {
    const { failing, descriptor } = testReport;

    if (failing > 0) {
      log(`${FAIL("✖")} ${descriptor}`);
    } else {
      log(`${SUCCESS("✔")} ${descriptor}`);
    }
  }
  groupEnd();
};

/**
 * Prints total number of test-cases and test-suites passed/failed.
 * @param testsReport Provides testSuites and testCases metrics.
 */
export const printTestsMetrics = (testsReport: TestReport[]) => {
  const { testSuites, tests } = getTestMetrics(testsReport);

  const failedTestCasesOut = FAIL(`${tests.failing} failing`);
  const passedTestCasesOut = SUCCESS(`${tests.passing} passing`);
  const testCasesOut = `Test Cases: ${failedTestCasesOut} ${passedTestCasesOut}\n`;

  const failedTestSuitesOut = FAIL(`${testSuites.failing} failing`);
  const passedTestSuitesOut = SUCCESS(`${testSuites.passing} passing`);
  const testSuitesOut = `Test Suites: ${failedTestSuitesOut} ${passedTestSuitesOut}\n`;

  const message = `\n${testCasesOut}${testSuitesOut}`;
  process.stdout.write(message);
};

/**
 * Prints details of each reported error for a request with error code.
 * @param path Request's path in collection for which errors occured.
 * @param errorsReport List of errors reported.
 */
export const printErrorsReport = (
  path: string,
  errorsReport: HoppCLIError[]
) => {
  if (errorsReport.length > 0) {
    const REPORTED_ERRORS_TITLE = FAIL(`\n${bold(path)} reported errors:`);

    group(REPORTED_ERRORS_TITLE);
    for (const errorReport of errorsReport) {
      handleError(errorReport);
    }
    groupEnd();
  }
};

/**
 * Prints details of each failed tests for given request's path.
 * @param path Request's path in collection for which tests-failed.
 * @param testsReport Overall tests-report including failed-tests-report.
 */
export const printFailedTestsReport = (
  path: string,
  testsReport: TestReport[]
) => {
  const failedTestsReport = getFailedTestsReport(testsReport);

  // Only printing test-reports with failing test-cases.
  if (failedTestsReport.length > 0) {
    const FAILED_TESTS_PATH = FAIL(`\n${bold(path)} failed tests:`);
    group(FAILED_TESTS_PATH);

    for (const failedTestReport of failedTestsReport) {
      const { descriptor, expectResults } = failedTestReport;
      const failedExpectResults = getFailedExpectedResults(expectResults);

      // Only printing failed expected-results.
      if (failedExpectResults.length > 0) {
        group("⦁", descriptor);

        for (const failedExpectResult of failedExpectResults) {
          log(FAIL("-"), failedExpectResult.message);
        }

        groupEnd();
      }
    }

    groupEnd();
  }
};

/**
 * Provides methods for printing request-runner's state messages.
 */
export const printRequestRunner = {
  // Request-runner starting message.
  start: (requestConfig: RequestConfig) => {
    const METHOD = BG_INFO(` ${requestConfig.method} `);
    const ENDPOINT = requestConfig.url;

    process.stdout.write(`${METHOD} ${ENDPOINT}`);
  },

  // Prints response's status, when request-runner executes successfully.
  success: (requestResponse: RequestRunnerResponse) => {
    const { status, statusText } = requestResponse;
    const statusMsg = getColorStatusCode(status, statusText);

    process.stdout.write(` ${statusMsg}\n`);
  },

  // Prints error message, when request-runner fails to execute.
  fail: () => log(FAIL(" ERROR\n⚠ Error running request.")),
};

/**
 * Provides methods for printing test-runner's state messages.
 */
export const printTestRunner = {
  fail: () => log(FAIL("⚠ Error running test-script.")),
};

/**
 * Provides methods for printing pre-request-runner's state messages.
 */
export const printPreRequestRunner = {
  fail: () => log(FAIL("⚠ Error running pre-request-script.")),
};
