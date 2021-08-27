export type HoppTestExpectResult = {
  status: "fail" | "pass" | "error"
  message: string
}

export type HoppTestData = {
  description: string
  expectResults: HoppTestExpectResult[]
  tests: HoppTestData[]
}

export type HoppTestResult = {
  tests: HoppTestData[]
  expectResults: HoppTestExpectResult[]
}
