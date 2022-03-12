import { HoppRESTRequest } from "@hoppscotch/data";
import { execTestScript, TestDescriptor } from "@hoppscotch/js-sandbox";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as A from "fp-ts/Array";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import chalk from "chalk";
import { log } from "console";
import {
  RequestRunnerResponse,
  TestReport,
  TestScriptParams,
} from "../interfaces/response";
import { error, HoppCLIError } from "../types/errors";
import { HoppEnvs } from "../types/request";
import { TestMetrics, TestRunnerRes } from "../types/response";

/**
 * Executes test script and runs testDescriptorParser to generate test-report using
 * expected-results, test-status & test-descriptor.
 * @param testScriptData Parameters related to test-script function.
 * @returns If executes successfully, we get TestRunnerRes(updated ENVs + test-reports).
 * Else, HoppCLIError with appropriate code & data.
 */
export const testRunner = (
  testScriptData: TestScriptParams
): TE.TaskEither<HoppCLIError, TestRunnerRes> =>
  pipe(
    /**
     * Executing test-script.
     */
    TE.of(testScriptData),
    TE.chain(({ testScript, response, envs }) =>
      execTestScript(testScript, envs, response)
    ),

    /**
     * Recursively parsing test-results using test-descriptor-parser
     * to generate test-reports.
     */
    TE.chainTaskK(({ envs, tests }) =>
      pipe(
        tests,
        A.map(testDescriptorParser),
        T.sequenceArray,
        T.map(
          flow(
            RA.flatten,
            RA.toArray,
            (testsReport) => <TestRunnerRes>{ envs, testsReport }
          )
        )
      )
    ),
    TE.mapLeft((e) =>
      error({
        code: "TEST_SCRIPT_ERROR",
        data: e,
      })
    )
  );

/**
 * Recursive function to parse test-descriptor from nested-children and
 * generate tests-report.
 * @param testDescriptor Object with details of test-descriptor.
 * @returns Flattened array of TestReport parsed from TestDescriptor.
 */
export const testDescriptorParser = (
  testDescriptor: TestDescriptor
): T.Task<TestReport[]> =>
  pipe(
    /**
     * Generate single TestReport from given testDescriptor.
     */
    testDescriptor,
    ({ expectResults, descriptor }) =>
      A.isNonEmpty(expectResults)
        ? pipe(
            expectResults,
            A.reduce({ failing: 0, passing: 0 }, (prev, { status }) =>
              /**
               * Incrementing number of passed test-cases if status is "pass",
               * else, incrementing number of failed test-cases.
               */
              status === "pass"
                ? { failing: prev.failing, passing: prev.passing + 1 }
                : { failing: prev.failing + 1, passing: prev.passing }
            ),
            ({ failing, passing }) =>
              <TestReport>{
                failing,
                passing,
                descriptor,
                expectResults,
              },
            Array.of
          )
        : [],
    T.of,

    /**
     * Recursive call to testDescriptorParser on testDescriptor's children.
     * The result is concated with previous testReport.
     */
    T.chain((testReport) =>
      pipe(
        testDescriptor.children,
        A.map(testDescriptorParser),
        T.sequenceArray,
        T.map(flow(RA.flatten, RA.toArray, A.concat(testReport)))
      )
    )
  );

/**
 * Extracts parameter object from request-runner's response, request and envs
 * for test-runner.
 * @param reqRunnerRes Provides response data.
 * @param request Provides test-script data.
 * @param envs Current ENVs state with-in collections-runner.
 * @returns Object to be passed as parameter for test-runner
 */
export const getTestScriptParams = (
  reqRunnerRes: RequestRunnerResponse,
  request: HoppRESTRequest,
  envs: HoppEnvs
) => {
  const testScriptParams: TestScriptParams = {
    testScript: request.testScript,
    response: {
      body: reqRunnerRes.body,
      status: reqRunnerRes.status,
      headers: reqRunnerRes.headers,
    },
    envs: envs,
  };
  return testScriptParams;
};

/**
 * Combines quantitative details (test-cases passed/failed) of each test-report
 * to generate TestMetrics object with total test-cases & total test-suites.
 * @param testsReport Contains details of each test-report (failed/passed test-cases).
 * @returns Object containing details of total test-cases passed/failed and
 * total test-suites passed/failed.
 */
export const getTestMetrics = (testsReport: TestReport[]): TestMetrics =>
  testsReport.reduce(
    ({ testSuites, tests }, testReport) => ({
      tests: {
        failing: tests.failing + testReport.failing,
        passing: tests.passing + testReport.passing,
      },
      testSuites: {
        failing: testSuites.failing + (testReport.failing > 0 ? 1 : 0),
        passing: testSuites.passing + (testReport.failing === 0 ? 1 : 0),
      },
    }),
    <TestMetrics>{
      tests: { failing: 0, passing: 0 },
      testSuites: { failing: 0, passing: 0 },
    }
  );

/**
 * Getter object methods for file tests-report-output function.
 */
const getTest = {
  /**
   * @param failing Total failed test-cases.
   * @param passing Total passed test-cases
   * @returns Template string with failing, passing & total tests info.
   */
  message: (failing: number, passing: number) => {
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
   * @param message Expected result for a test-case.
   * @returns Template string with failed expected message.
   */
  expectFailedMessage: (message: string) =>
    `${chalk.redBright("✖")} ${message} ${chalk.grey("- test failed")}\n`,

  /**
   * @param message Expected result for a test-case.
   * @returns Template string with passed expected message.
   */
  expectPassedMessage: (message: string) =>
    `${chalk.greenBright("✔")} ${message} ${chalk.grey("- test passed")}\n`,
};

/**
 * Outputs tests-report in pretty way to the console.
 * @param testsReport Generated tests-report from test-runner.
 */
export const testsReportOutput = (testsReport: TestReport[]) => {
  let testOut = "";
  for (const testReport of testsReport) {
    testOut += `${pipe(testReport.descriptor, chalk.underline, chalk.cyan)}\n`;

    let expectMessages = "";
    for (const expectResult of testReport.expectResults) {
      const { message, status } = expectResult;
      if (status === "pass") {
        expectMessages += pipe(message, getTest.expectPassedMessage);
      } else {
        expectMessages += pipe(message, getTest.expectFailedMessage);
      }
    }

    const { failing, passing } = testReport;
    const testMessage = getTest.message(failing, passing);

    testOut += `${testMessage}\n${expectMessages}\n`;
  }
  log(testOut);
};
