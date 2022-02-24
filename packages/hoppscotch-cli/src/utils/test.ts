import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as S from "fp-ts/string";
import chalk from "chalk";
import { log } from "console";
import {
  execTestScript,
  TestDescriptor,
} from "@hoppscotch/js-sandbox/lib/test-runner";
import { TestReport, TestScriptData } from "../interfaces";
import { isExpectResultPass, GTest } from ".";
import { error, HoppCLIError } from "../types";

/**
 * Recursive function to log template strings of testMessages & expectMessages
 * and returns total failing tests.
 * @param testDescriptor Object with details of test-descriptor.
 * @returns Promise<number>: total failing tests for test-descriptor.
 */
const testDescriptorParser = (testDescriptor: TestDescriptor) => async () => {
  let testsReport: TestReport[] = [];
  if (A.isNonEmpty(testDescriptor.expectResults)) {
    let passing: number = 0,
      failing: number = 0;

    const testReport: TestReport = {
      descriptor: testDescriptor.descriptor,
      expectResults: testDescriptor.expectResults,
      failing: 0,
      passing: 0,
    };

    for (const expectResult of testDescriptor.expectResults) {
      if (E.isLeft(isExpectResultPass(expectResult.status))) {
        failing += 1;
      } else {
        passing += 1;
      }
    }

    testReport.failing = failing;
    testReport.passing = passing;
    testsReport.push(testReport);
  }

  for (const testDescriptorChild of testDescriptor.children) {
    const testDesParserRes = await testDescriptorParser(testDescriptorChild)();
    testsReport = [...testsReport, ...testDesParserRes];
  }
  return testsReport;
};

/**
 * Executes test script and runs testDescriptorParser function to
 * generate test-report.
 * @param testScriptData Object with details of test-script.
 * @returns TaskEither<HoppCLIError, TestReport[]>
 */
export const testRunner =
  (testScriptData: TestScriptData): TE.TaskEither<HoppCLIError, TestReport[]> =>
  async () => {
    const testScriptExecRes = await execTestScript(
      testScriptData.testScript,
      { global: [], selected: [] },
      testScriptData.response
    )();

    if (E.isRight(testScriptExecRes)) {
      let testsReport: TestReport[] = [];
      for (const testDescriptorChild of testScriptExecRes.right.tests) {
        const testDesParserRes = await testDescriptorParser(
          testDescriptorChild
        )();
        testsReport = [...testsReport, ...testDesParserRes];
      }
      return E.right(testsReport);
    }
    return E.left(
      error({
        code: "TEST_SCRIPT_ERROR",
        data: testScriptExecRes.left,
        name: testScriptData.name,
      })
    );
  };

/**
 * Runs tests on array of test-script-data.
 * @param tests
 * @returns TaskEither<HoppCLIError, null>
 */
export const runTests =
  (tests: TestScriptData[]): TE.TaskEither<HoppCLIError, null> =>
  async () => {
    let failing = 0;

    const testsPromise = [];
    for (const test of tests) {
      const testScript = pipe(test.testScript, S.trim);
      if (!S.isEmpty(testScript)) {
        testsPromise.push(testRunner(test)());
      }
    }

    const testsResponse = await Promise.all(testsPromise);
    const testsReport: TestReport[] = [];
    for (const testResponse of testsResponse) {
      if (E.isRight(testResponse)) {
        for (const _testResponse of testResponse.right) {
          failing += _testResponse.failing;
          testsReport.push(_testResponse);
        }
      } else {
        return testResponse;
      }
    }

    if (A.isNonEmpty(testsReport)) {
      testsReportOutput(testsReport);
    }
    return testsExitResult(failing, A.size(testsReport));
  };

/**
 * Outputs test runner report to stdout.
 * @param testsReport
 * @returns void
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
 * Ouputs and returns tests result.
 * @param failing
 * @param testsReportSize
 * @returns Either<HoppCLIError, null>
 */
const testsExitResult = (failing: number, testsReportSize: number) => {
  if (failing > 0) {
    return E.left(error({ code: "TESTS_FAILING", data: failing }));
  }
  if (testsReportSize > 0) {
    pipe("ALL_TESTS_PASSING", chalk.bgGreen.black, log);
  }
  return E.right(null);
};
