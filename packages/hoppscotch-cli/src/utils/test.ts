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
import { handleError } from "../handlers";

/**
 * Recursive function to log template strings of testMessages & expectMessages
 * and returns total failing tests.
 * @param testDescriptor Object with details of test-descriptor.
 * @returns Promise<number>: total failing tests for test-descriptor.
 */
const testDescriptorParser =
  (testDescriptor: TestDescriptor, testReports: TestReport[]) => async () => {
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
      testReports.push(testReport);
    }

    for (const testDescriptorChild of testDescriptor.children) {
      await testDescriptorParser(testDescriptorChild, testReports)();
    }
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
      testScriptData.response
    )();

    if (E.isRight(testScriptExecRes)) {
      const testReports: TestReport[] = [];
      for (const testDescriptorChild of testScriptExecRes.right) {
        await testDescriptorParser(testDescriptorChild, testReports)();
      }
      return E.right(testReports);
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
    for (const testResponse of testsResponse) {
      if (E.isRight(testResponse)) {
        for (const _testResponse of testResponse.right) {
          failing += _testResponse.failing;
          await testReportOutput(_testResponse)();
        }
      } else {
        failing += 1;
        handleError(testResponse.left);
      }
    }

    if (failing > 0) {
      return E.left(error({ code: "TESTS_FAILING", data: failing }));
    }
    if (A.isNonEmpty(testsResponse) && failing === 0) {
      pipe("ALL_TESTS_PASSING", chalk.bgGreen.black, log);
    }

    return E.right(null);
  };

/**
 * Outputs test runner report in stdout
 * @param test
 * @returns Promise<void>
 */
const testReportOutput = (test: TestReport) => async () => {
  let expectMessages = "";
  pipe(test.descriptor, chalk.underline, log);

  for (const expectResult of test.expectResults) {
    if (E.isLeft(isExpectResultPass(expectResult.status))) {
      expectMessages += pipe(expectResult.message, GTest.expectFailedMessage);
    } else {
      expectMessages += pipe(expectResult.message, GTest.expectPassedMessage);
    }
  }

  const testMessage = GTest.testMessage(test.failing, test.passing);
  log(testMessage);
  log(expectMessages);
};
