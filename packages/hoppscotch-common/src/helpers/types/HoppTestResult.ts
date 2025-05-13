import { Environment } from "@hoppscotch/data"
import { SandboxTestResult } from "@hoppscotch/js-sandbox"

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
  description: string
  scriptError: boolean

  envDiff: {
    global: {
      additions: Environment["variables"]
      updations: Array<
        Environment["variables"][number] & { previousValue: string }
      >
      deletions: Environment["variables"]
    }
    selected: {
      additions: Environment["variables"]
      updations: Array<
        Environment["variables"][number] & { previousValue: string }
      >
      deletions: Environment["variables"]
    }
  }

  consoleEntries: SandboxTestResult["consoleEntries"]
}
