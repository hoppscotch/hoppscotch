import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import {
  execTestScript,
  TestDescriptor,
} from "@hoppscotch/js-sandbox/lib/test-runner";
import { TestScriptPair } from "../interfaces";
import { isExpectResultPass, GTestParser } from ".";

/**
 * Recursive function to log template strings of testMessages & expectMessages
 * and returns total failing tests.
 * @param testDescriptor Object with details of test-descriptor.
 * @returns Promise<number>: total failing tests for test-descriptor.
 */
const testDescriptorParser = async (
  testDescriptor: TestDescriptor
): Promise<number> => {
  let passing: number = 0,
    failing: number = 0;
  let expectMessages: string = "",
    testMessage: string;

  if (A.isNonEmpty(testDescriptor.expectResults)) {
    console.log(testDescriptor.descriptor);
    console.log("-".repeat(testDescriptor.descriptor.length));

    for (const expectResult of testDescriptor.expectResults) {
      if (E.isLeft(isExpectResultPass(expectResult.status))) {
        failing += 1;
        expectMessages += pipe(
          expectResult.message,
          GTestParser.expectFailedMessage
        );
      } else {
        passing += 1;
        expectMessages += pipe(
          expectResult.message,
          GTestParser.expectPassedMessage
        );
      }
    }

    testMessage = GTestParser.testMessage(failing, passing);
    console.log(testMessage);
    console.log(expectMessages);
  }

  for (const testDescriptorChild of testDescriptor.children) {
    failing += await testDescriptorParser(testDescriptorChild);
  }

  return failing;
};

/**
 * Executes test script and runs testDescriptorParser function to calculate
 * total failing tests for current test script.
 * @param testScriptPair Object with details of test-script.
 * @returns Promise<number>: total failing tests for current test script.
 */
export const testParser = async (
  testScriptPair: TestScriptPair
): Promise<number> => {
  let totalFailing: number = 0;
  const testScriptExecRes = await execTestScript(
    testScriptPair.testScript,
    testScriptPair.response
  )();

  if (E.isRight(testScriptExecRes)) {
    for (const testDescriptorChild of testScriptExecRes.right) {
      totalFailing += await testDescriptorParser(testDescriptorChild);
    }
  }

  return totalFailing;
};
