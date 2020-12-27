import { PASS, FAIL } from "../postwomanTesting"
import runTestScriptWithVariables from "../postwomanTesting"

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
    expect(getErrors("pw.expect(1).toBe(1)")).toStrictEqual([])
  })
  test("throws error at a variable which is not declared", () => {
    expect(() => {
      runTestScriptWithVariables("someVariable")
    }).toThrow()
  })
})

describe("toBe", () => {
  test("test for numbers", () => {
    expect(getTestResult("pw.expect(1).toBe(2)", 0)).toEqual(FAIL)

    expect(getTestResult("pw.expect(1).toBe(1)", 0)).toEqual(PASS)
  })

  test("test for strings", () => {
    expect(getTestResult("pw.expect('hello').toBe('bonjour')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('hi').toBe('hi')", 0)).toEqual(PASS)
  })

  test("test for negative assertion (.not.toBe)", () => {
    expect(getTestResult("pw.expect(1).not.toBe(1)", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(1).not.toBe(2)", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('world').not.toBe('planet')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('world').not.toBe('world')", 0)).toEqual(FAIL)
  })
})

describe("toHaveProperty", () => {
  const dummyResponse = {
    id: 843,
    description: "random",
  }

  test("test for positive assertion (.toHaveProperty)", () => {
    expect(
      getTestResult(`pw.expect(${JSON.stringify(dummyResponse)}).toHaveProperty("id")`, 0)
    ).toEqual(PASS)
    expect(getTestResult(`pw.expect(${dummyResponse.id}).toBe(843)`, 0)).toEqual(PASS)
  })
  test("test for negative assertion (.not.toHaveProperty)", () => {
    expect(
      getTestResult(`pw.expect(${JSON.stringify(dummyResponse)}).not.toHaveProperty("type")`, 0)
    ).toEqual(PASS)
    expect(
      getTestResult(`pw.expect(${JSON.stringify(dummyResponse)}).toHaveProperty("type")`, 0)
    ).toEqual(FAIL)
  })
})

describe("toBeLevel2xx", () => {
  test("test for numbers", () => {
    expect(getTestResult("pw.expect(200).toBeLevel2xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(200).not.toBeLevel2xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(300).toBeLevel2xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(300).not.toBeLevel2xx()", 0)).toEqual(PASS)
  })
  test("test for strings", () => {
    expect(getTestResult("pw.expect('200').toBeLevel2xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('200').not.toBeLevel2xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('300').toBeLevel2xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('300').not.toBeLevel2xx()", 0)).toEqual(PASS)
  })
  test("failed to parse to integer", () => {
    expect(getTestResult("pw.expect(undefined).toBeLevel2xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(null).toBeLevel2xx()", 0)).toEqual(FAIL)
    expect(() => {
      runTestScriptWithVariables("pw.expect(Symbol('test')).toBeLevel2xx()")
    }).toThrow()
  })
})

describe("toBeLevel3xx()", () => {
  test("test for numbers", () => {
    expect(getTestResult("pw.expect(300).toBeLevel3xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(300).not.toBeLevel3xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(400).toBeLevel3xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(400).not.toBeLevel3xx()", 0)).toEqual(PASS)
  })
  test("test for strings", () => {
    expect(getTestResult("pw.expect('300').toBeLevel3xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('300').not.toBeLevel3xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('400').toBeLevel3xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('400').not.toBeLevel3xx()", 0)).toEqual(PASS)
  })
  test("failed to parse to integer", () => {
    expect(getTestResult("pw.expect(undefined).toBeLevel3xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(null).toBeLevel3xx()", 0)).toEqual(FAIL)
    expect(() => {
      runTestScriptWithVariables("pw.expect(Symbol('test')).toBeLevel3xx()")
    }).toThrow()
  })
})

describe("toBeLevel4xx()", () => {
  test("test for numbers", () => {
    expect(getTestResult("pw.expect(400).toBeLevel4xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(400).not.toBeLevel4xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(500).toBeLevel4xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(500).not.toBeLevel4xx()", 0)).toEqual(PASS)
  })
  test("test for strings", () => {
    expect(getTestResult("pw.expect('400').toBeLevel4xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('400').not.toBeLevel4xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('500').toBeLevel4xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('500').not.toBeLevel4xx()", 0)).toEqual(PASS)
  })
  test("failed to parse to integer", () => {
    expect(getTestResult("pw.expect(undefined).toBeLevel4xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(null).toBeLevel4xx()", 0)).toEqual(FAIL)
    expect(() => {
      runTestScriptWithVariables("pw.expect(Symbol('test')).toBeLevel4xx()")
    }).toThrow()
  })
})

describe("toBeLevel5xx()", () => {
  test("test for numbers", () => {
    expect(getTestResult("pw.expect(500).toBeLevel5xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(500).not.toBeLevel5xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(200).toBeLevel5xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(200).not.toBeLevel5xx()", 0)).toEqual(PASS)
  })
  test("test for strings", () => {
    expect(getTestResult("pw.expect('500').toBeLevel5xx()", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('500').not.toBeLevel5xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('200').toBeLevel5xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('200').not.toBeLevel5xx()", 0)).toEqual(PASS)
  })
  test("failed to parse to integer", () => {
    expect(getTestResult("pw.expect(undefined).toBeLevel5xx()", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(null).toBeLevel5xx()", 0)).toEqual(FAIL)
    expect(() => {
      runTestScriptWithVariables("pw.expect(Symbol('test')).toBeLevel5xx()")
    }).toThrow()
  })
})

describe("toHaveLength()", () => {
  test("test for strings", () => {
    expect(getTestResult("pw.expect('word').toHaveLength(4)", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect('word').toHaveLength(5)", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('word').not.toHaveLength(4)", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect('word').not.toHaveLength(5)", 0)).toEqual(PASS)
  })
  test("test for arrays", () => {
    const fruits = "['apples', 'bananas', 'oranges', 'grapes', 'strawberries', 'cherries']"
    expect(getTestResult(`pw.expect(${fruits}).toHaveLength(6)`, 0)).toEqual(PASS)
    expect(getTestResult(`pw.expect(${fruits}).toHaveLength(7)`, 0)).toEqual(FAIL)
    expect(getTestResult(`pw.expect(${fruits}).not.toHaveLength(6)`, 0)).toEqual(FAIL)
    expect(getTestResult(`pw.expect(${fruits}).not.toHaveLength(7)`, 0)).toEqual(PASS)
  })
})

describe("toBeType()", () => {
  test("test for positive assertion", () => {
    expect(getTestResult("pw.expect('random').toBeType('string')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(true).toBeType('boolean')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(5).toBeType('number')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(new Date()).toBeType('object')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(undefined).toBeType('undefined')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(BigInt(123)).toBeType('bigint')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(Symbol('test')).toBeType('symbol')", 0)).toEqual(PASS)
    expect(getTestResult("pw.expect(function() {}).toBeType('function')", 0)).toEqual(PASS)
  })
  test("test for negative assertion", () => {
    expect(getTestResult("pw.expect('random').not.toBeType('string')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(true).not.toBeType('boolean')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(5).not.toBeType('number')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(new Date()).not.toBeType('object')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(undefined).not.toBeType('undefined')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(BigInt(123)).not.toBeType('bigint')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(Symbol('test')).not.toBeType('symbol')", 0)).toEqual(FAIL)
    expect(getTestResult("pw.expect(function() {}).not.toBeType('function')", 0)).toEqual(FAIL)
  })
  test("unexpected type", () => {
    expect(getTestResult("pw.expect('random').toBeType('unknown')", 0)).toEqual(FAIL)
  })
})
