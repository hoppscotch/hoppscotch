import { execPreRequestScriptForWeb } from "./pre-request/web-worker"
import { execTestScriptForWeb } from "./test-runner/web-worker"

/**
 * Executes a given test script on the test-runner sandbox
 * @param testScript The string of the script to run
 * @returns A TaskEither with an error message or a TestDescriptor with the final status
 */
export const runTestScriptForWeb = execTestScriptForWeb

export const runPreRequestScriptForWeb = execPreRequestScriptForWeb
