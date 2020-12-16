import {
  runTestScriptWithVariables,
  test as pwTest,
  expect as pwExpect,
  Expectation,
  PASS,
  FAIL,
  ERROR,
} from "../postwomanTesting"

function getTestResult(script, index) {
  return runTestScriptWithVariables(script).testResults[index].result
}

function getErrors(script) {
  return runTestScriptWithVariables(script).errors
}

describe("Error handling", () => {
  test("throws error at unknown test method", () => {
    const testScriptWithUnknownMethod = "pw.expect(1).toBeSomeUnknownMethod()"
    expect(() => {
      runTestScriptWithVariables(testScriptWithUnknownMethod)
    }).toThrow()
  })
  test("errors array is empty on a successful test", () => {
    expect(runTestScriptWithVariables("pw.expect(1).toBe(1)").errors).toStrictEqual([])
  })
})

describe("toBe", () => {
  test("test for numbers", () => {
    expect(runTestScriptWithVariables("pw.expect(1).toBe(2)").testResults[0].result).toBe(FAIL)

    expect(runTestScriptWithVariables("pw.expect(1).toBe(1)").testResults[0].result).toBe(PASS)
  })

  test("test for strings", () => {
    expect(
      runTestScriptWithVariables("pw.expect('hello').toBe('bonjour')").testResults[0].result
    ).toBe(FAIL)
    expect(runTestScriptWithVariables("pw.expect('hi').toBe('hi')").testResults[0].result).toBe(
      PASS
    )
  })

  test("test for negative assertion (.not.toBe)", () => {
    expect(runTestScriptWithVariables("pw.expect(1).not.toBe(1)").testResults[0].result).toBe(FAIL)
    expect(runTestScriptWithVariables("pw.expect(1).not.toBe(2)").testResults[0].result).toBe(PASS)
    expect(
      runTestScriptWithVariables("pw.expect('world').not.toBe('planet')").testResults[0].result
    ).toBe(PASS)
    expect(
      runTestScriptWithVariables("pw.expect('world').not.toBe('world')").testResults[0].result
    ).toBe(FAIL)
  })
})

  test("dummy script returns correct result", () => {
    expect(runTestScriptWithVariables("pw.expect(200).toBe(300)").testResults[0].result).toBe(FAIL)
    expect(runTestScriptWithVariables("pw.expect(200).toBe(200)").testResults[0].result).toBe(PASS)
  })
})
