import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import { TestDescriptor } from "~/types"
import { createChaiExpectation } from "~/utils/chai-expectation"

/**
 * Creates enhanced expectation methods that provide Chai-style assertions
 * but work within faraday-cage's serialization constraints
 */
export const createEnhancedExpectationMethods = (
  ctx: CageModuleCtx,
  testRunStack: TestDescriptor[]
) => {
  // Helper function to create a chai expectation with flags
  const createExpectationWithFlags = (expectVal: any, flags: any = {}) => {
    const expectation = createChaiExpectation(expectVal, testRunStack)
    Object.assign((expectation as any)._flags, flags)
    return expectation
  }

  // Helper function to format values for messages
  const formatValue = (val: any) => {
    if (val === null) return "null"
    if (val === undefined) return "undefined"
    if (typeof val === "string") return `'${val}'`
    if (typeof val === "number") {
      if (isNaN(val)) return "NaN"
      // Check if it's Math.PI (approximately)
      if (Math.abs(val - Math.PI) < 0.0000000000001) return "Math.PI"
      return String(val)
    }
    if (Array.isArray(val)) return `[${val.map(formatValue).join(",")}]`
    if (typeof val === "object") {
      // Check for special object states
      const entries = Object.entries(val)
      if (entries.length === 0) {
        if (Object.isFrozen(val)) return "Object.freeze({})"
        if (Object.isSealed(val)) return "Object.seal({})"
      }
      // Format objects like {a: 1} instead of {"a":1}
      const formatted = entries
        .map(([key, value]) => `${key}: ${formatValue(value)}`)
        .join(", ")
      return `{${formatted}}`
    }
    if (typeof val === "function") return `'${val.toString()}'`
    return String(val)
  }

  return {
    // Basic equality - hopp.expect(2).to.equal(2)
    expectEqual: defineSandboxFn(
      ctx,
      "expectEqual",
      (expectVal: any, expectedVal: any, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)

        // Handle "be equal" vs "equal" based on chain context
        if (flags && flags._lastChain === "be") {
          // For hopp.expect(2).to.be.equal(2), we need to override the message
          const resolvedObj = expectVal
          const assertion = flags.deep
            ? JSON.stringify(resolvedObj) === JSON.stringify(expectedVal)
            : resolvedObj === expectedVal
          const objStr = formatValue(resolvedObj)
          const expectedStr = formatValue(expectedVal)
          const message = `Expected ${objStr} to be equal ${expectedStr}`

          // Directly report the result
          if (testRunStack.length > 0) {
            testRunStack[testRunStack.length - 1].expectResults.push({
              status: assertion ? "pass" : "fail",
              message: message,
            })
          }
        } else {
          expectation.equal(expectedVal)
        }
      }
    ),

    // Deep equality assertions - hopp.expect({a: 1}).to.eql({a: 1})
    expectEql: defineSandboxFn(
      ctx,
      "expectEql",
      (expectVal: any, expectedVal: any, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.eql(expectedVal)
      }
    ),

    // Contain assertions - hopp.expect('foo').to.contain('bar')
    expectContain: defineSandboxFn(
      ctx,
      "expectContain",
      (expectVal: any, needle: any, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.contain(needle)
      }
    ),

    // Type assertions - hopp.expect('foo').to.be.a('string')
    expectToBeA: defineSandboxFn(
      ctx,
      "expectToBeA",
      (expectVal: any, type: string, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.a(type)
      }
    ),

    // Truthiness - hopp.expect(true).to.be.true
    expectToBeTruthy: defineSandboxFn(
      ctx,
      "expectToBeTruthy",
      (expectVal: any, truthyType: string, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        switch (truthyType) {
          case "true":
            void (expectation as any).true
            break
          case "false":
            void (expectation as any).false
            break
          case "null":
            void (expectation as any).null
            break
          case "undefined":
            void (expectation as any).undefined
            break
          case "NaN":
            void (expectation as any).NaN
            break
          case "exist":
            void (expectation as any).exist
            break
          case "empty":
            void (expectation as any).empty
            break
          case "ok":
            void (expectation as any).ok
            break
        }
      }
    ),

    // Length assertions - hopp.expect([1,2,3]).to.have.lengthOf(3)
    expectLengthOf: defineSandboxFn(
      ctx,
      "expectLengthOf",
      (expectVal: any, length: number, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.lengthOf(length)
      }
    ),

    // Length assertions - hopp.expect([1,2,3]).to.have.length(3)
    expectLength: defineSandboxFn(
      ctx,
      "expectLength",
      (expectVal: any, length: number, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.length(length)
      }
    ),

    // Property assertions - hopp.expect({a: 1}).to.have.property('a')
    expectProperty: defineSandboxFn(
      ctx,
      "expectProperty",
      (expectVal: any, prop: string, value?: any, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        if (flags && flags.own) {
          expectation.ownProperty(prop, value)
        } else {
          expectation.property(prop, value)
        }
      }
    ),

    // Inclusion assertions - hopp.expect('foobar').to.include('foo')
    expectInclude: defineSandboxFn(
      ctx,
      "expectInclude",
      (expectVal: any, needle: any, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.include(needle)
      }
    ),

    // Numerical comparisons - hopp.expect(2).to.be.above(1)
    expectNumerical: defineSandboxFn(
      ctx,
      "expectNumerical",
      (
        expectVal: any,
        comparison: string,
        value: number,
        value2?: number,
        flags?: any
      ) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        switch (comparison) {
          case "above":
            expectation.above(value)
            break
          case "below":
            expectation.below(value)
            break
          case "least":
            expectation.least(value)
            break
          case "most":
            expectation.most(value)
            break
          case "within":
            if (value2 !== undefined) expectation.within(value, value2)
            break
          case "closeTo":
            if (value2 !== undefined) expectation.closeTo(value, value2)
            break
          case "approximately":
            if (value2 !== undefined) expectation.approximately(value, value2)
            break
          case "finite":
            void (expectation as any).finite
            break
        }
      }
    ),

    // Key assertions - hopp.expect({a: 1, b: 2}).to.have.all.keys('a', 'b')
    expectKeys: defineSandboxFn(
      ctx,
      "expectKeys",
      (expectVal: any, keys: any[], flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.keys(...keys)
      }
    ),

    // Member assertions - hopp.expect([1, 2, 3]).to.have.members([2, 1, 3])
    expectMembers: defineSandboxFn(
      ctx,
      "expectMembers",
      (expectVal: any, members: any[], flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.members(members)
      }
    ),

    // String matching - hopp.expect('foobar').to.match(/^foo/)
    expectMatch: defineSandboxFn(
      ctx,
      "expectMatch",
      (expectVal: any, pattern: RegExp, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)

        // Use preserved regex display string if available
        if (flags && flags._regexDisplay) {
          // Custom match implementation with preserved display
          const resolvedObj = expectVal
          if (typeof resolvedObj !== "string") {
            const objStr = formatValue(resolvedObj)
            if (testRunStack.length > 0) {
              testRunStack[testRunStack.length - 1].expectResults.push({
                status: "fail",
                message: `Expected ${objStr} to be a string`,
              })
            }
            return
          }

          let assertion = false
          try {
            if (pattern && typeof pattern.test === "function") {
              assertion = pattern.test(resolvedObj)
            } else if (typeof pattern === "string") {
              // Handle serialized regex string
              if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
                const lastSlashIndex = pattern.lastIndexOf("/")
                const patternStr = pattern.slice(1, lastSlashIndex)
                const flagsStr = pattern.slice(lastSlashIndex + 1)
                const reconstructedRegex = new RegExp(patternStr, flagsStr)
                assertion = reconstructedRegex.test(resolvedObj)
              } else {
                assertion = resolvedObj.includes(pattern)
              }
            } else {
              // Try to reconstruct regex from object
              const reconstructedRegex = new RegExp(pattern)
              assertion = reconstructedRegex.test(resolvedObj)
            }
          } catch (_e) {
            assertion = resolvedObj.includes(String(pattern))
          }

          const objStr = formatValue(resolvedObj)
          const message = `Expected ${objStr} to match ${flags._regexDisplay}`
          if (testRunStack.length > 0) {
            testRunStack[testRunStack.length - 1].expectResults.push({
              status: assertion ? "pass" : "fail",
              message: message,
            })
          }
        } else {
          expectation.match(pattern)
        }
      }
    ),

    // String contains - hopp.expect('foobar').to.have.string('bar')
    expectString: defineSandboxFn(
      ctx,
      "expectString",
      (expectVal: any, substring: string, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.string(substring)
      }
    ),

    // Instance assertions - hopp.expect([1, 2]).to.be.an.instanceof(Array)
    expectInstanceOf: defineSandboxFn(
      ctx,
      "expectInstanceOf",
      (expectVal: any, constructor: (...args: any[]) => any, flags?: any) => {
        // Use pre-checked instanceof result if available (before serialization)
        if (flags && flags._preCheckedInstance !== undefined) {
          const assertion = flags._preCheckedInstance
          const constructorName = flags._constructorName || "constructor"

          const objStr = formatValue(expectVal)
          const message = `Expected ${objStr} to be an instanceof ${constructorName}`

          if (testRunStack.length > 0) {
            testRunStack[testRunStack.length - 1].expectResults.push({
              status: assertion ? "pass" : "fail",
              message: message,
            })
          }
          return
        }

        // Use preserved constructor information if available (legacy path)
        if (flags && flags._constructorName) {
          let assertion = false
          const constructorName = flags._constructorName

          // Use built-in type checking based on preserved constructor name
          switch (constructorName) {
            case "Array":
              assertion = Array.isArray(expectVal)
              break
            case "Date":
              assertion = expectVal instanceof Date
              break
            case "Error":
              assertion = expectVal instanceof Error
              break
            case "RegExp":
              assertion = expectVal instanceof RegExp
              break
            default:
              // Try to use the original constructor if it's still a function
              if (typeof constructor === "function") {
                assertion = expectVal instanceof constructor
              } else {
                assertion = false
              }
          }

          const objStr = formatValue(expectVal)
          const message = `Expected ${objStr} to be an instanceof ${constructorName}`

          if (testRunStack.length > 0) {
            testRunStack[testRunStack.length - 1].expectResults.push({
              status: assertion ? "pass" : "fail",
              message: message,
            })
          }
          return
        }

        // Fallback to original implementation with defensive programming
        let assertion = false
        let constructorName = "constructor"

        try {
          if (typeof constructor === "function") {
            assertion = expectVal instanceof constructor
            constructorName = constructor.name || "constructor"
          } else if (typeof constructor === "string") {
            // Handle serialized constructor strings
            if (
              constructor.includes("function ") &&
              constructor.includes("native code")
            ) {
              const match = constructor.match(/function (\w+)\(\)/)
              if (match) {
                constructorName = match[1]
                // Use built-in type checking
                switch (constructorName) {
                  case "Array":
                    assertion = Array.isArray(expectVal)
                    break
                  case "Date":
                    assertion = expectVal instanceof Date
                    break
                  case "Error":
                    assertion = expectVal instanceof Error
                    break
                  case "RegExp":
                    assertion = expectVal instanceof RegExp
                    break
                  default:
                    assertion = false
                }
              }
            }
          } else {
            // Try to determine type by object properties
            const objStr = Object.prototype.toString.call(expectVal)
            if (objStr === "[object Array]") {
              assertion =
                constructor === Array ||
                (typeof constructor === "object" &&
                  constructor.name === "Array")
              constructorName = "Array"
            } else if (objStr === "[object Date]") {
              assertion =
                constructor === Date ||
                (typeof constructor === "object" && constructor.name === "Date")
              constructorName = "Date"
            } else if (objStr === "[object Error]") {
              assertion =
                constructor === Error ||
                (typeof constructor === "object" &&
                  constructor.name === "Error")
              constructorName = "Error"
            } else if (objStr === "[object RegExp]") {
              assertion =
                constructor === RegExp ||
                (typeof constructor === "object" &&
                  constructor.name === "RegExp")
              constructorName = "RegExp"
            }
          }
        } catch (_e) {
          assertion = false
        }

        const objStr = formatValue(expectVal)
        const message = `Expected ${objStr} to be an instanceof ${constructorName}`

        if (testRunStack.length > 0) {
          testRunStack[testRunStack.length - 1].expectResults.push({
            status: assertion ? "pass" : "fail",
            message: message,
          })
        }
      }
    ),

    // Function throw assertions - hopp.expect(() => { throw new Error('test') }).to.throw()
    expectThrow: defineSandboxFn(
      ctx,
      "expectThrow",
      (expectVal: any, errorLike?: any, errMsgMatcher?: any, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)

        // Handle preserved regex displays for throw assertions
        if (flags && (flags._errorLikeDisplay || flags._errMsgMatcherDisplay)) {
          // Custom throw implementation with preserved regex displays
          let resolvedObj = expectVal

          // Handle function serialization issue
          if (
            typeof resolvedObj === "string" &&
            (resolvedObj.includes("=>") || resolvedObj.startsWith("function"))
          ) {
            try {
              resolvedObj = eval(`(${resolvedObj})`)
            } catch (_e) {
              // If eval fails, fall back to treating it as a string
            }
          }

          if (typeof resolvedObj !== "function") {
            const objStr = formatValue(expectVal)
            if (testRunStack.length > 0) {
              testRunStack[testRunStack.length - 1].expectResults.push({
                status: "fail",
                message: `Expected ${objStr} to be a function`,
              })
            }
            return
          }

          let didThrow = false
          let thrownError = null

          try {
            resolvedObj()
          } catch (error) {
            didThrow = true
            thrownError = error
          }

          if (!didThrow) {
            const objStr = formatValue(resolvedObj)
            if (testRunStack.length > 0) {
              testRunStack[testRunStack.length - 1].expectResults.push({
                status: "fail",
                message: `Expected ${objStr} to throw`,
              })
            }
            return
          }

          let assertion = true
          let message = ""

          // Check error type/constructor
          if (errorLike !== undefined) {
            if (typeof errorLike === "function") {
              assertion = thrownError instanceof errorLike
              const objStr = formatValue(resolvedObj)
              message = `Expected ${objStr} to throw ${errorLike.name}`
            } else if (flags._errorLikeDisplay) {
              // Use preserved regex display
              try {
                if (errorLike && typeof errorLike.test === "function") {
                  assertion = errorLike.test(thrownError.message)
                } else {
                  // Try to reconstruct regex for testing
                  const regexStr = flags._errorLikeDisplay
                  if (
                    regexStr.startsWith("/") &&
                    regexStr.lastIndexOf("/") > 0
                  ) {
                    const lastSlashIndex = regexStr.lastIndexOf("/")
                    const pattern = regexStr.slice(1, lastSlashIndex)
                    const flagsStr = regexStr.slice(lastSlashIndex + 1)
                    const reconstructedRegex = new RegExp(pattern, flagsStr)
                    assertion =
                      thrownError &&
                      reconstructedRegex.test(thrownError.message)
                  } else {
                    assertion = thrownError && thrownError.message === errorLike
                  }
                }
                const objStr =
                  typeof resolvedObj === "function"
                    ? resolvedObj.toString()
                    : formatValue(resolvedObj)
                message = `Expected ${objStr} to throw ${flags._errorLikeDisplay}`
              } catch (_e) {
                assertion = false
                const objStr = formatValue(resolvedObj)
                message = `Expected ${objStr} to throw`
              }
            } else if (typeof errorLike === "string") {
              assertion = thrownError && thrownError.message === errorLike
              const objStr = formatValue(resolvedObj)
              message = `Expected ${objStr} to throw '${errorLike}'`
            } else {
              assertion = false
              const objStr = formatValue(resolvedObj)
              message = `Expected ${objStr} to throw`
            }
          } else {
            const objStr = formatValue(resolvedObj)
            message = `Expected ${objStr} to throw`
          }

          if (testRunStack.length > 0) {
            testRunStack[testRunStack.length - 1].expectResults.push({
              status: assertion ? "pass" : "fail",
              message: message,
            })
          }
        } else {
          expectation.throw(errorLike, errMsgMatcher)
        }
      }
    ),

    // RespondTo assertions - hopp.expect(cat).to.respondTo('meow')
    expectRespondTo: defineSandboxFn(
      ctx,
      "expectRespondTo",
      (
        expectVal: any,
        method: string,
        flags?: any,
        actualRespondsTo?: boolean
      ) => {
        const expectation = createExpectationWithFlags(expectVal, flags)

        // Inject the pre-checked respondTo state if available
        if (actualRespondsTo !== undefined) {
          void (expectation as any).setPreCheckedRespondTo(
            method,
            actualRespondsTo
          )
        }

        expectation.respondTo(method)
      }
    ),

    // Satisfy assertions - hopp.expect(1).to.satisfy(function(num) { return num > 0 })
    expectSatisfy: defineSandboxFn(
      ctx,
      "expectSatisfy",
      (expectVal: any, matcher: (value: any) => boolean, flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.satisfy(matcher)
      }
    ),

    // OneOf assertions - hopp.expect(1).to.be.oneOf([1, 2, 3])
    expectOneOf: defineSandboxFn(
      ctx,
      "expectOneOf",
      (expectVal: any, list: any[], flags?: any) => {
        const expectation = createExpectationWithFlags(expectVal, flags)
        expectation.oneOf(list)
      }
    ),

    // Chained type + equality assertion - hopp.expect(2).to.be.a('number').that.equals(2)
    expectChainedTypeEquals: defineSandboxFn(
      ctx,
      "expectChainedTypeEquals",
      (
        expectVal: any,
        article: string,
        type: string,
        expectedValue: any,
        flags?: any
      ) => {
        // Remove the standalone type assertion that was just added
        if (testRunStack.length > 0) {
          const currentTest = testRunStack[testRunStack.length - 1]
          // Remove the last expectResult if it's a standalone type assertion
          if (currentTest.expectResults.length > 0) {
            const lastResult =
              currentTest.expectResults[currentTest.expectResults.length - 1]
            const expectedStandaloneMessage = `Expected ${formatValue(expectVal)} to be ${article} ${type}`
            if (lastResult.message === expectedStandaloneMessage) {
              currentTest.expectResults.pop()
            }
          }
        }

        // Validate type assertion
        let typeValid = false
        if (type === "array") {
          typeValid = Array.isArray(expectVal)
        } else {
          typeValid = typeof expectVal === type
        }

        // Validate equality assertion
        let equalValid =
          flags && flags.deep
            ? JSON.stringify(expectVal) === JSON.stringify(expectedValue)
            : expectVal === expectedValue

        // Apply negation
        if (flags && flags.not) {
          typeValid = !typeValid
          equalValid = !equalValid
        }

        const isValid = typeValid && equalValid

        // Format values
        const objStr = formatValue(expectVal)
        const valueStr = formatValue(expectedValue)

        // Build combined message
        const negation = flags && flags.not ? " not" : ""
        const message = `Expected ${objStr} to${negation} be ${article} ${type} that equals ${valueStr}`

        // Report result
        if (testRunStack.length > 0) {
          testRunStack[testRunStack.length - 1].expectResults.push({
            status: isValid ? "pass" : "fail",
            message: message,
          })
        }
      }
    ),

    // Chained type + lengthOf assertion - hopp.expect([1,2,3]).to.be.an('array').that.has.lengthOf(3)
    expectChainedTypeLengthOf: defineSandboxFn(
      ctx,
      "expectChainedTypeLengthOf",
      (
        expectVal: any,
        article: string,
        type: string,
        expectedLength: number,
        flags?: any
      ) => {
        // Remove the standalone type assertion that was just added
        if (testRunStack.length > 0) {
          const currentTest = testRunStack[testRunStack.length - 1]
          // Remove the last expectResult if it's a standalone type assertion
          if (currentTest.expectResults.length > 0) {
            const lastResult =
              currentTest.expectResults[currentTest.expectResults.length - 1]
            const expectedStandaloneMessage = `Expected ${formatValue(expectVal)} to be ${article} ${type}`
            if (lastResult.message === expectedStandaloneMessage) {
              currentTest.expectResults.pop()
            }
          }
        }

        // Validate type assertion (should be array)
        let typeValid = type === "array" && Array.isArray(expectVal)

        // Validate length assertion
        let lengthValid = expectVal && expectVal.length === expectedLength

        // Apply negation
        if (flags && flags.not) {
          typeValid = !typeValid
          lengthValid = !lengthValid
        }

        const isValid = typeValid && lengthValid

        // Format values
        const objStr = formatValue(expectVal)

        // Build combined message
        const negation = flags && flags.not ? " not" : ""
        const message = `Expected ${objStr} to${negation} be ${article} ${type} that has lengthOf ${expectedLength}`

        // Report result
        if (testRunStack.length > 0) {
          testRunStack[testRunStack.length - 1].expectResults.push({
            status: isValid ? "pass" : "fail",
            message: message,
          })
        }
      }
    ),

    // Object state assertions - hopp.expect({a: 1}).to.be.extensible
    expectObjectState: defineSandboxFn(
      ctx,
      "expectObjectState",
      (
        expectVal: any,
        state: string,
        flags?: any,
        actualState?: boolean,
        actualFrozenState?: boolean
      ) => {
        // If actualState is provided, use it (it was checked before serialization)
        // Otherwise fall back to checking the serialized object
        const expectation = createExpectationWithFlags(expectVal, flags)

        // Inject the pre-checked state if available
        if (actualState !== undefined) {
          void (expectation as any).setPreCheckedObjectState(state, actualState)
        }

        // Also inject frozen state if checking sealed (frozen objects are also sealed)
        if (state === "sealed" && actualFrozenState !== undefined) {
          void (expectation as any).setPreCheckedObjectState(
            "frozen",
            actualFrozenState
          )
        }

        switch (state) {
          case "extensible":
            void (expectation as any).extensible
            break
          case "sealed":
            void (expectation as any).sealed
            break
          case "frozen":
            void (expectation as any).frozen
            break
        }
      }
    ),
  }
}
