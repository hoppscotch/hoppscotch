import { HoppRESTRequest } from "@hoppscotch/data";
import { execTestScript, TestDescriptor } from "@hoppscotch/js-sandbox";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as A from "fp-ts/Array";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import {
  RequestRunnerResponse,
  TestReport,
  TestScriptParams,
} from "../interfaces/response";
import { error, HoppCLIError } from "../types/errors";
import { HoppEnvs } from "../types/request";
import { ExpectResult, TestMetrics, TestRunnerRes } from "../types/response";

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
 * Filters tests-report containing atleast one or more failed test-cases.
 * @param testsReport Provides "failing" test-cases data.
 * @returns Tests report with one or more test-cases failing.
 */
export const getFailedTestsReport = (testsReport: TestReport[]) =>
  pipe(
    testsReport,
    A.filter(({ failing }) => failing > 0)
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
 * @param testsReport Provides "failing" test-cases data.
 * @returns True, if one or more failed test-cases found.
 * False, if all test-cases passed.
 */
export const hasFailedTestCases = (testsReport: TestReport[]) =>
  pipe(
    testsReport,
    A.every(({ failing }) => failing === 0)
  );
