import {
  runTestScriptWithVariables,
  test as pwTest,
  expect as pwExpect,
  Expectation,
  PASS,
  FAIL,
  ERROR,
} from "../postwomanTesting"

describe("Error handling", () => {
  test("Throws error at unknown test method", () => {
    expect(() => {
      runTestScriptWithVariables("pw.expect(1).toBeSomeUnknownMethod()")
    }).toThrow()
  })
  test("errors array is empty on a successful test", () => {
    expect(runTestScriptWithVariables("pw.expect(1).toBe(1)").errors).toStrictEqual([])
  })
})

describe("toBe", () => {
  test("test for numbers", () => {
    expect(runTestScriptWithVariables("pw.expect(1).toBe(2)").testResults[0].result).toBe(FAIL)
    expect(runTestScriptWithVariables("pw.expect(1).not.toBe(2)").testResults[0].result).toBe(PASS)
    expect(runTestScriptWithVariables("pw.expect(1).toBe(1)").testResults[0].result).toBe(PASS)
    expect(runTestScriptWithVariables("pw.expect(1).not.toBe(1)").testResults[0].result).toBe(FAIL)
  })

  test("dummy script returns correct result", () => {
    expect(runTestScriptWithVariables("pw.expect(200).toBe(300)").testResults[0].result).toBe(FAIL)
    expect(runTestScriptWithVariables("pw.expect(200).toBe(200)").testResults[0].result).toBe(PASS)
  })
})
