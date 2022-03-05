import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import chalk from "chalk";
import { log } from "console";
import { execTestScript, TestDescriptor } from "@hoppscotch/js-sandbox";
import { TestReport, TestScriptData } from "../interfaces";
import { GTest } from ".";
import { error, HoppCLIError, TestMetrics } from "../types";

/**
 * Recursive function to parse test-descriptor and generate tests-report.
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
    testDescriptor.expectResults,
    A.reduce({ failing: 0, passing: 0 }, (prev, expectResult) =>
      expectResult.status === "pass"
        ? { failing: prev.failing, passing: prev.passing + 1 }
        : { failing: prev.failing + 1, passing: prev.passing }
    ),
    T.of,
    T.map(
      (testMetrics) =>
        <TestReport>{
          failing: testMetrics.failing,
          passing: testMetrics.passing,
          descriptor: testDescriptor.descriptor,
          expectResults: testDescriptor.expectResults,
        }
    ),
    T.map((testReport) =>
      A.isNonEmpty(testReport.expectResults) ? [testReport] : []
    ),

    /**
     * Recursive call to testDescriptorParser on testDescriptor's
     * children; The result is concated with testReport to generate
     * final output, binded to TESTS_REPORT.
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
 * Executes test script and runs testDescriptorParser function to
 * generate test-report.
 * @param testScriptData Data related to test-script.
 * @returns TestReport[] - testRunner executes successfully;
 * HoppCLIError - On some error.
 */
export const testRunner = (
  testScriptData: TestScriptData
): TE.TaskEither<HoppCLIError, TestReport[]> =>
  pipe(
    /**
     * Executing test-script.
     */
    execTestScript(
      testScriptData.testScript,
      { global: [], selected: [] },
      testScriptData.response
    ),

    /**
     * Recursively parsing test-results
     * to obtain test-report array.
     */
    TE.map((testResult) => testResult.tests),
    TE.chainTaskK(
      flow(
        A.map(testDescriptorParser),
        T.sequenceArray,
        T.map(flow(RA.flatten, RA.toArray))
      )
    ),
    TE.mapLeft((e) =>
      error({
        code: "TEST_SCRIPT_ERROR",
        data: e,
        name: testScriptData.name,
      })
    )
  );

/**
 * Runs tests on array of test-script-data and prints tests-report-output.
 * @param tests Array of test-script data.
 * @returns null - runTests executes successfully;
 * HoppCLIError - Due to some errors.
 */
export const runTests = (
  tests: TestScriptData[]
): TE.TaskEither<HoppCLIError, TestMetrics> =>
  pipe(
    tests,
    A.map(testRunner),
    TE.sequenceArray,
    TE.map(flow(RA.flatten, RA.toArray)),

    /**
     * Printing tests-report and mapping void return to TestReport[]
     */
    TE.chainFirstW(flow(testsReportOutput, TE.of)),

    /**
     * Reducing tests-report to calculate total failing and
     * tests-report-size.
     */
    TE.chainW(
      flow(
        A.reduce({ failing: 0, testsReportSize: 0 }, (prev, testReport) => ({
          failing: prev.failing + testReport.failing,
          testsReportSize: prev.testsReportSize + 1,
        })),
        TE.of
      )
    ),

    /**
     * Exiting runTests with report-metrics.
     */
    TE.chainEitherK(testsExitResult)
  );

/**
 * Outputs test runner report to stdout.
 * @param testsReport Array of test-report returned from testRunner.
 */
const testsReportOutput = (testsReport: TestReport[]) => {
  for (const testReport of testsReport) {
    let expectMessages = "";
    pipe(testReport.descriptor, chalk.underline, log);

    for (const expectResult of testReport.expectResults) {
      const { message, status } = expectResult;
      if (status === "pass") {
        expectMessages += pipe(message, GTest.expectPassedMessage);
      } else {
        expectMessages += pipe(message, GTest.expectFailedMessage);
      }
    }

    const testMessage = GTest.testMessage(
      testReport.failing,
      testReport.passing
    );
    log(testMessage);
    log(expectMessages);
  }
};

/**
 * Writes tests-metrics to stdout and returns tests result.
 * @param data Provides metrics realted to tests (such failing tests,
 * tests-size).
 * @returns TestMetrics - When all tests pass OR tests-script empty;
 * HoppCLIError - Some tests-failing.
 */
export const testsExitResult = (
  data: TestMetrics
): E.Either<HoppCLIError, TestMetrics> => {
  const { failing, testsReportSize } = data;
  if (failing > 0) {
    return E.left(error({ code: "TESTS_FAILING", data: failing }));
  }
  if (testsReportSize > 0) {
    pipe("ALL_TESTS_PASSING", chalk.bgGreen.black, log);
  }
  return E.right(data);
};
