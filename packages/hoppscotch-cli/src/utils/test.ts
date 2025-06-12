import { HoppRESTRequest } from "@hoppscotch/data";
import { TestDescriptor } from "@hoppscotch/js-sandbox";
import { runTestScript } from "@hoppscotch/js-sandbox/node";
import * as A from "fp-ts/Array";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { hrtime } from "process";

import {
  RequestRunnerResponse,
  TestReport,
  TestScriptParams,
} from "../interfaces/response";
import { HoppCLIError, error } from "../types/errors";
import { HoppEnvs } from "../types/request";
import { ExpectResult, TestMetrics, TestRunnerRes } from "../types/response";
import { getDurationInSeconds } from "./getters";

/**
 * Executes test script and runs testDescriptorParser to generate test-report using
 * expected-results, test-status & test-descriptor.
 * @param testScriptData Parameters related to test-script function.
 * @returns If executes successfully, we get TestRunnerRes(updated ENVs, test-reports, duration).
 * Else, HoppCLIError with appropriate code & data.
 */
export const testRunner = (
  testScriptData: TestScriptParams
): TE.TaskEither<HoppCLIError, TestRunnerRes> =>
  pipe(
    /**
     * Executing test-script.
     */
    TE.Do,
    TE.bind("start", () => TE.of(hrtime())),
    TE.bind("test_response", () =>
      pipe(
        TE.of(testScriptData),
        TE.chain(({ testScript, response, envs, legacySandbox }) => {
          const experimentalScriptingSandbox = !legacySandbox;
          return runTestScript(
            testScript,
            envs,
            response,
            experimentalScriptingSandbox
          );
        })
      )
    ),

    /**
     * Recursively parsing test-results using test-descriptor-parser
     * to generate test-reports.
     */
    TE.chainTaskK(({ test_response: { tests, envs }, start }) =>
      pipe(
        tests,
        A.map(testDescriptorParser),
        T.sequenceArray,
        T.map(
          flow(
            RA.flatten,
            RA.toArray,
            (testsReport) =>
              <TestRunnerRes>{
                envs,
                testsReport,
                duration: pipe(start, hrtime, getDurationInSeconds),
              }
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
            A.reduce({ failed: 0, passed: 0 }, (prev, { status }) =>
              /**
               * Incrementing number of passed test-cases if status is "pass",
               * else, incrementing number of failed test-cases.
               */
              status === "pass"
                ? { failed: prev.failed, passed: prev.passed + 1 }
                : { failed: prev.failed + 1, passed: prev.passed }
            ),
            ({ failed, passed }) =>
              <TestReport>{
                failed,
                passed,
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
  envs: HoppEnvs,
  legacySandbox: boolean
) => {
  const testScriptParams: TestScriptParams = {
    testScript: request.testScript,
    response: {
      body: reqRunnerRes.body,
      status: reqRunnerRes.status,
      headers: reqRunnerRes.headers,
    },
    envs,
    legacySandbox,
  };
  return testScriptParams;
};

/**
 * Combines quantitative details (test-cases passed/failed) of each test-report
 * to generate TestMetrics object with total test-cases & total test-suites.
 * @param testsReport Contains details of each test-report (failed/passed test-cases).
 * @param testDuration Time taken (in seconds) to execute the test-script.
 * @param errors List of HoppCLIErrors to check for TEST_SCRIPT_ERROR code.
 * @returns Object containing details of total test-cases passed/failed and
 * total test-suites passed/failed.
 */
export const getTestMetrics = (
  testsReport: TestReport[],
  testDuration: number,
  errors: HoppCLIError[]
): TestMetrics =>
  testsReport.reduce(
    ({ testSuites, tests, duration, scripts }, testReport) => ({
      tests: {
        failed: tests.failed + testReport.failed,
        passed: tests.passed + testReport.passed,
      },
      testSuites: {
        failed: testSuites.failed + (testReport.failed > 0 ? 1 : 0),
        passed: testSuites.passed + (testReport.failed === 0 ? 1 : 0),
      },
      scripts: scripts,
      duration: duration,
    }),
    <TestMetrics>{
      tests: { failed: 0, passed: 0 },
      testSuites: { failed: 0, passed: 0 },
      duration: testDuration,
      scripts: errors.some(({ code }) => code === "TEST_SCRIPT_ERROR")
        ? { failed: 1, passed: 0 }
        : { failed: 0, passed: 1 },
    }
  );

/**
 * Filters tests-report containing atleast one or more failed test-cases.
 * @param testsReport Provides "failed" test-cases data.
 * @returns Tests report with one or more test-cases failed.
 */
export const getFailedTestsReport = (testsReport: TestReport[]) =>
  pipe(
    testsReport,
    A.filter(({ failed }) => failed > 0)
  );

/**
 * Filters expected-results containing which has status as "fail" or "error".
 * @param expectResults Provides "status" data for each expected result.
 * @returns Expected results with "fail" or "error" status.
 */
export const getFailedExpectedResults = (expectResults: ExpectResult[]) =>
  pipe(
    expectResults,
    A.filter(({ status }) => status !== "pass")
  );

/**
 * Checks if any of the tests-report have failed test-cases.
 * @param testsReport Provides "failed" test-cases data.
 * @returns True, if one or more failed test-cases found.
 * False, if all test-cases passed.
 */
export const hasFailedTestCases = (testsReport: TestReport[]) =>
  pipe(
    testsReport,
    A.every(({ failed }) => failed === 0)
  );
