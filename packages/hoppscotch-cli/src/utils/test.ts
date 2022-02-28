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
import { isExpectResultPass, GTest } from ".";
import { error, HoppCLIError } from "../types";

/**
 * Recursive function to parse test-descriptor and generate tests-report.
 * @param testDescriptor Object with details of test-descriptor.
 * @returns TestReport[] parsed from TestDescriptor.
 */
export const testDescriptorParser = (
  testDescriptor: TestDescriptor
): T.Task<TestReport[]> =>
  pipe(
    /**
     * Generate single TestReport from given testDescriptor and bind
     * the output to TEST_REPORT.
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
        Object({
          failing: testMetrics.failing,
          passing: testMetrics.passing,
          descriptor: testDescriptor.descriptor,
          expectResults: testDescriptor.expectResults,
        }) as TestReport
    ),
    T.map((testReport) =>
      A.isNonEmpty(testReport.expectResults) ? [testReport] : []
    ),
    T.bindTo("TEST_REPORT"),

    /**
     * Recursive call to testDescriptorParser on testDescriptor's
     * children; The result is concated with TEST_REPORT to generate
     * final output, binded to TESTS_REPORT.
     */
    T.chain(({ TEST_REPORT }) =>
      pipe(
        testDescriptor.children,
        A.map(testDescriptorParser),
        T.sequenceArray,
        T.map(RA.flatten),
        T.map(RA.toArray),
        T.map(A.concat(TEST_REPORT))
      )
    ),
    T.bindTo("TESTS_REPORT"),
    T.map(({ TESTS_REPORT }) => TESTS_REPORT)
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
    TE.chainW(
      flow(
        A.map(testDescriptorParser),
        T.sequenceArray,
        T.map(RA.flatten),
        T.map(RA.toArray),
        TE.fromTask
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
): TE.TaskEither<HoppCLIError, null> =>
  pipe(
    tests,
    A.map(testRunner),
    TE.sequenceArray,
    TE.map(RA.toArray),
    TE.map(A.flatten),

    /**
     * Printing tests-report and mapping void return to TestReport[]
     */
    TE.chainW((testsReport) =>
      pipe(
        testsReport,
        testsReportOutput,
        TE.of,
        TE.map(() => testsReport)
      )
    ),

    /**
     * Reducing tests-report to calculate total failing and
     * tests-report-size.
     */
    TE.chainW(
      flow(
        A.reduce({ failing: 0, testsReportSize: 0 }, (prev, testReport) =>
          Object({
            failing: prev.failing + testReport.failing,
            testsReportSize: prev.testsReportSize + 1,
          })
        ),
        TE.of
      )
    ),

    /**
     * Exiting runTests with report-metrics.
     */
    TE.chain(({ failing, testsReportSize }) =>
      pipe(testsExitResult(failing, testsReportSize), T.of)
    )
  );

/**
 * Outputs test runner report to stdout.
 * @param testsReport Array of test-report returned from testRunner.
 * @returns
 */
const testsReportOutput = (testsReport: TestReport[]) => {
  for (const testReport of testsReport) {
    let expectMessages = "";
    pipe(testReport.descriptor, chalk.underline, log);

    for (const expectResult of testReport.expectResults) {
      if (E.isLeft(isExpectResultPass(expectResult.status))) {
        expectMessages += pipe(expectResult.message, GTest.expectFailedMessage);
      } else {
        expectMessages += pipe(expectResult.message, GTest.expectPassedMessage);
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
 * Outputs and returns tests result.
 * @param failing Total failing tests.
 * @param testsReportSize Number of test-reports.
 * @returns null - All tests pass OR tests-script empty;
 * HoppCLIError - Some tests-failing.
 */
export const testsExitResult = (
  failing: number,
  testsReportSize: number
): E.Either<HoppCLIError, null> => {
  if (failing > 0) {
    return E.left(error({ code: "TESTS_FAILING", data: failing }));
  }
  if (testsReportSize > 0) {
    pipe("ALL_TESTS_PASSING", chalk.bgGreen.black, log);
  }
  return E.right(null);
};
