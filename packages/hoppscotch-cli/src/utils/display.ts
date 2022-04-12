import { bold } from "chalk";
import { groupEnd, group, log } from "console";
import { handleError } from "../handlers/error";
import { RequestConfig } from "../interfaces/request";
import { RequestRunnerResponse, TestReport } from "../interfaces/response";
import { HoppCLIError } from "../types/errors";
import {
  PreRequestMetrics,
  RequestMetrics,
  TestMetrics,
} from "../types/response";
import { exceptionColors, getColorStatusCode } from "./getters";
import { getFailedExpectedResults, getFailedTestsReport } from "./test";
const { FAIL, SUCCESS, BG_INFO, INFO_BRIGHT } = exceptionColors;

/**
 * Prints total failing and passing stats of executed pre-request-scripts.
 * @param preRequestMetrics Provides data for total failing and passing
 * stats of all executed pre-request-scripts.
 */
export const printPreRequestMetrics = (
  preRequestMetrics: PreRequestMetrics
) => {
  const {
    scripts: { failing, passing },
  } = preRequestMetrics;

  const failedPreRequestsOut = FAIL(`${failing} failing`);
  const passedPreRequestsOut = SUCCESS(`${passing} passing`);
  const preRequestsOut = `Pre-Request Scripts: ${failedPreRequestsOut} ${passedPreRequestsOut}\n`;

  const message = `\n${preRequestsOut}`;
  process.stdout.write(message);
};

/**
 * Prints total failing and passing stats, duration of executed request.
 * @param requestsMetrics Provides data for total duration and total failing and
 * passing stats of all executed requests.
 */
export const printRequestsMetrics = (requestsMetrics: RequestMetrics) => {
  const {
    requests: { failing, passing },
    duration,
  } = requestsMetrics;

  const failedRequestsOut = FAIL(`${failing} failing`);
  const passedRequestsOut = SUCCESS(`${passing} passing`);
  const requestsOut = `Requests: ${failedRequestsOut} ${passedRequestsOut}\n`;
  const requestsDurationOut =
    duration > 0 ? `Requests Duration: ${INFO_BRIGHT(`${duration} s`)}\n` : "";

  const message = `\n${requestsOut}${requestsDurationOut}`;
  process.stdout.write(message);
};

/**
 * Prints test-suites in pretty-way describing each test-suites failed/passed
 * status and duration to execute the test-script.
 * @param testsReport Providing details of each test-suites with tests-report.
 * @param duration Time taken (in seconds) to execute the test-script.
 */
export const printTestSuitesReport = (
  testsReport: TestReport[],
  duration: number
) => {
  const durationMsg =
    duration > 0 ? INFO_BRIGHT(`Ran tests in ${duration} s`) : "";

  group();
  for (const testReport of testsReport) {
    const { failing, descriptor } = testReport;

    if (failing > 0) {
      log(`${FAIL("✖")} ${descriptor}`);
    } else {
      log(`${SUCCESS("✔")} ${descriptor}`);
    }
  }
  log(durationMsg);
  groupEnd();
};

/**
 * Prints total failing and passing stats for test-suites, test-cases, test-scripts,
 * and total duration of executed test-scripts.
 * @param testsMetrics Provides testSuites, testCases metrics, test-script
 * execution duration and test-script passing/failing stats.
 */
export const printTestsMetrics = (testsMetrics: TestMetrics) => {
  const { testSuites, tests, duration, scripts } = testsMetrics;

  const failedTestCasesOut = FAIL(`${tests.failing} failing`);
  const passedTestCasesOut = SUCCESS(`${tests.passing} passing`);
  const testCasesOut = `Test Cases: ${failedTestCasesOut} ${passedTestCasesOut}\n`;

  const failedTestSuitesOut = FAIL(`${testSuites.failing} failing`);
  const passedTestSuitesOut = SUCCESS(`${testSuites.passing} passing`);
  const testSuitesOut = `Test Suites: ${failedTestSuitesOut} ${passedTestSuitesOut}\n`;

  const failedTestScriptsOut = FAIL(`${scripts.failing} failing`);
  const passedTestScriptsOut = SUCCESS(`${scripts.passing} passing`);
  const testScriptsOut = `Test Scripts: ${failedTestScriptsOut} ${passedTestScriptsOut}\n`;

  const testsDurationOut =
    duration > 0 ? `Tests Duration: ${INFO_BRIGHT(`${duration} s`)}\n` : "";

  const message = `\n${testCasesOut}${testSuitesOut}${testScriptsOut}${testsDurationOut}`;
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
    const { status, statusText, duration } = requestResponse;
    const statusMsg = getColorStatusCode(status, statusText);
    const durationMsg = duration > 0 ? INFO_BRIGHT(`( ${duration} s )`) : "";

    process.stdout.write(` ${statusMsg} ${durationMsg}\n`);
  },

  // Prints error message, when request-runner fails to execute.
  fail: () => log(FAIL(" ERROR\n⚠ Error running request.")),
};

/**
 * Provides methods for printing test-runner's state messages.
 */
export const printTestRunner = {
  // Prints test-runner failed message.
  fail: () => log(FAIL("⚠ Error running test-script.")),

  // Prints test-runner success message including tests-report.
  success: (testsReport: TestReport[], duration: number) =>
    printTestSuitesReport(testsReport, duration),
};

/**
 * Provides methods for printing pre-request-runner's state messages.
 */
export const printPreRequestRunner = {
  fail: () => log(FAIL("⚠ Error running pre-request-script.")),
};
