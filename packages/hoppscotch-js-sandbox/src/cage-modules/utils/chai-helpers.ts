import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"
import * as chai from "chai"
import { TestDescriptor } from "~/types"

/**
 * Creates Chai-based assertion methods that can be used across the sandbox boundary
 * Each method wraps actual Chai.js assertions and records results to the test stack
 */
export const createChaiMethods: (
  ctx: CageModuleCtx,
  testStack: TestDescriptor[]
) => Record<string, any> = (ctx, testStack) => {
  /**
   * Helper to execute a Chai assertion and record the result
   */
  const executeChaiAssertion = (assertionFn: () => void, message: string) => {
    if (testStack.length === 0) return

    try {
      assertionFn()
      // Record success
      testStack[testStack.length - 1].expectResults.push({
        status: "pass",
        message,
      })
    } catch (_error: any) {
      // Record failure but DON'T throw - allow test to continue
      testStack[testStack.length - 1].expectResults.push({
        status: "fail",
        message,
      })
      // Don't throw - let the test continue to execute all assertions
    }
  }

  /**
   * Helper to format values for display in messages
   */
  // Helper to apply modifiers (not, deep, include, etc.) to a Chai assertion
  const applyModifiers = (value: any, modifiers: string) => {
    let assertion: any = chai.expect(value)
    const isNot = modifiers.includes("not")
    const isDeep = modifiers.includes("deep")
    const isInclude = modifiers.includes("include")

    if (isNot) assertion = assertion.to.not
    else assertion = assertion.to

    if (isInclude) assertion = assertion.include
    if (isDeep) assertion = assertion.deep

    return assertion
  }

  const formatValue = (val: any): string => {
    if (val === null) return "null"
    if (val === undefined) return "undefined"
    // Handle BigInt
    if (typeof val === "bigint") return String(val) + "n"
    // Handle Symbol
    if (typeof val === "symbol") return String(val)
    // Handle functions (including constructors) - return as-is without quotes
    if (typeof val === "function") {
      // For named constructors, return just the name
      if (val.name && /^[A-Z]/.test(val.name)) {
        return val.name
      }
      // For other functions, return the string representation without quotes
      return String(val)
    }
    // Handle strings that look like functions/constructors (serialized from sandbox)
    if (typeof val === "string") {
      const trimmed = val.trim()

      // Check for pre-formatted special values (Set, Map, RegExp patterns)
      if (trimmed.startsWith("new Set(") || trimmed.startsWith("new Map(")) {
        return val // Return without quotes - already formatted
      }
      if (trimmed.match(/^\/.*\/[gimsuvy]*$/)) {
        return val // Return regex pattern without quotes - already formatted
      }

      // Check for constructor names (capitalized identifiers)
      // Only match known built-in constructors to avoid matching regular strings like "Alice"
      const knownConstructors = [
        "Array",
        "Object",
        "String",
        "Number",
        "Boolean",
        "Date",
        "RegExp",
        "Error",
        "TypeError",
        "RangeError",
        "ReferenceError",
        "SyntaxError",
        "Set",
        "Map",
        "WeakSet",
        "WeakMap",
        "Promise",
        "Symbol",
        "Function",
      ]
      // Also allow any identifier ending with "Error" (for custom error types)
      const isErrorConstructor =
        /^[A-Z][a-zA-Z0-9]*Error$/.test(trimmed) ||
        knownConstructors.includes(trimmed)

      if (/^[A-Z][a-zA-Z0-9]*$/.test(trimmed) && isErrorConstructor) {
        return trimmed // Return constructor name without quotes
      }

      // Check if string looks like a function definition
      if (
        trimmed.startsWith("function") ||
        trimmed.match(/^\(.*\)\s*=>/) ||
        trimmed.match(/^[a-zA-Z_$][\w$]*\s*\(/)
      ) {
        // Keep the original function structure instead of simplifying to [Function]
        // This preserves function signatures like "function Cat() {}" in messages
        return trimmed
      }

      // Check for native code functions
      if (trimmed.includes("[native code]")) {
        // Extract function name from "function TypeEr[ror() {\n    [native code]\n}"
        const nameMatch = trimmed.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/)
        if (nameMatch) {
          return nameMatch[1]
        }
      }

      return `'${val}'`
    }
    if (typeof val === "number") {
      if (isNaN(val)) return "NaN"
      if (val === Infinity) return "Infinity"
      if (val === -Infinity) return "-Infinity"
      if (val === Math.PI) return "Math.PI"
      if (val === Math.E) return "Math.E"
      return String(val)
    }
    if (typeof val === "boolean") return String(val)
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]"
      const items = val.slice(0, 10).map(formatValue)
      return `[${items.join(", ")}]` // Space after comma for readability
    }
    if (typeof val === "object") {
      try {
        // Handle special object types
        if (val instanceof Map) {
          const entries = Array.from(val.entries()).slice(0, 3)
          if (entries.length === 0) return "new Map()"
          // Fix Map formatting for .map((entry: any) => ...)
          const formatted = entries.map((entry: any) => {
            return `[${entry[0]}, ${entry[1]}]`
          })
          return `new Map([${formatted.join(", ")}])`
        }
        if (val instanceof Set) {
          const values = Array.from(val).slice(0, 10)
          if (values.length === 0) return "new Set()"
          return `new Set([${values.map(formatValue).join(", ")}])`
        }
        if (val instanceof Date) return `new Date(${val.toISOString()})`
        if (val instanceof RegExp) return val.toString()

        // Check constructor name for objects that lost their prototype
        const constructorName = val.constructor?.name
        if (constructorName && constructorName !== "Object") {
          // Special handling for Set/Map that lost prototype but have size property
          if (constructorName === "Set" && typeof val.size === "number") {
            return `new Set()`
          }
          if (constructorName === "Map" && typeof val.size === "number") {
            return `new Map()`
          }
          // Special handling for RegExp that lost prototype
          if (constructorName === "RegExp" && typeof val.source === "string") {
            const flags = val.flags || ""
            return `/${val.source}/${flags}`
          }
          return `new ${constructorName}()`
        }

        // Check if it's a RegExp that lost its prototype
        if (typeof val.source === "string") {
          const flags = val.flags || ""
          return `/${val.source}/${flags}`
        }

        // Check if it's a Set or Map that lost its prototype
        if (typeof val.size === "number" && typeof val.has === "function") {
          // Likely a Set or Map
          return val.forEach ? "new Set()" : "new Map()"
        }

        const keys = Object.keys(val)
        if (keys.length === 0) return "{}"
        const pairs = keys
          .slice(0, 5)
          .map((k) => `${k}: ${formatValue(val[k])}`)
        return `{${pairs.join(", ")}}`
      } catch {
        return "[object Object]"
      }
    }
    if (typeof val === "function") {
      return val.name || "[Function]"
    }
    return String(val)
  }

  /**
   * Build message with modifiers
   * Cleans up duplicate words and formats properly
   */
  const buildMessage = (
    value: any,
    modifiers: string,
    assertion: string,
    args: any[] = []
  ): string => {
    const valueStr = formatValue(value)

    // Clean up modifiers
    let cleanModifiers = modifiers
      .replace(/\s+/g, " ") // normalize whitespace
      .trim()

    // Remove language chain words that don't add meaning to assertions
    // Handle "that has" and "that does" carefully
    const hasTypePrefix = cleanModifiers.match(
      /\b(array|object|number|string|boolean|function)\s+that\s+has\b/
    )

    if (!hasTypePrefix) {
      // Standalone "that has" -> "have", "that does" -> ""
      cleanModifiers = cleanModifiers.replace(/\bthat\s+has\b/g, "have")
      cleanModifiers = cleanModifiers.replace(/\bthat\s+does\b/g, "")
      // Replace standalone "has" with "have"
      cleanModifiers = cleanModifiers.replace(/\bhas\b/g, "have")
    } else {
      // Keep "that has" when preceded by a type (e.g., "be an array that has lengthOf")
      // Just remove "that does"
      cleanModifiers = cleanModifiers.replace(/\bthat\s+does\b/g, "")
    }

    // Replace "is" with "be"
    cleanModifiers = cleanModifiers.replace(/\bis\b/g, "be")

    // Remove remaining pure language chains (but keep "itself" as it's meaningful)
    const languageChains = ["which", "does", "but"]
    languageChains.forEach((word) => {
      cleanModifiers = cleanModifiers.replace(
        new RegExp(`\\b${word}\\b`, "g"),
        ""
      )
    })

    // Clean up extra spaces after removing words
    cleanModifiers = cleanModifiers.replace(/\s+/g, " ").trim()

    // Remove duplicate consecutive words (e.g., "be be" -> "be", "have have" -> "have")
    cleanModifiers = cleanModifiers.replace(/\b(\w+)(\s+\1\b)+/g, "$1")

    // Ensure it starts with "to" if not empty
    if (cleanModifiers && !cleanModifiers.startsWith("to")) {
      cleanModifiers = "to " + cleanModifiers
    } else if (!cleanModifiers) {
      cleanModifiers = "to"
    }

    // Build base message
    let message = `Expected ${valueStr} ${cleanModifiers}`

    // Add assertion, checking if it duplicates the last word in modifiers
    const modifierWords = cleanModifiers.trim().split(/\s+/)
    const lastModWord = modifierWords[modifierWords.length - 1]
    const firstAssertWord = assertion.split(/\s+/)[0]

    if (lastModWord === firstAssertWord) {
      // Skip the duplicate word in assertion
      const assertionRest = assertion.substring(firstAssertWord.length).trim()
      if (assertionRest) {
        message += ` ${assertionRest}`
      }
    } else {
      message += ` ${assertion}`
    }

    if (args.length > 0) {
      // Special handling for keys assertions
      if (assertion === "keys") {
        let keys = args
        // If first arg is an array and it's the only arg, flatten it
        if (args.length === 1 && Array.isArray(args[0])) {
          keys = args[0]
        }
        // Format keys with quotes (including numbers)
        const keyStrs = keys.map((k) =>
          typeof k === "number" ? `'${k}'` : formatValue(k)
        )
        message += ` ${keyStrs.join(", ")}`
      } else if (assertion === "members") {
        // Format members - if first arg is already an array, don't double-wrap
        if (args.length === 1 && Array.isArray(args[0])) {
          // Single array argument - format its contents directly
          const memberStrs = args[0].map(formatValue)
          message += ` [${memberStrs.join(", ")}]`
        } else {
          // Multiple arguments or non-array - wrap them
          const argStrs = args.map(formatValue)
          message += ` [${argStrs.join(", ")}]`
        }
      } else {
        const argStrs = args.map(formatValue)
        // Add comma separator for property-like assertions, space for others
        const separator = assertion.includes("property") ? ", " : " "
        message += `${separator}${argStrs.join(", ")}`
      }
    }

    return message
  }

  // Return all Chai methods wrapped with defineSandboxFn
  return {
    // Equality assertions
    chaiEqual: defineSandboxFn(ctx, "chaiEqual", ((
      value: any,
      expected: any,
      modifiers: any,
      methodName: any,
      isSameReference?: boolean,
      typeInfo?: any
    ) => {
      const mods = modifiers || " to"
      const isDeep = String(mods).includes("deep")

      // PRE-CHECK PATTERN: Use reference equality check from sandbox
      // ONLY applies to .equal() WITHOUT .deep modifier
      // Special handling: Date/RegExp have typeInfo even after serialization to strings
      if (
        !isDeep &&
        isSameReference !== undefined &&
        (typeInfo ||
          (typeof value === "object" &&
            value !== null &&
            typeof expected === "object" &&
            expected !== null))
      ) {
        const isNegated = String(mods).includes("not")
        const shouldPass = isNegated ? !isSameReference : isSameReference

        // For Date/RegExp, use type info to display proper values
        let displayValue = formatValue(value)
        let displayExpected = formatValue(expected)

        if (typeInfo) {
          if (typeInfo.type === "Date") {
            displayValue = new Date(typeInfo.valueTime).toISOString()
            displayExpected = new Date(typeInfo.expectedTime).toISOString()
          } else if (typeInfo.type === "RegExp") {
            displayValue = `/${typeInfo.valueSource}/${typeInfo.valueFlags}`
            displayExpected = `/${typeInfo.expectedSource}/${typeInfo.expectedFlags}`
          }
        }

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(
                `Expected ${displayValue}${String(mods)} ${methodName || "equal"} ${displayExpected}`
              )
            }
          },
          buildMessage(displayValue, mods, methodName || "equal", [
            displayExpected,
          ])
        )
      } else {
        // For primitives, .deep.equal(), or when reference info not available, use default Chai behavior
        executeChaiAssertion(
          () => applyModifiers(value, mods).equal(expected),
          buildMessage(value, mods, methodName || "equal", [expected])
        )
      }
    }) as any),

    chaiEql: defineSandboxFn(ctx, "chaiEql", ((
      value: any,
      expected: any,
      modifiers?: any,
      valueMetadata?: any,
      expectedMetadata?: any
    ) => {
      const mods = modifiers || " to"

      // PRE-CHECK PATTERN: Use metadata for special objects (RegExp, Date)
      if (valueMetadata && expectedMetadata) {
        const isNegated = String(mods).includes("not")
        let matches = false

        if (valueMetadata.type === "RegExp") {
          // Compare RegExp by source and flags
          matches =
            valueMetadata.source === expectedMetadata.source &&
            valueMetadata.flags === expectedMetadata.flags
        } else if (valueMetadata.type === "Date") {
          // Compare Date by timestamp
          matches = valueMetadata.time === expectedMetadata.time
        }

        const shouldPass = isNegated ? !matches : matches

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              const displayValue =
                valueMetadata.type === "RegExp"
                  ? `/${valueMetadata.source}/${valueMetadata.flags}`
                  : new Date(valueMetadata.time).toISOString()
              const displayExpected =
                expectedMetadata.type === "RegExp"
                  ? `/${expectedMetadata.source}/${expectedMetadata.flags}`
                  : new Date(expectedMetadata.time).toISOString()

              throw new Error(
                `Expected ${displayValue}${String(mods)} eql ${displayExpected}`
              )
            }
          },
          valueMetadata.type === "RegExp"
            ? buildMessage(
                `/${valueMetadata.source}/${valueMetadata.flags}`,
                mods,
                "eql",
                [`/${expectedMetadata.source}/${expectedMetadata.flags}`]
              )
            : buildMessage(value, mods, "eql", [expected])
        )
      } else {
        // Default behavior for non-special objects
        executeChaiAssertion(
          () => applyModifiers(value, mods).eql(expected),
          buildMessage(value, mods, "eql", [expected])
        )
      }
    }) as any),

    chaiDeepEqual: defineSandboxFn(
      ctx,
      "chaiDeepEqual",
      (value: any, expected: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).deep.equal(expected),
          buildMessage(value, mods, "deep equal", [expected])
        )
      }
    ),

    // Type assertions
    chaiTypeOf: defineSandboxFn(
      ctx,
      "chaiTypeOf",
      (value: any, type: any, modifiers?: any, preCheckedType?: any) => {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // Use "an" for vowel sounds, "a" otherwise
        const article = /^[aeiou]/i.test(type) ? "an" : "a"

        // PRE-CHECK PATTERN: Use pre-checked typeof result from sandbox
        // After serialization, functions may not be recognized as functions by Chai
        if (preCheckedType !== undefined) {
          let matches = String(preCheckedType) === String(type)

          // Special case: Arrays are both 'array' and 'object' in JavaScript
          // typeof [] === 'object', but Chai also recognizes 'array'
          if (preCheckedType === "array" && type === "object") {
            matches = true // Arrays should pass for both 'array' and 'object'
          }

          const shouldPass = isNegated ? !matches : matches

          if (testStack.length === 0) return
          testStack[testStack.length - 1].expectResults.push({
            status: shouldPass ? "pass" : "fail",
            message: buildMessage(value, mods, `${article} ${type}`),
          })
        } else {
          // Fallback to Chai's type checking if no pre-check available
          executeChaiAssertion(
            () => applyModifiers(value, mods).be.a(type),
            buildMessage(value, mods, `${article} ${type}`)
          )
        }
      }
    ),

    chaiInstanceOf: defineSandboxFn(
      ctx,
      "chaiInstanceOf",
      function (
        value,
        constructorName,
        modifiers,
        preCheckedType,
        displayValue,
        actualInstanceCheck
      ) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // PRE-CHECK PATTERN: Use Object.prototype.toString result from sandbox
        // We receive the constructor NAME as a string, not the constructor itself
        // Map of constructor names to their Object.prototype.toString signatures
        const builtInTypes: Record<string, string> = {
          Array: "[object Array]",
          Date: "[object Date]",
          Error: "[object Error]",
          RegExp: "[object RegExp]",
          Set: "[object Set]",
          Map: "[object Map]",
          TypeError: "[object Error]",
          RangeError: "[object Error]",
          ReferenceError: "[object Error]",
          SyntaxError: "[object Error]",
        }

        // constructorName is already a string from the sandbox
        const constructorNameStr = String(constructorName)

        // Check if this is a built-in type we can detect
        const expectedType = builtInTypes[constructorNameStr]
        const isBuiltIn = expectedType !== undefined

        // Use pre-checked type if available, otherwise fall back to actual check
        const actualType =
          preCheckedType || Object.prototype.toString.call(value)

        let isInstance: boolean
        // Special case: Object constructor
        // In JavaScript, all objects (arrays, plain objects, dates, etc.) are instanceof Object
        // Check if value is an object type (not null, not undefined, not primitives)
        if (constructorNameStr === "Object") {
          const valueType = typeof value
          const isObjectType =
            value !== null &&
            value !== undefined &&
            (valueType === "object" || valueType === "function")
          isInstance = isObjectType
        } else if (isBuiltIn) {
          // For built-in types, compare Object.prototype.toString results
          isInstance = actualType === expectedType
        } else {
          // For custom types, use the pre-checked result from sandbox
          // The instanceof check was performed before serialization
          isInstance = Boolean(actualInstanceCheck)
        }

        const shouldPass = isNegated ? !isInstance : isInstance

        // Use displayValue if provided (for Set/Map), otherwise use value
        const valueToDisplay = displayValue || value

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(
                `Expected ${formatValue(valueToDisplay)}${String(mods)} be an instanceof ${constructorNameStr}`
              )
            }
          },
          buildMessage(valueToDisplay, String(mods), `be an instanceof`, [
            constructorNameStr,
          ])
        )
      }
    ),

    // Truthiness assertions
    chaiOk: defineSandboxFn(ctx, "chaiOk", (value: any, modifiers?: any) => {
      const mods = modifiers || " to"
      executeChaiAssertion(
        () => {
          const assertion = applyModifiers(value, mods)
          void assertion.be.ok
        },
        buildMessage(value, mods, "ok")
      )
    }),

    chaiTrue: defineSandboxFn(
      ctx,
      "chaiTrue",
      (value: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            void assertion.be.true
          },
          buildMessage(value, mods, "true")
        )
      }
    ),

    chaiFalse: defineSandboxFn(
      ctx,
      "chaiFalse",
      (value: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            void assertion.be.false
          },
          buildMessage(value, mods, "false")
        )
      }
    ),

    // Nullish assertions
    chaiNull: defineSandboxFn(
      ctx,
      "chaiNull",
      (value: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            void assertion.be.null
          },
          buildMessage(value, mods, "null")
        )
      }
    ),

    chaiUndefined: defineSandboxFn(
      ctx,
      "chaiUndefined",
      (value: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            void assertion.be.undefined
          },
          buildMessage(value, mods, "undefined")
        )
      }
    ),

    chaiNaN: defineSandboxFn(ctx, "chaiNaN", (value: any, modifiers?: any) => {
      const mods = modifiers || " to"
      executeChaiAssertion(
        () => {
          const assertion = applyModifiers(value, mods)
          void assertion.be.NaN
        },
        buildMessage(value, mods, "NaN")
      )
    }),

    chaiExist: defineSandboxFn(
      ctx,
      "chaiExist",
      (value: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            void assertion.exist
          },
          buildMessage(value, mods, "exist")
        )
      }
    ),

    // Emptiness assertions
    chaiEmpty: defineSandboxFn(
      ctx,
      "chaiEmpty",
      (value: any, modifiers?: any, typeName?: any, actualSize?: any) => {
        const mods = modifiers || " to"
        // Special handling for Set/Map
        let isEmpty = false
        let displayValue = value

        if (typeName === "Set" || typeName === "Map") {
          // Use pre-checked size from sandbox
          isEmpty = actualSize === 0
          if (actualSize === 0) {
            displayValue = "{}"
          } else {
            // After serialization, Set/Map become {}, but we have the info they weren't empty
            displayValue = value
          }
        } else if (value instanceof Set) {
          isEmpty = value.size === 0
          displayValue =
            value.size === 0
              ? "new Set()"
              : `new Set([${Array.from(value).join(", ")}])`
        } else if (value instanceof Map) {
          isEmpty = value.size === 0
          displayValue =
            value.size === 0
              ? "new Map()"
              : `new Map([${Array.from(value.entries())
                  .map((entry: any) => `[${entry[0]}, ${entry[1]}]`)
                  .join(", ")}])`
        } else if (Array.isArray(value)) {
          isEmpty = value.length === 0
        } else if (typeof value === "object" && value !== null) {
          isEmpty = Object.keys(value).length === 0
        } else if (typeof value === "string") {
          isEmpty = value.length === 0
        }
        const isNegated = String(mods).includes("not")
        const pass = isNegated ? !isEmpty : isEmpty
        if (testStack.length === 0) return
        testStack[testStack.length - 1].expectResults.push({
          status: pass ? "pass" : "fail",
          message: buildMessage(displayValue, mods, "empty"),
        })
      }
    ),

    // Inclusion assertions
    chaiInclude: defineSandboxFn(
      ctx,
      "chaiInclude",
      (value: any, item: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).include(item),
          buildMessage(value, mods, "include", [item])
        )
      }
    ),

    chaiDeepInclude: defineSandboxFn(
      ctx,
      "chaiDeepInclude",
      (value: any, item: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).deep.include(item),
          buildMessage(value, mods, "deep include", [item])
        )
      }
    ),

    chaiIncludeKeys: defineSandboxFn(
      ctx,
      "chaiIncludeKeys",
      (value: any, keys: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.include.keys(...keys)
          },
          buildMessage(value, mods, "include keys", keys)
        )
      }
    ),

    // Length assertions
    chaiLengthOf: defineSandboxFn(
      ctx,
      "chaiLengthOf",
      function (
        value: any,
        length: any,
        modifiers: any,
        methodName: any,
        actualSize?: any,
        typeName?: any
      ) {
        const mods = (modifiers || " to") as string
        const assertion = mods.trim().endsWith("has")
          ? methodName || "lengthOf"
          : `have ${methodName || "lengthOf"}`
        if (actualSize !== undefined && typeName) {
          if (testStack.length === 0) return
          const matches = Number(actualSize) === Number(length)
          const negated = mods.includes("not")
          const pass = negated ? !matches : matches
          let displayValue = value
          if (typeof typeName === "string") {
            if (typeName.includes("Set")) {
              displayValue = `new Set([${Array.from(value).join(", ")}])`
            } else if (typeName.includes("Map")) {
              displayValue = `new Map([${Array.from(value.entries())
                .map((entry: any) => `[${entry[0]}, ${entry[1]}]`)
                .join(", ")}])`
            }
          }
          testStack[testStack.length - 1].expectResults.push({
            status: pass ? "pass" : "fail",
            message: buildMessage(displayValue, mods, assertion, [length]),
          })
        } else if (value instanceof Set) {
          if (testStack.length === 0) return
          const matches = value.size === Number(length)
          const negated = mods.includes("not")
          const pass = negated ? !matches : matches
          const displayValue = `new Set([${Array.from(value).join(", ")}])`
          testStack[testStack.length - 1].expectResults.push({
            status: pass ? "pass" : "fail",
            message: buildMessage(displayValue, mods, assertion, [length]),
          })
        } else if (value instanceof Map) {
          if (testStack.length === 0) return
          const matches = value.size === Number(length)
          const negated = mods.includes("not")
          const pass = negated ? !matches : matches
          const displayValue = `new Map([${Array.from(value.entries())
            .map((entry: any) => `[${entry[0]}, ${entry[1]}]`)
            .join(", ")}])`
          testStack[testStack.length - 1].expectResults.push({
            status: pass ? "pass" : "fail",
            message: buildMessage(displayValue, mods, assertion, [length]),
          })
        } else {
          // Handle negation for regular arrays/strings
          const negated = mods.includes("not")
          executeChaiAssertion(
            () => {
              const expectChain = chai.expect(value)
              if (negated) {
                expectChain.to.not.have.lengthOf(Number(length))
              } else {
                expectChain.to.have.lengthOf(Number(length))
              }
            },
            buildMessage(value, mods, assertion, [length])
          )
        }
      }
    ),

    // Property assertions
    chaiProperty: defineSandboxFn(ctx, "chaiProperty", ((
      value: any,
      property: any,
      propertyValue?: any,
      modifiers?: any,
      hasProperty?: boolean
    ) => {
      const mods = modifiers || " to"
      const hasValue = propertyValue !== undefined

      // PRE-CHECK PATTERN: Use property existence check from sandbox
      // ONLY when checking existence (no value assertion)
      if (
        !hasValue &&
        hasProperty !== undefined &&
        typeof value === "object" &&
        value !== null
      ) {
        const isNegated = String(mods).includes("not")
        const shouldPass = isNegated ? !hasProperty : hasProperty

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(
                `Expected ${formatValue(value)}${String(mods)} have property '${property}'`
              )
            }
          },
          buildMessage(value, mods, `property '${property}'`)
        )
      } else {
        // For primitives, value assertions, or when property existence info not available
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            if (hasValue) {
              assertion.have.property(property, propertyValue)
            } else {
              assertion.have.property(property)
            }
          },
          hasValue
            ? buildMessage(value, mods, `property '${property}'`, [
                propertyValue,
              ])
            : buildMessage(value, mods, `property '${property}'`)
        )
      }
    }) as any),

    chaiOwnProperty: defineSandboxFn(ctx, "chaiOwnProperty", ((
      value: any,
      property: any,
      modifiers?: any,
      isOwnProperty?: boolean
    ) => {
      const mods = modifiers || " to"

      // PRE-CHECK PATTERN: Use hasOwnProperty check from sandbox
      // When prototype chain info is available, use it directly
      if (
        isOwnProperty !== undefined &&
        typeof value === "object" &&
        value !== null
      ) {
        const isNegated = String(mods).includes("not")
        const shouldPass = isNegated ? !isOwnProperty : isOwnProperty

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(
                `Expected ${formatValue(value)}${String(mods)} have own property '${property}'`
              )
            }
          },
          buildMessage(value, mods, `own property '${property}'`)
        )
      } else {
        // For primitives or when hasOwnProperty info not available, use default Chai behavior
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.own.property(property)
          },
          buildMessage(value, mods, `own property '${property}'`)
        )
      }
    }) as any),

    chaiDeepOwnProperty: defineSandboxFn(
      ctx,
      "chaiDeepOwnProperty",
      (value: any, property: any, propertyValue: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () =>
            chai
              .expect(value)
              .to.have.deep.own.property(property, propertyValue),
          buildMessage(value, mods, `property '${property}'`, [propertyValue])
        )
      }
    ),

    chaiNestedProperty: defineSandboxFn(
      ctx,
      "chaiNestedProperty",
      (value: any, property: any, propertyValue?: any, modifiers?: any) => {
        const mods = modifiers || " to"
        const hasValue = propertyValue !== undefined
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            if (hasValue) {
              assertion.have.nested.property(property, propertyValue)
            } else {
              assertion.have.nested.property(property)
            }
          },
          hasValue
            ? buildMessage(value, mods, `property '${property}'`, [
                propertyValue,
              ])
            : buildMessage(value, mods, `property '${property}'`)
        )
      }
    ),

    chaiNestedInclude: defineSandboxFn(
      ctx,
      "chaiNestedInclude",
      (value: any, obj: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.nested.include(obj)
          },
          buildMessage(value, mods, "nested include", [obj])
        )
      }
    ),

    // Numerical comparisons
    chaiAbove: defineSandboxFn(
      ctx,
      "chaiAbove",
      (value: any, n: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).be.above(n),
          buildMessage(value, mods, "above", [n])
        )
      }
    ),

    chaiBelow: defineSandboxFn(
      ctx,
      "chaiBelow",
      (value: any, n: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).be.below(n),
          buildMessage(value, mods, "below", [n])
        )
      }
    ),

    chaiAtLeast: defineSandboxFn(
      ctx,
      "chaiAtLeast",
      (value: any, n: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).be.at.least(n),
          buildMessage(value, mods, "at least", [n])
        )
      }
    ),

    chaiAtMost: defineSandboxFn(
      ctx,
      "chaiAtMost",
      (value: any, n: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).be.at.most(n),
          buildMessage(value, mods, "at most", [n])
        )
      }
    ),

    chaiWithin: defineSandboxFn(
      ctx,
      "chaiWithin",
      (value: any, start: any, end: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => applyModifiers(value, mods).be.within(start, end),
          buildMessage(value, mods, "within", [start, end])
        )
      }
    ),

    chaiCloseTo: defineSandboxFn(
      ctx,
      "chaiCloseTo",
      (
        value: any,
        expected: any,
        delta: any,
        modifiers?: any,
        methodName?: any
      ) => {
        const mods = modifiers || " to"
        const method = methodName || "closeTo"
        executeChaiAssertion(
          () => applyModifiers(value, mods).be.closeTo(expected, delta),
          buildMessage(value, mods, method, [expected, delta])
        )
      }
    ),

    // Keys assertions
    chaiKeys: defineSandboxFn(
      ctx,
      "chaiKeys",
      (value: any, keys: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.keys(...keys)
          },
          buildMessage(value, mods, "keys", keys)
        )
      }
    ),

    chaiAllKeys: defineSandboxFn(
      ctx,
      "chaiAllKeys",
      (value: any, keys: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.all.keys(...keys)
          },
          buildMessage(value, mods, "keys", keys)
        )
      }
    ),

    chaiAnyKeys: defineSandboxFn(
      ctx,
      "chaiAnyKeys",
      (value: any, keys: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.any.keys(...keys)
          },
          buildMessage(value, mods, "keys", keys)
        )
      }
    ),

    // String/Pattern matching
    chaiMatch: defineSandboxFn(
      ctx,
      "chaiMatch",
      function (
        value: any,
        pattern: any,
        modifiers: any,
        regexSource?: any,
        regexFlags?: any
      ) {
        const mods = modifiers || " to"
        let actualPattern = pattern
        let displayPattern = pattern
        if (regexSource !== undefined) {
          actualPattern = new RegExp(
            String(regexSource),
            String(regexFlags || "")
          )
          displayPattern = `/${regexSource}/${regexFlags || ""}`
        }
        const isNegated = String(mods).includes("not")
        let matched = false
        try {
          matched = Boolean(
            actualPattern instanceof RegExp
              ? actualPattern.test(value)
              : String(value).match(actualPattern)
          )
        } catch {
          matched = false
        }
        const pass = isNegated ? !matched : matched
        if (testStack.length === 0) return
        const displayValue = typeof value === "string" ? value : String(value)
        const notStr = isNegated ? " not" : ""
        testStack[testStack.length - 1].expectResults.push({
          status: pass ? "pass" : "fail",
          message: `Expected '${displayValue}' to${notStr} match ${displayPattern}`,
        })
      }
    ),
    chaiString: defineSandboxFn(
      ctx,
      "chaiString",
      function (value: any, substring: any, modifiers?: any) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const valueStr = String(value)
        const hasSubstring = valueStr.includes(String(substring))
        const shouldPass = isNegated ? !hasSubstring : hasSubstring

        if (testStack.length === 0) return

        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, "have string", [`'${substring}'`]),
        })
      }
    ),

    // Members assertions
    chaiMembers: defineSandboxFn(
      ctx,
      "chaiMembers",
      (value: any, members: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.members(members)
          },
          buildMessage(value, mods, "members", [members])
        )
      }
    ),

    chaiIncludeMembers: defineSandboxFn(
      ctx,
      "chaiIncludeMembers",
      (value: any, members: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.include.members(members)
          },
          buildMessage(value, mods, "include members", [members])
        )
      }
    ),

    chaiOrderedMembers: defineSandboxFn(
      ctx,
      "chaiOrderedMembers",
      (value: any, members: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.ordered.members(members)
          },
          buildMessage(value, mods, "members", [...members])
        )
      }
    ),

    chaiDeepMembers: defineSandboxFn(
      ctx,
      "chaiDeepMembers",
      (value: any, members: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            assertion.have.deep.members(members)
          },
          buildMessage(value, mods, "members", [members])
        )
      }
    ),

    // OneOf assertion
    chaiOneOf: defineSandboxFn(
      ctx,
      "chaiOneOf",
      (value: any, list: any, modifiers?: any) => {
        const mods = modifiers || " to"
        const isInclude = String(mods).includes("include")
        const assertion = isInclude ? "include oneOf" : "oneOf"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            if (isInclude) {
              assertion.include.oneOf(list)
            } else {
              assertion.be.oneOf(list)
            }
          },
          buildMessage(value, mods, assertion, [list])
        )
      }
    ),

    // Object state assertions
    // PRE-CHECKING PATTERN: Check object state BEFORE serialization
    // The pre-checking is done in post-request.js (sandbox context) and passed as a third parameter
    // This is because after serialization, objects lose their frozen/sealed/extensible state
    chaiExtensible: defineSandboxFn(
      ctx,
      "chaiExtensible",
      (value, modifiers, preCheckedResult) => {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")
        // Use the pre-checked result from sandbox (before serialization)
        const isExtensible =
          preCheckedResult !== undefined
            ? preCheckedResult
            : Object.isExtensible(value)
        const shouldPass = isNegated ? !isExtensible : isExtensible

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(
                `Expected ${formatValue(value)}${mods} be extensible`
              )
            }
          },
          // For buildMessage calls for extensible, sealed, frozen, pass "{}" if value is an empty object, otherwise String(value)
          buildMessage(
            Object.keys(value as object).length === 0 ? "{}" : String(value),
            String(mods),
            "extensible"
          )
        )
      }
    ),

    chaiSealed: defineSandboxFn(
      ctx,
      "chaiSealed",
      (value, modifiers, preCheckedResult) => {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")
        // Use the pre-checked result from sandbox (before serialization)
        const isSealed =
          preCheckedResult !== undefined
            ? preCheckedResult
            : Object.isSealed(value)
        const shouldPass = isNegated ? !isSealed : isSealed

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(`Expected ${formatValue(value)}${mods} be sealed`)
            }
          },
          // For buildMessage calls for extensible, sealed, frozen, pass "{}" if value is an empty object, otherwise String(value)
          buildMessage(
            Object.keys(value as object).length === 0 ? "{}" : String(value),
            String(mods),
            "sealed"
          )
        )
      }
    ),

    chaiFrozen: defineSandboxFn(
      ctx,
      "chaiFrozen",
      (value, modifiers, preCheckedResult) => {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")
        // Use the pre-checked result from sandbox (before serialization)
        const isFrozen =
          preCheckedResult !== undefined
            ? preCheckedResult
            : Object.isFrozen(value)
        const shouldPass = isNegated ? !isFrozen : isFrozen

        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(`Expected ${formatValue(value)}${mods} be frozen`)
            }
          },
          // For buildMessage calls for extensible, sealed, frozen, pass "{}" if value is an empty object, otherwise String(value)
          buildMessage(
            Object.keys(value as object).length === 0 ? "{}" : String(value),
            String(mods),
            "frozen"
          )
        )
      }
    ),

    // Number state assertions
    chaiFinite: defineSandboxFn(
      ctx,
      "chaiFinite",
      (value: any, modifiers?: any) => {
        const mods = modifiers || " to"
        executeChaiAssertion(
          () => {
            const assertion = applyModifiers(value, mods)
            void assertion.be.finite
          },
          buildMessage(value, mods, "finite")
        )
      }
    ),

    // Arguments object assertion
    chaiArguments: defineSandboxFn(
      ctx,
      "chaiArguments",
      (value: any, modifiers?: any, preCheckedResult?: any) => {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")
        const isArguments =
          preCheckedResult !== undefined
            ? preCheckedResult
            : Object.prototype.toString.call(value) === "[object Arguments]"
        const shouldPass = isNegated ? !isArguments : isArguments
        // Extract "arguments" or "Arguments" from modifiers
        const assertionName =
          mods.match(/\b(arguments|Arguments)\b/)?.[1] || "arguments"
        if (testStack.length === 0) return
        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, assertionName),
        })
      }
    ),

    // Property descriptor assertion
    chaiOwnPropertyDescriptor: defineSandboxFn(
      ctx,
      "chaiOwnPropertyDescriptor",
      function (
        _value,
        prop,
        descriptor,
        modifiers,
        hasDescriptor,
        matchesExpected
      ) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // PRE-CHECK PATTERN: Use pre-checked results from sandbox
        // After serialization, property descriptors lose metadata
        let shouldPass = false

        if (descriptor !== undefined) {
          // When descriptor comparison is provided
          if (isNegated) {
            shouldPass = !hasDescriptor || !matchesExpected
          } else {
            shouldPass = Boolean(hasDescriptor && matchesExpected)
          }
        } else {
          // When only checking for existence
          if (isNegated) {
            shouldPass = !hasDescriptor
          } else {
            shouldPass = Boolean(hasDescriptor)
          }
        }

        if (testStack.length === 0) return
        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: `Expected {}${mods} ownPropertyDescriptor '${prop}'`,
        })
      }
    ),

    // Include deep ordered members
    chaiIncludeDeepOrderedMembers: defineSandboxFn(
      ctx,
      "chaiIncludeDeepOrderedMembers",
      function (value: any, members: any, modifiers?: any) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")
        let pass = false
        try {
          chai.expect(value).to.include.deep.ordered.members(members)
          pass = !isNegated
        } catch {
          pass = isNegated
        }
        if (testStack.length === 0) return
        testStack[testStack.length - 1].expectResults.push({
          status: pass ? "pass" : "fail",
          message: buildMessage(value, mods, "members", [...members]),
        })
      }
    ),

    chaiRespondTo: defineSandboxFn(
      ctx,
      "chaiRespondTo",
      function (value, method, modifiers, preCheckedResult) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")
        // PRE-CHECK PATTERN: Use pre-checked result from sandbox
        // After serialization, functions become strings and method checks fail
        const hasMethod =
          preCheckedResult !== undefined
            ? preCheckedResult
            : typeof (value as any)?.[method as string] === "function" ||
              typeof (value as any)?.prototype?.[method as string] ===
                "function"
        const shouldPass = isNegated ? !hasMethod : hasMethod
        executeChaiAssertion(
          () => {
            if (!shouldPass) {
              throw new Error(
                `Expected ${formatValue(value)}${String(mods)} respondTo '${method}'`
              )
            }
          },
          buildMessage(value, String(mods), `respondTo '${method}'`)
        )
      }
    ),

    // Function throw assertion
    chaiThrow: defineSandboxFn(
      ctx,
      "chaiThrow",
      function (
        fn: any,
        threwError: any,
        errorTypeName: any,
        errorMessage: any,
        expectedTypeName: any,
        errMsgMatcher: any,
        regexSource: any,
        regexFlags: any,
        isRegexMatcher: any,
        modifiers: any
      ) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")

        // Determine what we're checking for
        const hasErrorType =
          expectedTypeName !== null && expectedTypeName !== undefined
        const hasErrorMessage =
          errMsgMatcher !== undefined && errMsgMatcher !== null
        const hasRegexPattern = Boolean(isRegexMatcher)

        // Check if assertion should pass
        let shouldPass = false

        if (isNegated) {
          // For negated (.not.throw), logic depends on what's being checked
          if (hasErrorType) {
            // .not.throw(ErrorType) should pass if:
            // 1. Didn't throw at all, OR
            // 2. Threw a different error type
            shouldPass =
              !threwError || String(errorTypeName) !== String(expectedTypeName)
          } else if (hasErrorMessage || hasRegexPattern) {
            // .not.throw('message') should pass if:
            // 1. Didn't throw at all, OR
            // 2. Threw with a different message
            if (!threwError) {
              shouldPass = true
            } else if (hasRegexPattern) {
              const regex = new RegExp(
                String(regexSource),
                String(regexFlags || "")
              )
              shouldPass = !regex.test(String(errorMessage || ""))
            } else {
              const errMsg = String(errorMessage || "")
              const matchMsg = String(errMsgMatcher || "")
              shouldPass = errMsg !== matchMsg && !errMsg.includes(matchMsg)
            }
          } else {
            // .not.throw() with no args should pass if did NOT throw
            shouldPass = !threwError
          }
        } else {
          // For positive assertion, should pass if threw error
          shouldPass = Boolean(threwError)

          // Additional checks if error was thrown
          if (threwError && hasErrorType) {
            shouldPass =
              shouldPass && String(errorTypeName) === String(expectedTypeName)
          }

          if (threwError && hasErrorMessage && !hasRegexPattern) {
            // String message match
            const errMsg = String(errorMessage || "")
            const matchMsg = String(errMsgMatcher || "")
            shouldPass =
              shouldPass && (errMsg === matchMsg || errMsg.includes(matchMsg))
          }

          if (threwError && hasRegexPattern) {
            // RegExp message match
            const regex = new RegExp(
              String(regexSource),
              String(regexFlags || "")
            )
            shouldPass = shouldPass && regex.test(String(errorMessage || ""))
          }
        }

        // Build appropriate message
        const messageArgs: string[] = []
        if (hasErrorType && hasErrorMessage) {
          if (hasRegexPattern) {
            messageArgs.push(
              String(expectedTypeName),
              `/${regexSource}/${regexFlags || ""}`
            )
          } else {
            messageArgs.push(String(expectedTypeName), String(errMsgMatcher))
          }
        } else if (hasErrorType) {
          messageArgs.push(String(expectedTypeName))
        } else if (hasErrorMessage) {
          if (hasRegexPattern) {
            messageArgs.push(`/${regexSource}/${regexFlags || ""}`)
          } else {
            messageArgs.push(String(errMsgMatcher))
          }
        }

        if (testStack.length === 0) return
        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(fn, mods, "throw", messageArgs.filter(Boolean)),
        })
      }
    ),

    // Function satisfy assertion
    chaiSatisfy: defineSandboxFn(
      ctx,
      "chaiSatisfy",
      function (
        value: any,
        satisfyResult: any,
        matcherString: any,
        modifiers: any
      ) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const passed = Boolean(satisfyResult)
        const shouldPass = isNegated ? !passed : passed

        if (testStack.length === 0) return
        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, "satisfy", [
            String(matcherString),
          ]),
        })
      }
    ),

    // change/increase/decrease assertions (pre-check pattern - function already executed in sandbox)
    chaiChange: defineSandboxFn(
      ctx,
      "chaiChange",
      function (prop, modifiers, changed, _delta) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const shouldPass = isNegated ? !changed : changed

        if (testStack.length === 0) return

        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: `Expected [Function]${mods} change {}.'${prop}'`,
        })
      }
    ),

    chaiChangeBy: defineSandboxFn(
      ctx,
      "chaiChangeBy",
      function (prop, modifiers, changed, delta, expectedDelta) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const numDelta = Number(delta)
        const actualDelta = Math.abs(numDelta)
        const numExpectedDelta = Number(expectedDelta)
        const deltaMatches =
          Math.abs(actualDelta - Math.abs(numExpectedDelta)) < 0.0001
        const byPasses = changed && deltaMatches
        const byShouldPass = isNegated ? !byPasses : byPasses

        if (testStack.length === 0) return

        // Update the last result (from chaiChange)
        const lastResult =
          testStack[testStack.length - 1].expectResults[
            testStack[testStack.length - 1].expectResults.length - 1
          ]
        lastResult.status = byShouldPass ? "pass" : "fail"
        lastResult.message = `Expected [Function]${mods} change {}.'${prop}' by ${numExpectedDelta}`
      }
    ),

    chaiIncrease: defineSandboxFn(
      ctx,
      "chaiIncrease",
      function (prop, modifiers, increased, _delta) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const shouldPass = isNegated ? !increased : increased

        if (testStack.length === 0) return

        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: `Expected [Function]${mods} increase {}.'${prop}'`,
        })
      }
    ),

    chaiIncreaseBy: defineSandboxFn(
      ctx,
      "chaiIncreaseBy",
      function (prop, modifiers, increased, delta, expectedDelta) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const numDelta = Number(delta)
        const numExpectedDelta = Number(expectedDelta)
        const deltaMatches = Math.abs(numDelta - numExpectedDelta) < 0.0001
        const byPasses = increased && deltaMatches
        const byShouldPass = isNegated ? !byPasses : byPasses

        if (testStack.length === 0) return

        // Update the last result (from chaiIncrease)
        const lastResult =
          testStack[testStack.length - 1].expectResults[
            testStack[testStack.length - 1].expectResults.length - 1
          ]
        lastResult.status = byShouldPass ? "pass" : "fail"
        lastResult.message = `Expected [Function]${mods} increase {}.'${prop}' by ${numExpectedDelta}`
      }
    ),

    chaiDecrease: defineSandboxFn(
      ctx,
      "chaiDecrease",
      function (prop, modifiers, decreased, _delta) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const shouldPass = isNegated ? !decreased : decreased

        if (testStack.length === 0) return

        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: `Expected [Function]${mods} decrease {}.'${prop}'`,
        })
      }
    ),

    chaiDecreaseBy: defineSandboxFn(
      ctx,
      "chaiDecreaseBy",
      function (prop, modifiers, decreased, delta, expectedDelta) {
        const mods = String(modifiers || " to")
        const isNegated = mods.includes("not")
        const numDelta = Number(delta)
        const numExpectedDelta = Number(expectedDelta)
        const deltaMatches =
          Math.abs(Math.abs(numDelta) - numExpectedDelta) < 0.0001
        const byPasses = decreased && deltaMatches
        const byShouldPass = isNegated ? !byPasses : byPasses

        if (testStack.length === 0) return

        // Update the last result (from chaiDecrease)
        const lastResult =
          testStack[testStack.length - 1].expectResults[
            testStack[testStack.length - 1].expectResults.length - 1
          ]
        lastResult.status = byShouldPass ? "pass" : "fail"
        lastResult.message = `Expected [Function]${mods} decrease {}.'${prop}' by ${numExpectedDelta}`
      }
    ),

    // Custom Postman-specific methods
    chaiJsonSchema: defineSandboxFn(
      ctx,
      "chaiJsonSchema",
      function (value: any, schema: any, modifiers: any) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // Validation helper
        const validateSchema = (data: any, schema: any): boolean => {
          // Type validation
          if (schema.type !== undefined) {
            const actualType = Array.isArray(data) ? "array" : typeof data
            if (actualType !== schema.type) return false
          }

          // Required properties
          if (schema.required && Array.isArray(schema.required)) {
            for (const key of schema.required) {
              if (!(key in data)) return false
            }
          }

          // Properties validation
          if (schema.properties && typeof data === "object" && data !== null) {
            for (const key in schema.properties) {
              if (key in data) {
                const propSchema = schema.properties[key]
                if (!validateSchema(data[key], propSchema)) return false
              }
            }
          }

          return true
        }

        const passes = validateSchema(value, schema)
        const shouldPass = isNegated ? !passes : passes

        if (testStack.length === 0) return

        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, "jsonSchema", [schema]),
        })
      }
    ),

    chaiCharset: defineSandboxFn(
      ctx,
      "chaiCharset",
      function (value: any, expectedCharset: any, modifiers: any) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // For response body testing, check Content-Type header charset
        const passes = typeof value === "string" // Simplified check

        const shouldPass = isNegated ? !passes : passes

        if (testStack.length === 0) return

        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, "charset", [expectedCharset]),
        })
      }
    ),

    chaiCookie: defineSandboxFn(
      ctx,
      "chaiCookie",
      function (value: any, cookieName: any, cookieValue: any, modifiers: any) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // Simplified: check if cookie-like structure has name
        const hasCookie =
          typeof value === "object" && value !== null && cookieName in value
        const valueMatches =
          cookieValue === undefined || value[cookieName] === cookieValue

        const passes = hasCookie && valueMatches
        const shouldPass = isNegated ? !passes : passes

        if (testStack.length === 0) return

        const args =
          cookieValue !== undefined ? [cookieName, cookieValue] : [cookieName]
        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, "cookie", args),
        })
      }
    ),

    chaiJsonPath: defineSandboxFn(
      ctx,
      "chaiJsonPath",
      function (value: any, path: any, expectedValue: any, modifiers: any) {
        const mods = modifiers || " to"
        const isNegated = String(mods).includes("not")

        // Enhanced JSONPath evaluation (supports $.path, array indices, wildcards)
        const evaluatePath = (data: any, path: string): any => {
          let pathStr = String(path).trim()

          // Remove leading $. if present
          if (pathStr.startsWith("$.")) {
            pathStr = pathStr.substring(2)
          } else if (pathStr.startsWith("$")) {
            pathStr = pathStr.substring(1)
          }

          // Handle empty path (just "$")
          if (!pathStr || pathStr === "") {
            return data
          }

          let current: any = data
          const segments = pathStr.split(/\.|\[/).filter(Boolean)

          for (let segment of segments) {
            // Remove trailing ] for array indices
            segment = segment.replace(/\]$/, "")

            if (segment === "*") {
              // Wildcard - return array of all values
              if (Array.isArray(current)) {
                return current // For array[*], return the array itself
              } else if (typeof current === "object" && current !== null) {
                return Object.values(current)
              }
              return undefined
            } else if (/^\d+$/.test(segment)) {
              // Numeric index
              const index = parseInt(segment, 10)
              if (
                Array.isArray(current) &&
                index >= 0 &&
                index < current.length
              ) {
                current = current[index]
              } else {
                return undefined
              }
            } else {
              // Object property
              if (
                current &&
                typeof current === "object" &&
                segment in current
              ) {
                current = current[segment]
              } else {
                return undefined
              }
            }
          }

          return current
        }

        const actualValue = evaluatePath(value, path)
        const passes =
          expectedValue === undefined
            ? actualValue !== undefined
            : actualValue === expectedValue

        const shouldPass = isNegated ? !passes : passes

        if (testStack.length === 0) return

        const args =
          expectedValue !== undefined ? [path, expectedValue] : [path]
        testStack[testStack.length - 1].expectResults.push({
          status: shouldPass ? "pass" : "fail",
          message: buildMessage(value, mods, "jsonPath", args),
        })
      }
    ),

    // expect.fail() - Force a test failure
    // Supports multiple signatures:
    // expect.fail()
    // expect.fail(message)
    // expect.fail(actual, expected)
    // expect.fail(actual, expected, message)
    // expect.fail(actual, expected, message, operator)
    chaiFail: defineSandboxFn(ctx, "chaiFail", (...args: unknown[]) => {
      if (testStack.length === 0) return

      const [actual, expected, message, operator] = args
      let errorMessage: string

      // Handle different call signatures
      if (actual === undefined && expected === undefined) {
        // expect.fail() - no arguments
        errorMessage = "expect.fail()"
      } else if (
        expected === undefined &&
        message === undefined &&
        operator === undefined
      ) {
        // expect.fail(message) - single string argument
        errorMessage = typeof actual === "string" ? actual : "expect.fail()"
      } else {
        // expect.fail(actual, expected) or full signature
        errorMessage =
          (message as string) ||
          `expected ${actual !== undefined ? actual : "undefined"} to ${(operator as string) || "equal"} ${expected !== undefined ? expected : "undefined"}`
      }

      // Always record as failure
      testStack[testStack.length - 1].expectResults.push({
        status: "fail",
        message: errorMessage,
      })
    }),
  }
}
