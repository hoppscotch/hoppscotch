import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as S from "fp-ts/string";
import {
  execTestScript,
  TestDescriptor,
} from "@hoppscotch/js-sandbox/lib/test-runner";
import { TestReport, TestScriptData } from "../interfaces";
import { isExpectResultPass, GTest } from ".";
import { error, HoppCLIError, HoppErrorCode as HEC } from "../types";
import chalk from "chalk";
import { log } from "console";

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
 * Executes test script and runs testDescriptorParser function to calculate
 * total failing tests for current test script.
 * @param testScriptData Object with details of test-script.
 * @returns Promise<number>: total failing tests for current test script.
 */
export const testRunner =
  (
    testScriptData: TestScriptData
  ): TE.TaskEither<HoppCLIError<HEC>, TestReport[]> =>
  async () => {
    const testScriptExecRes = await execTestScript(
      testScriptData.testScript,
      testScriptData.response
    )();

    const testReports: TestReport[] = [];
    if (E.isRight(testScriptExecRes)) {
      for (const testDescriptorChild of testScriptExecRes.right) {
        await testDescriptorParser(testDescriptorChild, testReports)();
      }
    } else {
      return E.left(
        error({ code: "UNKNOWN_ERROR", data: testScriptExecRes.left })
      );
    }

    return E.right(testReports);
  };

export const outputTestReport = (test: TestReport) => async () => {
  let expectMessages = "";

  log(test.descriptor);
  log("-".repeat(test.descriptor.length));

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

export const runTests =
  (tests: TestScriptData[]): TE.TaskEither<HoppCLIError<HEC>, null> =>
  async () => {
    let failing = 0;

    for (const test of tests) {
      const testScript = pipe(test.testScript, S.trim);
      if (!S.isEmpty(testScript)) {
        log(
          pipe(
            `\nRunning tests for ${chalk.bold(test.name)}...`,
            chalk.yellowBright
          )
        );
        const testRunnerRes = await testRunner(test)();
        if (E.isRight(testRunnerRes)) {
          for (const _testRunnerRes of testRunnerRes.right) {
            failing += _testRunnerRes.failing;
            await outputTestReport(_testRunnerRes)();
          }
        } else {
          return E.left(testRunnerRes.left);
        }
      }
    }

    if (failing > 0) {
      log(chalk.bgRed("process exited : 1"));
      process.exit(1);
    }

    return E.right(null);
  };
