import { HoppRESTResponse } from "./types/HoppRESTResponse"

const styles = {
  PASS: { icon: "check", class: "success-response" },
  FAIL: { icon: "close", class: "cl-error-response" },
  ERROR: { icon: "close", class: "cl-error-response" },
}

type TestScriptResponse = {
  body: any
  headers: any[]
  status: number

  __newRes: HoppRESTResponse
}

type TestScriptVariables = {
  response: TestScriptResponse
}

type TestReportStartBlock = {
  startBlock: string
}

type TestReportEndBlock = {
  endBlock: true
}

type TestReportEntry = {
  result: "PASS" | "FAIL" | "ERROR"
  message: string
  styles: {
    icon: string
  }
}

type TestReport = TestReportStartBlock | TestReportEntry | TestReportEndBlock

export default function runTestScriptWithVariables(
  script: string,
  variables?: TestScriptVariables
) {
  const pw = {
    _errors: [],
    _testReports: [] as TestReport[],
    _report: "",
    expect(value: any) {
      try {
        return expect(value, this._testReports)
      } catch (e: any) {
        pw._testReports.push({
          result: "ERROR",
          message: `${e}`,
          styles: styles.ERROR,
        })
      }
    },
    test: (descriptor: string, func: () => void) =>
      test(descriptor, func, pw._testReports),
    // globals that the script is allowed to have access to.
  }
  Object.assign(pw, variables)

  // run pre-request script within this function so that it has access to the pw object.
  // eslint-disable-next-line no-new-func
  new Function("pw", script)(pw)

  return {
    report: pw._report,
    errors: pw._errors,
    testResults: pw._testReports,
  }
}

function test(
  descriptor: string,
  func: () => void,
  _testReports: TestReport[]
) {
  _testReports.push({ startBlock: descriptor })
  try {
    func()
  } catch (e: any) {
    _testReports.push({ result: "ERROR", message: e, styles: styles.ERROR })
  }
  _testReports.push({ endBlock: true })

  // TODO: Organize and generate text report of each {descriptor: true} section in testReports.
  // add checkmark or x depending on if each testReport is pass=true or pass=false
}

function expect(expectValue: any, _testReports: TestReport[]) {
  return new Expectation(expectValue, null, _testReports)
}

class Expectation {
  private expectValue: any
  private not: true | Expectation
  private _testReports: TestReport[]

  constructor(
    expectValue: any,
    _not: boolean | null,
    _testReports: TestReport[]
  ) {
    this.expectValue = expectValue
    this.not = _not || new Expectation(this.expectValue, true, _testReports)
    this._testReports = _testReports // this values is used within Test.it, which wraps Expectation and passes _testReports value.
  }

  private _satisfies(expectValue: any, targetValue?: any): boolean {
    // Used for testing if two values match the expectation, which could be === OR !==, depending on if not
    // was used. Expectation#_satisfies prevents the need to have an if(this.not) branch in every test method.
    // Signature is _satisfies([expectValue,] targetValue): if only one argument is given, it is assumed the targetValue, and expectValue is set to this.expectValue
    if (!targetValue) {
      targetValue = expectValue
      expectValue = this.expectValue
    }
    if (this.not === true) {
      // test the inverse. this.not is always truthly, but an Expectation that is inverted will always be strictly `true`
      return expectValue !== targetValue
    } else {
      return expectValue === targetValue
    }
  }

  _fmtNot(message: string) {
    // given a string with "(not)" in it, replaces with "not" or "", depending if the expectation is expecting the positive or inverse (this._not)
    if (this.not === true) {
      return message.replace("(not)", "not ")
    } else {
      return message.replace("(not)", "")
    }
  }

  _fail(message: string) {
    return this._testReports.push({
      result: "FAIL",
      message,
      styles: styles.FAIL,
    })
  }

  _pass(message: string) {
    return this._testReports.push({
      result: "PASS",
      message,
      styles: styles.PASS,
    })
  }

  // TEST METHODS DEFINED BELOW
  // these are the usual methods that would follow expect(...)
  toBe(value: any) {
    return this._satisfies(value)
      ? this._pass(
          this._fmtNot(`${this.expectValue} do (not)match with ${value}`)
        )
      : this._fail(
          this._fmtNot(`Expected ${this.expectValue} (not)to be ${value}`)
        )
  }

  toHaveProperty(value: string) {
    return this._satisfies(
      Object.prototype.hasOwnProperty.call(this.expectValue, value),
      true
    )
      ? this._pass(
          this._fmtNot(`${this.expectValue} do (not)have property ${value}`)
        )
      : this._fail(
          this._fmtNot(
            `Expected object ${this.expectValue} to (not)have property ${value}`
          )
        )
  }

  toBeLevel2xx() {
    const code = parseInt(this.expectValue, 10)
    if (Number.isNaN(code)) {
      return this._fail(
        `Expected 200-level status but could not parse value ${this.expectValue}`
      )
    }
    return this._satisfies(code >= 200 && code < 300, true)
      ? this._pass(
          this._fmtNot(`${this.expectValue} is (not)a 200-level status`)
        )
      : this._fail(
          this._fmtNot(
            `Expected ${this.expectValue} to (not)be 200-level status`
          )
        )
  }

  toBeLevel3xx() {
    const code = parseInt(this.expectValue, 10)
    if (Number.isNaN(code)) {
      return this._fail(
        `Expected 300-level status but could not parse value ${this.expectValue}`
      )
    }
    return this._satisfies(code >= 300 && code < 400, true)
      ? this._pass(
          this._fmtNot(`${this.expectValue} is (not)a 300-level status`)
        )
      : this._fail(
          this._fmtNot(
            `Expected ${this.expectValue} to (not)be 300-level status`
          )
        )
  }

  toBeLevel4xx() {
    const code = parseInt(this.expectValue, 10)
    if (Number.isNaN(code)) {
      return this._fail(
        `Expected 400-level status but could not parse value ${this.expectValue}`
      )
    }
    return this._satisfies(code >= 400 && code < 500, true)
      ? this._pass(
          this._fmtNot(`${this.expectValue} is (not)a 400-level status`)
        )
      : this._fail(
          this._fmtNot(
            `Expected ${this.expectValue} to (not)be 400-level status`
          )
        )
  }

  toBeLevel5xx() {
    const code = parseInt(this.expectValue, 10)
    if (Number.isNaN(code)) {
      return this._fail(
        `Expected 500-level status but could not parse value ${this.expectValue}`
      )
    }
    return this._satisfies(code >= 500 && code < 600, true)
      ? this._pass(
          this._fmtNot(`${this.expectValue} is (not)a 500-level status`)
        )
      : this._fail(
          this._fmtNot(
            `Expected ${this.expectValue} to (not)be 500-level status`
          )
        )
  }

  toHaveLength(expectedLength: number) {
    const actualLength = this.expectValue.length
    return this._satisfies(actualLength, expectedLength)
      ? this._pass(
          this._fmtNot(
            `Length expectation of (not)being ${expectedLength} is kept`
          )
        )
      : this._fail(
          this._fmtNot(
            `Expected length to be ${expectedLength} but actual length was ${actualLength}`
          )
        )
  }

  toBeType(expectedType: string) {
    const actualType = typeof this.expectValue
    if (
      ![
        "string",
        "boolean",
        "number",
        "object",
        "undefined",
        "bigint",
        "symbol",
        "function",
      ].includes(expectedType)
    ) {
      return this._fail(
        this._fmtNot(
          `Argument for toBeType should be "string", "boolean", "number", "object", "undefined", "bigint", "symbol" or "function"`
        )
      )
    }
    return this._satisfies(actualType, expectedType)
      ? this._pass(this._fmtNot(`The type is (not)"${expectedType}"`))
      : this._fail(
          this._fmtNot(
            `Expected type to be "${expectedType}" but actual type was "${actualType}"`
          )
        )
  }
}

export function transformResponseForTesting(
  response: HoppRESTResponse
): TestScriptResponse {
  if (response.type === "loading") {
    throw new Error("Cannot transform loading responses")
  }

  if (response.type === "network_fail") {
    throw new Error("Cannot transform failed responses")
  }

  let body: any = new TextDecoder("utf-8").decode(response.body)

  // Try parsing to JSON
  try {
    body = JSON.parse(body)
  } catch (_) {}

  return {
    body,
    headers: response.headers,
    status: response.statusCode,

    __newRes: response,
  }
}
