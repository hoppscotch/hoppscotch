import * as E from "fp-ts/Either";
import { TestScriptPair } from "../interfaces/table";
import { execTestScript } from "@hoppscotch/js-sandbox/lib/test-runner";
import { TestDescriptor } from "@hoppscotch/js-sandbox/lib";
import { testParserGetters } from "./getters";

/**
 * Recursive function to log template strings of testMessages & expectMessages
 * and returns total failing tests.
 * @param testDescriptor Object with details of test-descriptor.
 * @returns Promise<number>: total failing tests for test-descriptor.
 */
const testDescriptorParser = async (
  testDescriptor: TestDescriptor
): Promise<number> => {
  let totalFailing: number = 0,
    testRes: number = 0;
  let passing: number = 0,
    failing: number = 0;
  let expectMessages: string = "",
    testMessage: string;

  if (testDescriptor.expectResults.length > 0) {
    console.log(testDescriptor.descriptor);
    console.log("-".repeat(testDescriptor.descriptor.length));

    for (const expectResult of testDescriptor.expectResults) {
      if (expectResult.status === "error" || expectResult.status === "fail") {
        failing += 1;
        expectMessages += testParserGetters.expectFailedMessage(
          expectResult.message
        );
      } else {
        passing += 1;
        expectMessages += testParserGetters.expectPassedMessage(
          expectResult.message
        );
      }
    }

    if (failing > 0) {
      totalFailing = 1;
    }

    testMessage = testParserGetters.testMessage(failing, passing);
    console.log(testMessage);
    console.log(expectMessages);
  }

  for (const testDescriptorChild of testDescriptor.children) {
    testRes = await testDescriptorParser(testDescriptorChild);
    totalFailing += testRes;
  }

  return totalFailing;
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
  let totalFailing: number = 0,
    testRes: number = 0;
  const testScriptExecRes = await execTestScript(
    testScriptPair.testScript,
    testScriptPair.response
  )();

  if (E.isRight(testScriptExecRes)) {
    for (const testDescriptorChild of testScriptExecRes.right) {
      testRes = await testDescriptorParser(testDescriptorChild);
      totalFailing += testRes;
    }
  }

  return totalFailing;
};
