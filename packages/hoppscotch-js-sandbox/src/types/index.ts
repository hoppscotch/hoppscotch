import { ConsoleEntry } from "faraday-cage/modules"

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

// Representation of a transformed state for environment variables in the sandbox
type TransformedEnvironmentVariable = {
  key: string
  currentValue: string
  initialValue: string
  secret: boolean
}

/**
 * Defines the result of a test script execution
 */

export type TestResult = {
  tests: TestDescriptor[]
  envs: {
    global: TransformedEnvironmentVariable[]
    selected: TransformedEnvironmentVariable[]
  }
}

export type GlobalEnvItem = TestResult["envs"]["global"][number]
export type SelectedEnvItem = TestResult["envs"]["selected"][number]

export type SandboxTestResult = TestResult & { tests: TestDescriptor } & {
  consoleEntries?: ConsoleEntry[]
}

export type SandboxPreRequestResult = {
  envs: TestResult["envs"]
  consoleEntries?: ConsoleEntry[]
}

export interface Expectation {
  toBe(expectedVal: any): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(expectedType: any): void
  toHaveLength(expectedLength: any): void
  toInclude(needle: any): void
  readonly not: Expectation
}
