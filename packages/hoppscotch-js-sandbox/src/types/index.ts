import { Environment } from "@hoppscotch/data"

/**
 * The response object structure exposed to the test script
 */
export type TestResponse = {
  /** Status Code of the response */
  status: number
  /** List of headers returned */
  headers: { key: string; value: string }[]
  /**
   * Body of the response, this will be the JSON object if it is a JSON content type, else body string
   */
  body: string | object
}

/**
 * The result of an expectation statement
 */
export type ExpectResult = {
  status: "pass" | "fail" | "error"
  message: string
} // The expectation failed (fail) or errored (error)

/**
 * An object defining the result of the execution of a
 * test block
 */
export type TestDescriptor = {
  /**
   * The name of the test block
   */
  descriptor: string

  /**
   * Expectation results of the test block
   */
  expectResults: ExpectResult[]

  /**
   * Children test blocks (test blocks inside the test block)
   */
  children: TestDescriptor[]
}

/**
 * Defines the result of a test script execution
 */

export type TestResult = {
  tests: TestDescriptor[]
  envs: {
    global: Environment["variables"]
    selected: Environment["variables"]
  }
}

export type GlobalEnvItem = TestResult["envs"]["global"][number]
export type SelectedEnvItem = TestResult["envs"]["selected"][number]

export type SandboxTestResult = TestResult & { tests: TestDescriptor }
