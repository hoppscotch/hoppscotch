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

describe("toHaveProperty", () => {
  const dummyResponse = {
    id: 843,
    description: "random",
  }

  test("test for positive assertion (.toHaveProperty)", () => {
    expect(
      runTestScriptWithVariables(`pw.expect(${JSON.stringify(dummyResponse)}).toHaveProperty("id")`)
        .testResults[0].result
    ).toBe(PASS)
    expect(
      runTestScriptWithVariables(`pw.expect(${dummyResponse.id}).toBe(843)`).testResults[0].result
    ).toBe(PASS)
  })
  test("test for negative assertion (.not.toHaveProperty)", () => {
    expect(
      runTestScriptWithVariables(
        `pw.expect(${JSON.stringify(dummyResponse)}).not.toHaveProperty("type")`
      ).testResults[0].result
    ).toBe(PASS)
    expect(
      runTestScriptWithVariables(
        `pw.expect(${JSON.stringify(dummyResponse)}).toHaveProperty("type")`
      ).testResults[0].result
    ).toBe(FAIL)
  })
})
