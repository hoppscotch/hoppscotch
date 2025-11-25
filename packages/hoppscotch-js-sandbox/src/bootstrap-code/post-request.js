/* eslint-disable @typescript-eslint/no-unused-expressions */
;(inputs) => {
  // Keep strict mode scoped to this IIFE to avoid leaking strictness to concatenated/bootstrapped code
  "use strict"

  // Chai proxy builder - creates a Chai-like API using actual Chai SDK
  if (!globalThis.__createChaiProxy) {
    globalThis.__createChaiProxy = function (
      expectVal,
      inputs,
      modifiers = " to"
    ) {
      const proxy = {}

      // Helper to create a new proxy with updated modifiers
      const withModifiers = (newModifiers) => {
        return globalThis.__createChaiProxy(expectVal, inputs, newModifiers)
      }

      // Assertion methods
      proxy.equal = (expected) => {
        // PRE-CHECK PATTERN: Track object identity for reference equality
        // Special handling for Date/RegExp which serialize to primitives
        let isSameReference = undefined
        let typeInfo = undefined

        if (
          expectVal !== null &&
          expected !== null &&
          typeof expectVal === "object" &&
          typeof expected === "object"
        ) {
          isSameReference = expectVal === expected

          // Track type for objects that lose identity during serialization
          if (expectVal instanceof Date && expected instanceof Date) {
            typeInfo = {
              type: "Date",
              valueTime: expectVal.getTime(),
              expectedTime: expected.getTime(),
            }
          } else if (
            expectVal instanceof RegExp &&
            expected instanceof RegExp
          ) {
            typeInfo = {
              type: "RegExp",
              valueSource: expectVal.source,
              valueFlags: expectVal.flags,
              expectedSource: expected.source,
              expectedFlags: expected.flags,
            }
          }
        }

        inputs.chaiEqual(
          expectVal,
          expected,
          modifiers,
          "equal",
          isSameReference,
          typeInfo
        )
        return withModifiers(modifiers)
      }
      proxy.equals = (expected) => {
        // PRE-CHECK PATTERN: Track object identity for reference equality
        // Only pass isSameReference when BOTH values are objects
        let isSameReference = undefined
        if (
          expectVal !== null &&
          expected !== null &&
          typeof expectVal === "object" &&
          typeof expected === "object"
        ) {
          isSameReference = expectVal === expected
        }
        inputs.chaiEqual(
          expectVal,
          expected,
          modifiers,
          "equals",
          isSameReference
        )
        return withModifiers(modifiers)
      }
      proxy.eq = (expected) => {
        // PRE-CHECK PATTERN: Track object identity for reference equality
        // Only pass isSameReference when BOTH values are objects
        let isSameReference = undefined
        if (
          expectVal !== null &&
          expected !== null &&
          typeof expectVal === "object" &&
          typeof expected === "object"
        ) {
          isSameReference = expectVal === expected
        }
        inputs.chaiEqual(expectVal, expected, modifiers, "eq", isSameReference)
        return withModifiers(modifiers)
      }
      proxy.eql = (expected) => {
        // PRE-CHECK PATTERN: Extract metadata from special objects before serialization
        let valueMetadata = undefined
        let expectedMetadata = undefined

        // Handle RegExp objects - extract pattern and flags
        if (expectVal instanceof RegExp && expected instanceof RegExp) {
          valueMetadata = {
            type: "RegExp",
            source: expectVal.source,
            flags: expectVal.flags,
          }
          expectedMetadata = {
            type: "RegExp",
            source: expected.source,
            flags: expected.flags,
          }
        }
        // Handle Date objects - extract timestamp
        else if (expectVal instanceof Date && expected instanceof Date) {
          valueMetadata = {
            type: "Date",
            time: expectVal.getTime(),
          }
          expectedMetadata = {
            type: "Date",
            time: expected.getTime(),
          }
        }

        inputs.chaiEql(
          expectVal,
          expected,
          modifiers,
          valueMetadata,
          expectedMetadata
        )
        return withModifiers(modifiers)
      }

      // Custom Postman methods - delegates to chai-helpers.ts
      proxy.jsonSchema = (schema) => {
        if (!inputs.chaiJsonSchema) {
          throw new Error("chaiJsonSchema method not found in inputs")
        }
        inputs.chaiJsonSchema(expectVal, schema, modifiers)
        return withModifiers(modifiers)
      }

      proxy.charset = (expectedCharset) => {
        if (!inputs.chaiCharset) {
          throw new Error("chaiCharset method not found in inputs")
        }
        inputs.chaiCharset(expectVal, expectedCharset, modifiers)
        return withModifiers(modifiers)
      }

      proxy.cookie = (cookieName, cookieValue) => {
        if (!inputs.chaiCookie) {
          throw new Error("chaiCookie method not found in inputs")
        }
        inputs.chaiCookie(expectVal, cookieName, cookieValue, modifiers)
        return withModifiers(modifiers)
      }

      proxy.jsonPath = (path, expectedValue) => {
        if (!inputs.chaiJsonPath) {
          throw new Error("chaiJsonPath method not found in inputs")
        }
        inputs.chaiJsonPath(expectVal, path, expectedValue, modifiers)
        return withModifiers(modifiers)
      }

      // .a() and .an() can be both type assertion methods and language chains for .instanceof
      const aMethod = (type) => {
        // PRE-CHECK PATTERN: Check typeof BEFORE serialization
        // Special handling for null (typeof null === 'object' in JS)
        let actualType = typeof expectVal
        if (expectVal === null) {
          actualType = "null"
        } else if (Array.isArray(expectVal)) {
          actualType = "array"
        }
        // Record the type assertion (valid terminal assertion)
        inputs.chaiTypeOf(expectVal, type, modifiers, actualType)
        return withModifiers(modifiers + ` a ${type}`)
      }
      // Add .instanceof as a property of the function
      const aInstanceOfMethod = function (constructor) {
        // CRITICAL: Perform instanceof check HERE in the sandbox before serialization
        const actualInstanceCheck = expectVal instanceof constructor

        const objectType = Object.prototype.toString.call(expectVal)
        let constructorName = "Unknown"
        try {
          if (constructor && typeof constructor.name === "string") {
            constructorName = constructor.name
          } else {
            constructorName = String(constructor)
          }
        } catch (_e) {
          constructorName = String(constructor)
        }

        // PRE-FORMAT: Create display string for Set/Map before serialization
        let displayValue = null
        if (expectVal instanceof Set) {
          const values = Array.from(expectVal).slice(0, 10)
          displayValue =
            values.length > 0 ? `new Set([${values.join(", ")}])` : "new Set()"
        } else if (expectVal instanceof Map) {
          const entries = Array.from(expectVal.entries()).slice(0, 3)
          if (entries.length > 0) {
            const formatted = entries.map(([k, v]) => `['${k}', ${v}]`)
            displayValue = `new Map([${formatted.join(", ")}])`
          } else {
            displayValue = "new Map()"
          }
        }

        inputs.chaiInstanceOf(
          expectVal,
          constructorName,
          modifiers,
          objectType,
          displayValue,
          actualInstanceCheck // Pass the pre-checked result!
        )
        return withModifiers(modifiers)
      }
      aMethod.instanceof = aInstanceOfMethod
      aMethod.instanceOf = aInstanceOfMethod // Support both lowercase and camelCase
      proxy.a = aMethod

      const anMethod = (type) => {
        // Record the type assertion (valid terminal assertion)
        inputs.chaiTypeOf(expectVal, type, modifiers)
        return withModifiers(modifiers + ` an ${type}`)
      }
      // Add .instanceof as a property of the function
      const instanceOfMethod = function (constructor) {
        // CRITICAL: Perform instanceof check HERE in the sandbox before serialization
        const actualInstanceCheck = expectVal instanceof constructor

        const objectType = Object.prototype.toString.call(expectVal)
        let constructorName = "Unknown"
        try {
          if (constructor && typeof constructor.name === "string") {
            constructorName = constructor.name
          } else {
            constructorName = String(constructor)
          }
        } catch (_e) {
          constructorName = String(constructor)
        }

        // PRE-FORMAT: Create display string for Set/Map before serialization
        let displayValue = null
        if (expectVal instanceof Set) {
          const values = Array.from(expectVal).slice(0, 10)
          displayValue =
            values.length > 0 ? `new Set([${values.join(", ")}])` : "new Set()"
        } else if (expectVal instanceof Map) {
          const entries = Array.from(expectVal.entries()).slice(0, 3)
          if (entries.length > 0) {
            const formatted = entries.map(([k, v]) => `['${k}', ${v}]`)
            displayValue = `new Map([${formatted.join(", ")}])`
          } else {
            displayValue = "new Map()"
          }
        }

        return inputs.chaiInstanceOf(
          expectVal,
          constructorName,
          modifiers,
          objectType,
          displayValue,
          actualInstanceCheck // Pass the pre-checked result!
        )
      }
      anMethod.instanceof = instanceOfMethod
      anMethod.instanceOf = instanceOfMethod // Support both lowercase and camelCase
      proxy.an = anMethod

      // Include can be both a method and have properties (for .include.members and .include.all.keys)
      const includeMethod = (item) => {
        inputs.chaiInclude(expectVal, item, modifiers)
        return withModifiers(modifiers + ` include ${JSON.stringify(item)}`)
      }
      includeMethod.members = (members) => {
        inputs.chaiIncludeMembers(expectVal, members, modifiers)
        return withModifiers(modifiers + ` include members`)
      }
      // Add .all for .include.all.keys
      Object.defineProperty(includeMethod, "all", {
        get: () => {
          const newModifiers = modifiers + " include all"
          const allProxy = {}
          allProxy.keys = (...keys) => {
            inputs.chaiAllKeys(expectVal, keys, newModifiers)
            return withModifiers(newModifiers)
          }
          return allProxy
        },
      })
      // Add .any for .include.any.keys
      Object.defineProperty(includeMethod, "any", {
        get: () => {
          const newModifiers = modifiers + " include any"
          const anyProxy = {}
          anyProxy.keys = (...keys) => {
            inputs.chaiAnyKeys(expectVal, keys, newModifiers)
            return withModifiers(newModifiers)
          }
          return anyProxy
        },
      })
      // Add .keys for .include.keys
      includeMethod.keys = (...keys) => {
        const keysArray =
          keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys
        inputs.chaiIncludeKeys(expectVal, keysArray, modifiers)
        return withModifiers(modifiers)
      }
      // Add .deep for .include.deep.ordered.members and deep.include()
      Object.defineProperty(includeMethod, "deep", {
        get: () => {
          const newModifiers = modifiers + " include deep"
          // Create a function that can be called as deep.include(obj)
          const deepIncludeFn = (item) => {
            inputs.chaiDeepInclude(expectVal, item, newModifiers)
            return withModifiers(newModifiers)
          }
          // Add .ordered for .include.deep.ordered
          Object.defineProperty(deepIncludeFn, "ordered", {
            get: () => {
              const orderedModifiers = newModifiers + " ordered"
              const orderedProxy = {}
              orderedProxy.members = (members) => {
                inputs.chaiIncludeDeepOrderedMembers(
                  expectVal,
                  members,
                  orderedModifiers
                )
                return withModifiers(orderedModifiers)
              }
              return orderedProxy
            },
          })
          return deepIncludeFn
        },
      })
      proxy.include = includeMethod

      proxy.includes = (item) => {
        inputs.chaiInclude(expectVal, item, modifiers)
        return withModifiers(modifiers + ` include ${JSON.stringify(item)}`)
      }

      // Contain can be both a method and have properties (for .contain.oneOf and .contain.members)
      const containMethod = (item) => {
        inputs.chaiInclude(expectVal, item, modifiers)
        return withModifiers(modifiers + ` include ${JSON.stringify(item)}`)
      }
      containMethod.oneOf = (list) => {
        inputs.chaiOneOf(expectVal, list, modifiers + " include")
        return withModifiers(modifiers + " include oneOf")
      }
      containMethod.members = (members) => {
        inputs.chaiIncludeMembers(expectVal, members, modifiers)
        return withModifiers(modifiers + ` include members`)
      }
      proxy.contain = containMethod

      proxy.contains = (item) => {
        inputs.chaiInclude(expectVal, item, modifiers)
        return withModifiers(modifiers + ` include ${JSON.stringify(item)}`)
      }

      // .lengthOf can be used both as a method and as a language chain
      // As method: expect(arr).to.have.lengthOf(5)
      // As chain: expect(arr).to.have.lengthOf.at.least(5)
      Object.defineProperty(proxy, "lengthOf", {
        get: () => {
          // Extract actual length for comparison operations
          let actualLength
          let actualSize, typeName, serializedContent

          // PRE-CHECK PATTERN: Extract size from Set/Map before serialization
          if (expectVal instanceof Set) {
            actualSize = expectVal.size
            actualLength = actualSize
            typeName = "Set"
            serializedContent = Array.from(expectVal)
          } else if (expectVal instanceof Map) {
            actualSize = expectVal.size
            actualLength = actualSize
            typeName = "Map"
            serializedContent = Array.from(expectVal)
          } else {
            try {
              actualLength =
                expectVal && typeof expectVal.length !== "undefined"
                  ? expectVal.length
                  : expectVal && typeof expectVal.size !== "undefined"
                    ? expectVal.size
                    : undefined
            } catch (_e) {
              actualLength = undefined
            }
          }

          // Create a callable function that also has chainable properties
          const lengthOfFn = (length) => {
            inputs.chaiLengthOf(
              serializedContent || expectVal,
              length,
              modifiers,
              "lengthOf",
              actualSize,
              typeName
            )
            return withModifiers(modifiers + ` lengthOf ${length}`)
          }

          // Add comparison methods for chaining (like .lengthOf.at.least())
          if (actualLength !== undefined) {
            lengthOfFn.above = (n) => {
              inputs.chaiAbove(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.below = (n) => {
              inputs.chaiBelow(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.within = (start, end) => {
              inputs.chaiWithin(actualLength, start, end, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.least = (n) => {
              inputs.chaiAtLeast(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.most = (n) => {
              inputs.chaiAtMost(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.greaterThan = (n) => {
              inputs.chaiAbove(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.lessThan = (n) => {
              inputs.chaiBelow(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.gte = (n) => {
              inputs.chaiAtLeast(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            lengthOfFn.lte = (n) => {
              inputs.chaiAtMost(actualLength, n, modifiers)
              return withModifiers(modifiers)
            }

            // Add .at language chain for .lengthOf.at.least() and .lengthOf.at.most()
            Object.defineProperty(lengthOfFn, "at", {
              get: () => {
                const atProxy = withModifiers(modifiers + " at")
                atProxy.least = (n) => {
                  inputs.chaiAtLeast(actualLength, n, modifiers)
                  return withModifiers(modifiers)
                }
                atProxy.most = (n) => {
                  inputs.chaiAtMost(actualLength, n, modifiers)
                  return withModifiers(modifiers)
                }
                return atProxy
              },
              configurable: true,
              enumerable: false,
            })
          }

          return lengthOfFn
        },
        configurable: true,
        enumerable: false,
      })
      // .length as getter property for chaining: .length.above(), .length.below(), .length.within()
      // Also supports .length(n) as method for exact length
      Object.defineProperty(proxy, "length", {
        get: () => {
          // Extract actual length value
          let actualLength
          try {
            actualLength = expectVal.length
          } catch (_e) {
            actualLength = undefined
          }

          // Create callable function for exact length: .length(n)
          const lengthProxy = (length) => {
            // PRE-CHECK PATTERN: Extract size from Set/Map before serialization
            let actualSize, typeName, serializedContent
            if (expectVal instanceof Set) {
              actualSize = expectVal.size
              typeName = "Set"
              serializedContent = Array.from(expectVal)
            } else if (expectVal instanceof Map) {
              actualSize = expectVal.size
              typeName = "Map"
              serializedContent = Array.from(expectVal)
            }
            inputs.chaiLengthOf(
              serializedContent || expectVal,
              length,
              modifiers,
              "length",
              actualSize,
              typeName
            )
            // Return proxy wrapping the LENGTH VALUE for chaining (.which, .that, etc.)
            return globalThis.__createChaiProxy(
              actualLength,
              inputs,
              modifiers + ` length ${length}`
            )
          }

          // Add comparison methods for chaining
          lengthProxy.above = (n) => {
            inputs.chaiAbove(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.below = (n) => {
            inputs.chaiBelow(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.within = (start, end) => {
            inputs.chaiWithin(actualLength, start, end, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.least = (n) => {
            inputs.chaiAtLeast(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.most = (n) => {
            inputs.chaiAtMost(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.greaterThan = (n) => {
            inputs.chaiAbove(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.lessThan = (n) => {
            inputs.chaiBelow(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.gte = (n) => {
            inputs.chaiAtLeast(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          lengthProxy.lte = (n) => {
            inputs.chaiAtMost(actualLength, n, modifiers)
            return withModifiers(modifiers)
          }

          // Add .at language chain for .length.at.least() and .length.at.most()
          Object.defineProperty(lengthProxy, "at", {
            get: () => {
              const atProxy = withModifiers(modifiers + " at")
              atProxy.least = (n) => {
                inputs.chaiAtLeast(actualLength, n, modifiers)
                return withModifiers(modifiers)
              }
              atProxy.most = (n) => {
                inputs.chaiAtMost(actualLength, n, modifiers)
                return withModifiers(modifiers)
              }
              return atProxy
            },
            configurable: true,
            enumerable: false,
          })

          return lengthProxy
        },
        configurable: true,
        enumerable: false,
      })

      proxy.property = (prop, val) => {
        // PRE-CHECK PATTERN: Special handling for Map/Set size property
        // Map and Set serialize as {} losing .size property, so extract it first
        if (
          prop === "size" &&
          (expectVal instanceof Map || expectVal instanceof Set)
        ) {
          const actualSize = expectVal.size
          // Call chaiProperty with actual size value
          inputs.chaiProperty(
            { size: actualSize }, // Wrap size in object
            prop,
            val,
            modifiers
          )
          // For chaining, return proxy wrapping the size value
          return globalThis.__createChaiProxy(actualSize, inputs, modifiers)
        }

        // PRE-CHECK PATTERN: Check property existence (including inherited) BEFORE serialization
        // The 'in' operator checks for both own and inherited properties
        let hasProperty = undefined
        if (expectVal !== null && typeof expectVal === "object") {
          hasProperty = prop in expectVal
        }

        // When val is provided, assert the property value directly
        inputs.chaiProperty(expectVal, prop, val, modifiers, hasProperty)

        // For chaining (.that, .which), we need to return a proxy wrapping the PROPERTY VALUE
        // Extract the property value from the object
        let propertyValue
        try {
          propertyValue = expectVal[prop]
        } catch (_e) {
          propertyValue = undefined
        }

        // Return a new proxy wrapping the property value, not the original object
        // This allows: .property('a').that.equals(1) to work
        return globalThis.__createChaiProxy(propertyValue, inputs, modifiers)
      }
      proxy.ownProperty = (prop) => {
        // PRE-CHECK PATTERN: Check hasOwnProperty BEFORE serialization
        // Prototype chain is lost when objects cross sandbox boundary
        // Only pass isOwnProperty when value is an object
        let isOwnProperty = undefined
        if (expectVal !== null && typeof expectVal === "object") {
          isOwnProperty = Object.prototype.hasOwnProperty.call(expectVal, prop)
        }

        inputs.chaiOwnProperty(expectVal, prop, modifiers, isOwnProperty)

        // For chaining, return proxy wrapping the property value
        let propertyValue
        try {
          propertyValue = expectVal[prop]
        } catch (_e) {
          propertyValue = undefined
        }

        return globalThis.__createChaiProxy(propertyValue, inputs, modifiers)
      }
      proxy.ownPropertyDescriptor = (prop, descriptor) => {
        // PRE-CHECK PATTERN: Check property descriptor in sandbox before serialization
        let hasDescriptor = false
        let actualDescriptor = null
        let matchesExpected = false

        try {
          actualDescriptor = Object.getOwnPropertyDescriptor(expectVal, prop)
          hasDescriptor = actualDescriptor !== undefined

          // If descriptor argument provided, check if it matches
          if (hasDescriptor && descriptor !== undefined) {
            matchesExpected = true
            // Compare each property of the descriptor
            for (const key in descriptor) {
              if (descriptor[key] !== actualDescriptor[key]) {
                matchesExpected = false
                break
              }
            }
          }
        } catch (_e) {
          hasDescriptor = false
        }

        inputs.chaiOwnPropertyDescriptor(
          expectVal,
          prop,
          descriptor,
          modifiers,
          hasDescriptor,
          matchesExpected
        )

        // Return a proxy that can chain with .that to access the descriptor
        const descriptorProxy = withModifiers(modifiers)
        // Delete existing .that property if it exists, then redefine it
        delete descriptorProxy.that
        Object.defineProperty(descriptorProxy, "that", {
          configurable: true,
          enumerable: false,
          get: () => {
            // Return a new Chai proxy wrapping the descriptor itself
            return globalThis.__createChaiProxy(actualDescriptor, inputs, " to")
          },
        })
        return descriptorProxy
      }

      proxy.above = (n) => {
        inputs.chaiAbove(expectVal, n, modifiers)
        return withModifiers(modifiers + ` above ${n}`)
      }
      proxy.gt = (n) => {
        inputs.chaiAbove(expectVal, n, modifiers)
        return withModifiers(modifiers + ` above ${n}`)
      }
      proxy.greaterThan = (n) => {
        inputs.chaiAbove(expectVal, n, modifiers)
        return withModifiers(modifiers + ` above ${n}`)
      }
      proxy.greaterThanOrEqual = (n) => {
        inputs.chaiAtLeast(expectVal, n, modifiers)
        return withModifiers(modifiers + ` at least ${n}`)
      }
      proxy.gte = (n) => {
        inputs.chaiAtLeast(expectVal, n, modifiers)
        return withModifiers(modifiers + ` at least ${n}`)
      }

      proxy.below = (n) => {
        inputs.chaiBelow(expectVal, n, modifiers)
        return withModifiers(modifiers + ` below ${n}`)
      }
      proxy.lt = (n) => {
        inputs.chaiBelow(expectVal, n, modifiers)
        return withModifiers(modifiers + ` below ${n}`)
      }
      proxy.lessThan = (n) => {
        inputs.chaiBelow(expectVal, n, modifiers)
        return withModifiers(modifiers + ` below ${n}`)
      }
      proxy.lessThanOrEqual = (n) => {
        inputs.chaiAtMost(expectVal, n, modifiers)
        return withModifiers(modifiers + ` at most ${n}`)
      }
      proxy.lte = (n) => {
        inputs.chaiAtMost(expectVal, n, modifiers)
        return withModifiers(modifiers + ` at most ${n}`)
      }

      proxy.within = (start, end) => {
        inputs.chaiWithin(expectVal, start, end, modifiers)
        return withModifiers(modifiers)
      }
      proxy.closeTo = (expected, delta) => {
        inputs.chaiCloseTo(expectVal, expected, delta, modifiers, "closeTo")
        return withModifiers(modifiers)
      }
      proxy.approximately = (expected, delta) => {
        inputs.chaiCloseTo(
          expectVal,
          expected,
          delta,
          modifiers,
          "approximately"
        )
        return withModifiers(modifiers)
      }

      proxy.keys = (...keys) => {
        // Support both keys('a', 'b') and keys(['a', 'b'])
        const keysArray =
          keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys
        inputs.chaiKeys(expectVal, keysArray, modifiers)
        return withModifiers(modifiers)
      }
      proxy.key = (key) => {
        // Support both key('a') and key(['a'])
        const keysArray = Array.isArray(key) ? key : [key]
        inputs.chaiKeys(expectVal, keysArray, modifiers)
        return withModifiers(modifiers)
      }

      proxy.match = (pattern) => {
        // PRE-CHECK PATTERN: Extract RegExp source and flags before serialization
        let regexSource, regexFlags
        if (pattern instanceof RegExp) {
          regexSource = pattern.source
          regexFlags = pattern.flags
        }
        return inputs.chaiMatch(
          expectVal,
          pattern,
          modifiers,
          regexSource,
          regexFlags
        )
      }
      proxy.matches = (pattern) => {
        // PRE-CHECK PATTERN: Extract RegExp source and flags before serialization
        let regexSource, regexFlags
        if (pattern instanceof RegExp) {
          regexSource = pattern.source
          regexFlags = pattern.flags
        }
        return inputs.chaiMatch(
          expectVal,
          pattern,
          modifiers,
          regexSource,
          regexFlags
        )
      }
      proxy.string = (substring) =>
        inputs.chaiString(expectVal, substring, modifiers)

      proxy.members = (members) =>
        inputs.chaiMembers(expectVal, members, modifiers)
      proxy.oneOf = (list) => inputs.chaiOneOf(expectVal, list, modifiers)

      proxy.throw = (errorLike, errMsgMatcher) => {
        // PRE-CHECK PATTERN: Execute function in sandbox, pass results
        let threwError = false
        let errorTypeName = null
        let errorMessage = null

        if (typeof expectVal === "function") {
          try {
            expectVal()
          } catch (e) {
            threwError = true
            errorTypeName = e.constructor?.name || "Error"
            errorMessage = e.message || String(e)
          }
        }

        // Handle parameter interpretation like Chai does:
        // .throw() - no params
        // .throw(ErrorType) - constructor function
        // .throw('message') - string message
        // .throw(/pattern/) - regex pattern
        // .throw(ErrorType, 'message') - constructor + message
        // .throw(ErrorType, /pattern/) - constructor + regex

        let actualErrorLike = errorLike
        let actualErrMsgMatcher = errMsgMatcher

        // If first param is string or regex but no second param,
        // treat first param as message matcher, not error type
        if (errorLike !== undefined && errMsgMatcher === undefined) {
          if (typeof errorLike === "string" || errorLike instanceof RegExp) {
            actualErrorLike = undefined
            actualErrMsgMatcher = errorLike
          }
        }

        // Get error type name for matching
        let expectedTypeName = null
        if (actualErrorLike && typeof actualErrorLike === "function") {
          expectedTypeName = actualErrorLike.name
        }

        // Convert RegExp to serializable form or pass string message
        let regexSource, regexFlags
        let isRegexMatcher = false
        if (actualErrMsgMatcher instanceof RegExp) {
          regexSource = actualErrMsgMatcher.source
          regexFlags = actualErrMsgMatcher.flags
          isRegexMatcher = true
        }

        return inputs.chaiThrow(
          expectVal,
          threwError,
          errorTypeName,
          errorMessage,
          expectedTypeName,
          actualErrMsgMatcher,
          regexSource,
          regexFlags,
          isRegexMatcher,
          modifiers
        )
      }
      proxy.throws = (errorLike, errMsgMatcher) => {
        // PRE-CHECK PATTERN: Execute function in sandbox, pass results
        let threwError = false
        let errorTypeName = null
        let errorMessage = null

        if (typeof expectVal === "function") {
          try {
            expectVal()
          } catch (e) {
            threwError = true
            errorTypeName = e.constructor?.name || "Error"
            errorMessage = e.message || String(e)
          }
        }

        // Handle parameter interpretation like Chai does
        let actualErrorLike = errorLike
        let actualErrMsgMatcher = errMsgMatcher

        // If first param is string or regex but no second param,
        // treat first param as message matcher, not error type
        if (errorLike !== undefined && errMsgMatcher === undefined) {
          if (typeof errorLike === "string" || errorLike instanceof RegExp) {
            actualErrorLike = undefined
            actualErrMsgMatcher = errorLike
          }
        }

        // Get error type name for matching
        let expectedTypeName = null
        if (actualErrorLike && typeof actualErrorLike === "function") {
          expectedTypeName = actualErrorLike.name
        }

        // Convert RegExp to serializable form or pass string message
        let regexSource, regexFlags
        let isRegexMatcher = false
        if (actualErrMsgMatcher instanceof RegExp) {
          regexSource = actualErrMsgMatcher.source
          regexFlags = actualErrMsgMatcher.flags
          isRegexMatcher = true
        }

        return inputs.chaiThrow(
          expectVal,
          threwError,
          errorTypeName,
          errorMessage,
          expectedTypeName,
          actualErrMsgMatcher,
          regexSource,
          regexFlags,
          isRegexMatcher,
          modifiers
        )
      }
      proxy.Throw = (errorLike, errMsgMatcher) => {
        // PRE-CHECK PATTERN: Execute function in sandbox, pass results
        let threwError = false
        let errorTypeName = null
        let errorMessage = null

        if (typeof expectVal === "function") {
          try {
            expectVal()
          } catch (e) {
            threwError = true
            errorTypeName = e.constructor?.name || "Error"
            errorMessage = e.message || String(e)
          }
        }

        // Handle parameter interpretation like Chai does
        let actualErrorLike = errorLike
        let actualErrMsgMatcher = errMsgMatcher

        // If first param is string or regex but no second param,
        // treat first param as message matcher, not error type
        if (errorLike !== undefined && errMsgMatcher === undefined) {
          if (typeof errorLike === "string" || errorLike instanceof RegExp) {
            actualErrorLike = undefined
            actualErrMsgMatcher = errorLike
          }
        }

        // Get error type name for matching
        let expectedTypeName = null
        if (actualErrorLike && typeof actualErrorLike === "function") {
          expectedTypeName = actualErrorLike.name
        }

        // Convert RegExp to serializable form or pass string message
        let regexSource, regexFlags
        let isRegexMatcher = false
        if (actualErrMsgMatcher instanceof RegExp) {
          regexSource = actualErrMsgMatcher.source
          regexFlags = actualErrMsgMatcher.flags
          isRegexMatcher = true
        }

        return inputs.chaiThrow(
          expectVal,
          threwError,
          errorTypeName,
          errorMessage,
          expectedTypeName,
          actualErrMsgMatcher,
          regexSource,
          regexFlags,
          isRegexMatcher,
          modifiers
        )
      }

      // PRE-CHECK PATTERN: Check method existence BEFORE serialization
      proxy.respondTo = (method) => {
        // Check if method exists on value or its prototype/constructor
        // When .itself modifier is present, check for static methods on the constructor itself
        const hasItselfModifier = String(modifiers).includes("itself")
        let hasMethod = false

        if (hasItselfModifier) {
          // .itself.respondTo() checks for static methods directly on the constructor/class
          hasMethod = typeof expectVal?.[method] === "function"
        } else {
          // Regular .respondTo() checks instance methods (on value or prototype)
          hasMethod =
            typeof expectVal?.[method] === "function" ||
            typeof expectVal?.prototype?.[method] === "function"
        }

        return inputs.chaiRespondTo(expectVal, method, modifiers, hasMethod)
      }
      proxy.respondsTo = (method) => {
        // Check if method exists on value or its prototype/constructor
        // When .itself modifier is present, check for static methods on the constructor itself
        const hasItselfModifier = String(modifiers).includes("itself")
        let hasMethod = false

        if (hasItselfModifier) {
          // .itself.respondTo() checks for static methods directly on the constructor/class
          hasMethod = typeof expectVal?.[method] === "function"
        } else {
          // Regular .respondTo() checks instance methods (on value or prototype)
          hasMethod =
            typeof expectVal?.[method] === "function" ||
            typeof expectVal?.prototype?.[method] === "function"
        }

        return inputs.chaiRespondTo(expectVal, method, modifiers, hasMethod)
      }

      proxy.satisfy = (matcher) => {
        // PRE-CHECK PATTERN: Execute matcher function in sandbox, pass result
        let satisfyResult = false
        let matcherString = String(matcher)

        if (typeof matcher === "function") {
          try {
            satisfyResult = Boolean(matcher(expectVal))
          } catch (_e) {
            satisfyResult = false
          }
        }

        return inputs.chaiSatisfy(
          expectVal,
          satisfyResult,
          matcherString,
          modifiers
        )
      }
      proxy.satisfies = (matcher) => {
        // PRE-CHECK PATTERN: Execute matcher function in sandbox, pass result
        let satisfyResult = false
        let matcherString = String(matcher)

        if (typeof matcher === "function") {
          try {
            satisfyResult = Boolean(matcher(expectVal))
          } catch (_e) {
            satisfyResult = false
          }
        }

        return inputs.chaiSatisfy(
          expectVal,
          satisfyResult,
          matcherString,
          modifiers
        )
      }

      // PRE-CHECK PATTERN: change/increase/decrease assertions
      proxy.change = (obj, prop) => {
        // Support both patterns:
        // 1. change(getter) - getter function pattern
        // 2. change(obj, prop) - object + property pattern
        let initialValue
        let finalValue
        let changed = false
        let delta = 0
        let propName = prop

        try {
          // Pattern 1: Single argument that is a function (getter)
          if (typeof obj === "function" && prop === undefined) {
            initialValue = obj()
            if (typeof expectVal === "function") {
              expectVal()
            }
            finalValue = obj()
            propName = "value" // Use generic name for getter pattern
          }
          // Pattern 2: Object + property name
          else {
            initialValue = obj[prop]
            if (typeof expectVal === "function") {
              expectVal()
            }
            finalValue = obj[prop]
          }

          changed = initialValue !== finalValue
          if (
            typeof initialValue === "number" &&
            typeof finalValue === "number"
          ) {
            delta = finalValue - initialValue
          }
        } catch (_e) {
          changed = false
        }

        // Call the assertion (adds result to testStack)
        inputs.chaiChange(propName, modifiers, changed, delta)

        // Return a proxy with .by() method for chaining
        return {
          by: (expectedDelta) => {
            inputs.chaiChangeBy(
              propName,
              modifiers,
              changed,
              delta,
              expectedDelta
            )
          },
        }
      }

      proxy.increase = (obj, prop) => {
        // Support both patterns:
        // 1. increase(getter) - getter function pattern
        // 2. increase(obj, prop) - object + property pattern
        let initialValue
        let finalValue
        let increased = false
        let delta = 0
        let propName = prop

        try {
          // Pattern 1: Single argument that is a function (getter)
          if (typeof obj === "function" && prop === undefined) {
            initialValue = obj()
            if (typeof expectVal === "function") {
              expectVal()
            }
            finalValue = obj()
            propName = "value" // Use generic name for getter pattern
          }
          // Pattern 2: Object + property name
          else {
            initialValue = obj[prop]
            if (typeof expectVal === "function") {
              expectVal()
            }
            finalValue = obj[prop]
          }

          if (
            typeof initialValue === "number" &&
            typeof finalValue === "number"
          ) {
            delta = finalValue - initialValue
            increased = delta > 0
          }
        } catch (_e) {
          increased = false
        }

        // Call the assertion (adds result to testStack)
        inputs.chaiIncrease(propName, modifiers, increased, delta)

        // Return a proxy with .by() method for chaining
        return {
          by: (expectedDelta) => {
            inputs.chaiIncreaseBy(
              propName,
              modifiers,
              increased,
              delta,
              expectedDelta
            )
          },
        }
      }

      proxy.decrease = (obj, prop) => {
        // Support both patterns:
        // 1. decrease(getter) - getter function pattern
        // 2. decrease(obj, prop) - object + property pattern
        let initialValue
        let finalValue
        let decreased = false
        let delta = 0
        let propName = prop

        try {
          // Pattern 1: Single argument that is a function (getter)
          if (typeof obj === "function" && prop === undefined) {
            initialValue = obj()
            if (typeof expectVal === "function") {
              expectVal()
            }
            finalValue = obj()
            propName = "value" // Use generic name for getter pattern
          }
          // Pattern 2: Object + property name
          else {
            initialValue = obj[prop]
            if (typeof expectVal === "function") {
              expectVal()
            }
            finalValue = obj[prop]
          }

          if (
            typeof initialValue === "number" &&
            typeof finalValue === "number"
          ) {
            delta = finalValue - initialValue
            decreased = delta < 0
          }
        } catch (_e) {
          decreased = false
        }

        // Call the assertion (adds result to testStack)
        inputs.chaiDecrease(propName, modifiers, decreased, delta)

        // Return a proxy with .by() method for chaining
        return {
          by: (expectedDelta) => {
            inputs.chaiDecreaseBy(
              propName,
              modifiers,
              decreased,
              delta,
              expectedDelta
            )
          },
        }
      }

      // PRE-CHECK PATTERN: Check instanceof BEFORE serialization (for custom classes)
      proxy.instanceof = function (constructor) {
        // Debug logging
        if (typeof inputs.chaiInstanceOf !== "function") {
          throw new Error(
            "inputs.chaiInstanceOf is not a function: " +
              typeof inputs.chaiInstanceOf
          )
        }

        // CRITICAL: Perform instanceof check HERE in the sandbox before serialization
        // This is essential for custom user-defined classes to work correctly
        const actualInstanceCheck = expectVal instanceof constructor

        // Get the actual type using Object.prototype.toString for built-ins
        const objectType = Object.prototype.toString.call(expectVal)
        // Get constructor name before serialization (constructors don't cross boundary)
        let constructorName = "Unknown"
        try {
          if (constructor && typeof constructor.name === "string") {
            constructorName = constructor.name
          } else {
            constructorName = String(constructor)
          }
        } catch (_e) {
          constructorName = String(constructor)
        }

        // PRE-FORMAT: Create display string for Set/Map before serialization
        let displayValue = null
        if (expectVal instanceof Set) {
          const values = Array.from(expectVal).slice(0, 10)
          displayValue =
            values.length > 0 ? `new Set([${values.join(", ")}])` : "new Set()"
        } else if (expectVal instanceof Map) {
          const entries = Array.from(expectVal.entries()).slice(0, 3)
          if (entries.length > 0) {
            const formatted = entries.map(([k, v]) => `['${k}', ${v}]`)
            displayValue = `new Map([${formatted.join(", ")}])`
          } else {
            displayValue = "new Map()"
          }
        }

        return inputs.chaiInstanceOf(
          expectVal,
          constructorName,
          modifiers,
          objectType,
          displayValue,
          actualInstanceCheck // Pass the pre-checked result!
        )
      }
      proxy.instanceOf = function (constructor) {
        // CRITICAL: Perform instanceof check HERE in the sandbox before serialization
        const actualInstanceCheck = expectVal instanceof constructor

        // Get the actual type using Object.prototype.toString for built-ins
        const objectType = Object.prototype.toString.call(expectVal)
        // Get constructor name before serialization (constructors don't cross boundary)
        let constructorName = "Unknown"
        try {
          if (constructor && typeof constructor.name === "string") {
            constructorName = constructor.name
          } else {
            constructorName = String(constructor)
          }
        } catch (_e) {
          constructorName = String(constructor)
        }

        // PRE-FORMAT: Create display string for Set/Map before serialization
        let displayValue = null
        if (expectVal instanceof Set) {
          const values = Array.from(expectVal).slice(0, 10)
          displayValue =
            values.length > 0 ? `new Set([${values.join(", ")}])` : "new Set()"
        } else if (expectVal instanceof Map) {
          const entries = Array.from(expectVal.entries()).slice(0, 3)
          if (entries.length > 0) {
            const formatted = entries.map(([k, v]) => `['${k}', ${v}]`)
            displayValue = `new Map([${formatted.join(", ")}])`
          } else {
            displayValue = "new Map()"
          }
        }

        return inputs.chaiInstanceOf(
          expectVal,
          constructorName,
          modifiers,
          objectType,
          displayValue,
          actualInstanceCheck // Pass the pre-checked result!
        )
      }

      // Assertion getters
      Object.defineProperty(proxy, "ok", {
        get: () => {
          inputs.chaiOk(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "true", {
        get: () => {
          inputs.chaiTrue(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "false", {
        get: () => {
          inputs.chaiFalse(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "null", {
        get: () => {
          inputs.chaiNull(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "undefined", {
        get: () => {
          inputs.chaiUndefined(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "NaN", {
        get: () => {
          inputs.chaiNaN(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "exist", {
        get: () => {
          inputs.chaiExist(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "empty", {
        get: () => {
          // PRE-CHECK PATTERN: Pass type info for Set/Map before serialization
          let typeName = null
          let actualSize = null
          if (expectVal instanceof Set) {
            typeName = "Set"
            actualSize = expectVal.size
          } else if (expectVal instanceof Map) {
            typeName = "Map"
            actualSize = expectVal.size
          }
          inputs.chaiEmpty(expectVal, modifiers, typeName, actualSize)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "finite", {
        get: () => {
          inputs.chaiFinite(expectVal, modifiers)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "arguments", {
        get: () => {
          // PRE-CHECK PATTERN: Check if value is arguments object before serialization
          const isArguments =
            Object.prototype.toString.call(expectVal) === "[object Arguments]"
          inputs.chaiArguments(expectVal, modifiers + " arguments", isArguments)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "Arguments", {
        get: () => {
          // PRE-CHECK PATTERN: Check if value is arguments object before serialization
          const isArguments =
            Object.prototype.toString.call(expectVal) === "[object Arguments]"
          inputs.chaiArguments(expectVal, modifiers + " Arguments", isArguments)
          return withModifiers(modifiers)
        },
      })
      // PRE-CHECK PATTERN: Check object state in sandbox BEFORE serialization
      Object.defineProperty(proxy, "extensible", {
        get: () => {
          // Check extensibility in sandbox context before value crosses boundary
          const isExtensible = Object.isExtensible(expectVal)
          // Pass both the value and the pre-checked boolean
          inputs.chaiExtensible(expectVal, modifiers, isExtensible)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "sealed", {
        get: () => {
          // Check sealed state in sandbox context before value crosses boundary
          const isSealed = Object.isSealed(expectVal)
          // Pass both the value and the pre-checked boolean
          inputs.chaiSealed(expectVal, modifiers, isSealed)
          return withModifiers(modifiers)
        },
      })
      Object.defineProperty(proxy, "frozen", {
        get: () => {
          // Check frozen state in sandbox context before value crosses boundary
          const isFrozen = Object.isFrozen(expectVal)
          // Pass both the value and the pre-checked boolean
          inputs.chaiFrozen(expectVal, modifiers, isFrozen)
          return withModifiers(modifiers)
        },
      })

      // Language chains - return new proxy
      Object.defineProperty(proxy, "to", {
        get: () => withModifiers(" to"),
      })
      Object.defineProperty(proxy, "be", {
        get: () => withModifiers(modifiers + " be"),
      })
      Object.defineProperty(proxy, "been", {
        get: () => withModifiers(modifiers + " been"),
      })
      Object.defineProperty(proxy, "is", {
        get: () => withModifiers(modifiers + " is"),
      })
      Object.defineProperty(proxy, "that", {
        configurable: true, // Allow ownPropertyDescriptor to override this
        get: () => withModifiers(modifiers + " that"),
      })
      Object.defineProperty(proxy, "which", {
        get: () => withModifiers(modifiers + " which"),
      })
      Object.defineProperty(proxy, "and", {
        get: () => withModifiers(modifiers + " and"),
      })
      Object.defineProperty(proxy, "has", {
        get: () => withModifiers(modifiers + " has"),
      })
      Object.defineProperty(proxy, "have", {
        get: () => {
          const haveProxy = withModifiers(modifiers + " have")
          // Add ownPropertyDescriptor method to have proxy
          haveProxy.ownPropertyDescriptor = (prop, descriptor) => {
            // PRE-CHECK PATTERN: Check property descriptor in sandbox before serialization
            let hasDescriptor = false
            let actualDescriptor = null
            let matchesExpected = false

            try {
              actualDescriptor = Object.getOwnPropertyDescriptor(
                expectVal,
                prop
              )
              hasDescriptor = actualDescriptor !== undefined

              // If descriptor argument provided, check if it matches
              if (hasDescriptor && descriptor !== undefined) {
                matchesExpected = true
                // Compare each property of the descriptor
                for (const key in descriptor) {
                  if (descriptor[key] !== actualDescriptor[key]) {
                    matchesExpected = false
                    break
                  }
                }
              }
            } catch (_e) {
              hasDescriptor = false
            }

            inputs.chaiOwnPropertyDescriptor(
              expectVal,
              prop,
              descriptor,
              modifiers + " have",
              hasDescriptor,
              matchesExpected
            )

            // Return a proxy that can chain with .that to access the descriptor
            const descriptorProxy = withModifiers(modifiers + " have")
            // Delete existing .that property if it exists, then redefine it
            delete descriptorProxy.that
            Object.defineProperty(descriptorProxy, "that", {
              configurable: true,
              enumerable: false,
              get: () => {
                // Return a new Chai proxy wrapping the descriptor itself
                return globalThis.__createChaiProxy(
                  actualDescriptor,
                  inputs,
                  " to"
                )
              },
            })
            return descriptorProxy
          }
          return haveProxy
        },
      })
      Object.defineProperty(proxy, "with", {
        get: () => withModifiers(modifiers + " with"),
      })
      Object.defineProperty(proxy, "at", {
        get: () => {
          const atProxy = withModifiers(modifiers + " at")
          atProxy.least = (n) => inputs.chaiAtLeast(expectVal, n, modifiers)
          atProxy.most = (n) => inputs.chaiAtMost(expectVal, n, modifiers)
          return atProxy
        },
      })
      Object.defineProperty(proxy, "of", {
        get: () => withModifiers(modifiers + " of"),
      })
      Object.defineProperty(proxy, "same", {
        get: () => withModifiers(modifiers + " same"),
      })
      Object.defineProperty(proxy, "but", {
        get: () => withModifiers(modifiers + " but"),
      })
      Object.defineProperty(proxy, "does", {
        get: () => withModifiers(modifiers + " does"),
      })
      Object.defineProperty(proxy, "itself", {
        get: () => withModifiers(modifiers + " itself"),
      })

      // Modifiers - return new proxy with updated modifiers
      Object.defineProperty(proxy, "not", {
        get: () => withModifiers(" to not"),
      })
      Object.defineProperty(proxy, "deep", {
        get: () => {
          const newModifiers = modifiers + " deep"
          const deepProxy = withModifiers(newModifiers)
          deepProxy.property = (prop, val) => {
            if (val !== undefined) {
              inputs.chaiDeepOwnProperty(expectVal, prop, val, newModifiers)
            } else {
              inputs.chaiProperty(expectVal, prop, val, newModifiers)
            }
          }
          deepProxy.members = (members) =>
            inputs.chaiDeepMembers(expectVal, members, newModifiers)
          deepProxy.include = (item) => {
            inputs.chaiDeepInclude(expectVal, item, newModifiers)
            return withModifiers(newModifiers)
          }
          return deepProxy
        },
      })
      Object.defineProperty(proxy, "own", {
        get: () => {
          const newModifiers = modifiers + " own"
          const ownProxy = withModifiers(newModifiers)
          ownProxy.property = (prop, val) => {
            if (val !== undefined) {
              inputs.chaiDeepOwnProperty(expectVal, prop, val, newModifiers)
            } else {
              // PRE-CHECK PATTERN: Check hasOwnProperty BEFORE serialization
              // Only pass isOwnProperty when value is an object
              let isOwnProperty = undefined
              if (expectVal !== null && typeof expectVal === "object") {
                isOwnProperty = Object.prototype.hasOwnProperty.call(
                  expectVal,
                  prop
                )
              }
              inputs.chaiOwnProperty(
                expectVal,
                prop,
                newModifiers,
                isOwnProperty
              )
            }
          }
          return ownProxy
        },
      })
      Object.defineProperty(proxy, "nested", {
        get: () => {
          const newModifiers = modifiers + " nested"
          const nestedProxy = withModifiers(newModifiers)
          nestedProxy.property = (prop, val) =>
            inputs.chaiNestedProperty(expectVal, prop, val, newModifiers)
          // Add .include() for .nested.include() pattern
          nestedProxy.include = (obj) => {
            inputs.chaiNestedInclude(expectVal, obj, newModifiers)
            return withModifiers(newModifiers)
          }
          return nestedProxy
        },
      })
      Object.defineProperty(proxy, "ordered", {
        get: () => {
          const newModifiers = modifiers + " ordered"
          const orderedProxy = withModifiers(newModifiers)
          orderedProxy.members = (members) =>
            inputs.chaiOrderedMembers(expectVal, members, newModifiers)
          return orderedProxy
        },
      })
      Object.defineProperty(proxy, "all", {
        get: () => {
          const newModifiers = modifiers + " all"
          const allProxy = withModifiers(newModifiers)
          allProxy.keys = (...keys) =>
            inputs.chaiAllKeys(expectVal, keys, newModifiers)
          return allProxy
        },
      })
      Object.defineProperty(proxy, "any", {
        get: () => {
          const newModifiers = modifiers + " any"
          const anyProxy = withModifiers(newModifiers)
          anyProxy.keys = (...keys) =>
            inputs.chaiAnyKeys(expectVal, keys, newModifiers)
          return anyProxy
        },
      })
      // .include is defined above as a method with .members property

      // Postman custom Chai assertions (jsonSchema, charset, cookie, jsonPath)
      // These are Postman-specific extensions that work with pm.expect()

      proxy.jsonSchema = (schema) => {
        // Basic JSON Schema validation (supports common keywords)
        const validateSchema = (data, schema) => {
          // Type validation
          if (schema.type) {
            const actualType = Array.isArray(data)
              ? "array"
              : data === null
                ? "null"
                : typeof data
            if (actualType !== schema.type) {
              return `Expected type ${schema.type}, got ${actualType}`
            }
          }

          // Required properties
          if (schema.required && Array.isArray(schema.required)) {
            for (const prop of schema.required) {
              if (!(prop in data)) {
                return `Required property '${prop}' is missing`
              }
            }
          }

          // Properties validation
          if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
              if (key in data) {
                const error = validateSchema(data[key], propSchema)
                if (error) return `Property '${key}': ${error}`
              }
            }
          }

          // Enum validation
          if (schema.enum) {
            if (!schema.enum.includes(data)) {
              return `Value must be one of: ${schema.enum.join(", ")}`
            }
          }

          // Number validation
          if (typeof data === "number") {
            if (schema.minimum !== undefined && data < schema.minimum) {
              return `Value ${data} is below minimum ${schema.minimum}`
            }
            if (schema.maximum !== undefined && data > schema.maximum) {
              return `Value ${data} exceeds maximum ${schema.maximum}`
            }
          }

          // String validation
          if (typeof data === "string") {
            if (
              schema.minLength !== undefined &&
              data.length < schema.minLength
            ) {
              return `String length ${data.length} is below minimum ${schema.minLength}`
            }
            if (
              schema.maxLength !== undefined &&
              data.length > schema.maxLength
            ) {
              return `String length ${data.length} exceeds maximum ${schema.maxLength}`
            }
            if (schema.pattern) {
              const regex = new RegExp(schema.pattern)
              if (!regex.test(data)) {
                return `String does not match pattern ${schema.pattern}`
              }
            }
          }

          // Array validation
          if (Array.isArray(data)) {
            if (
              schema.minItems !== undefined &&
              data.length < schema.minItems
            ) {
              return `Array length ${data.length} is below minimum ${schema.minItems}`
            }
            if (
              schema.maxItems !== undefined &&
              data.length > schema.maxItems
            ) {
              return `Array length ${data.length} exceeds maximum ${schema.maxItems}`
            }
            if (schema.items) {
              for (let i = 0; i < data.length; i++) {
                const error = validateSchema(data[i], schema.items)
                if (error) return `Item [${i}]: ${error}`
              }
            }
          }

          return null // Validation passed
        }

        const error = validateSchema(expectVal, schema)
        if (error) {
          throw new Error(`JSON Schema validation failed: ${error}`)
        }
        return withModifiers(modifiers)
      }

      proxy.charset = (expectedCharset) => {
        // expectVal should be a string (typically Content-Type header)
        if (typeof expectVal !== "string") {
          throw new Error(
            "charset() expects a string value (typically Content-Type header)"
          )
        }

        const lowerExpected = expectedCharset.toLowerCase()
        const lowerActual = expectVal.toLowerCase()

        if (!lowerActual.includes(lowerExpected)) {
          throw new Error(
            `Expected charset "${expectedCharset}" not found in "${expectVal}"`
          )
        }
        return withModifiers(modifiers)
      }

      proxy.cookie = (cookieName, cookieValue) => {
        // This works when expectVal is pm.response or similar
        // For the Chai extension, we need to check if cookies exist
        // This is typically used as: pm.expect(pm.response).to.have.cookie('name')
        // But since we're on a Chai proxy, we assume expectVal is the response object

        if (!expectVal || typeof expectVal !== "object" || !expectVal.cookies) {
          throw new Error(
            "cookie() assertion requires a response object with cookies"
          )
        }

        const hasCookie = expectVal.cookies.has(cookieName)
        if (!hasCookie) {
          throw new Error(`Cookie "${cookieName}" not found in response`)
        }

        if (cookieValue !== undefined) {
          const actualValue = expectVal.cookies.get(cookieName)
          if (actualValue !== cookieValue) {
            throw new Error(
              `Cookie "${cookieName}" has value "${actualValue}", expected "${cookieValue}"`
            )
          }
        }
        return withModifiers(modifiers)
      }

      // Legacy pw.expect API compatibility methods
      // These provide backward compatibility for tests using the old pw.expect API
      // Legacy API compatibility - delegate to existing legacy functions
      // These handle errors properly by returning test results instead of throwing
      // Check modifiers to determine if negation is needed
      const isNegated = modifiers.includes("not")

      proxy.toBe = (expectedVal) =>
        isNegated
          ? inputs.expectNotToBe(expectVal, expectedVal)
          : inputs.expectToBe(expectVal, expectedVal)

      proxy.toBeLevel2xx = () =>
        isNegated
          ? inputs.expectNotToBeLevel2xx(expectVal)
          : inputs.expectToBeLevel2xx(expectVal)

      proxy.toBeLevel3xx = () =>
        isNegated
          ? inputs.expectNotToBeLevel3xx(expectVal)
          : inputs.expectToBeLevel3xx(expectVal)

      proxy.toBeLevel4xx = () =>
        isNegated
          ? inputs.expectNotToBeLevel4xx(expectVal)
          : inputs.expectToBeLevel4xx(expectVal)

      proxy.toBeLevel5xx = () =>
        isNegated
          ? inputs.expectNotToBeLevel5xx(expectVal)
          : inputs.expectToBeLevel5xx(expectVal)

      proxy.toBeType = (expectedType) => {
        const isDateInstance = expectVal instanceof Date
        return isNegated
          ? inputs.expectNotToBeType(expectVal, expectedType, isDateInstance)
          : inputs.expectToBeType(expectVal, expectedType, isDateInstance)
      }

      proxy.toHaveLength = (expectedLength) =>
        isNegated
          ? inputs.expectNotToHaveLength(expectVal, expectedLength)
          : inputs.expectToHaveLength(expectVal, expectedLength)

      proxy.toInclude = (needle) =>
        isNegated
          ? inputs.expectNotToInclude(expectVal, needle)
          : inputs.expectToInclude(expectVal, needle)

      return proxy
    }
  }

  const toJSON = (input) => {
    if (input == null) return null

    if (typeof input === "string") {
      try {
        return JSON.parse(input)
      } catch {
        throw new Error("Invalid JSON string")
      }
    }

    if (typeof input === "object") {
      return input
    }

    throw new Error(
      "Unsupported input type for hopp.response.asJSON(). Expected string or object."
    )
  }

  /**
   * Convert input into text (stringify objects, pass strings through).
   */
  const toText = (input) => {
    if (input == null) return ""

    if (typeof input === "string") return input

    if (typeof input === "object") return JSON.stringify(input)

    throw new Error("Unsupported input type for hopp.response.asText()")
  }

  /**
   * Convert input into bytes (UTF-8 encode strings, stringify objects first).
   */
  const toBytes = (input) => {
    if (input == null) return new Uint8Array()

    if (typeof input === "string") return new TextEncoder().encode(input)

    if (typeof input === "object")
      return new TextEncoder().encode(JSON.stringify(input))

    throw new Error("Unsupported input type for hopp.response.bytes()")
  }

  const { status, statusText, headers, responseTime, body } =
    inputs.getResponse()

  const pwResponse = {
    status,
    body,
    headers,
  }

  // Create response body object with read-only methods
  const responseBody = {
    asJSON: () => toJSON(body),
    asText: () => toText(body),
    bytes: () => toBytes(body),
  }

  // Make body methods read-only using a loop
  ;["asJSON", "asText", "bytes"].forEach((method) => {
    Object.defineProperty(responseBody, method, {
      value: responseBody[method],
      writable: false,
      configurable: false,
    })
  })
  Object.freeze(responseBody)

  // Create response object with read-only properties
  const hoppResponse = {}

  // Define response properties and their values
  const responseProperties = {
    statusCode: status,
    statusText: statusText,
    headers: headers,
    responseTime: responseTime,
    body: responseBody,
  }

  // Apply read-only protection to all response properties
  Object.keys(responseProperties).forEach((prop) => {
    Object.defineProperty(hoppResponse, prop, {
      value: responseProperties[prop],
      writable: false,
      enumerable: true,
      configurable: false,
    })
  })

  // Add utility methods to hoppResponse
  Object.defineProperty(hoppResponse, "text", {
    value: () => toText(body),
    writable: false,
    enumerable: true,
    configurable: false,
  })

  Object.defineProperty(hoppResponse, "json", {
    value: () => toJSON(body),
    writable: false,
    enumerable: true,
    configurable: false,
  })

  Object.defineProperty(hoppResponse, "reason", {
    value: () => {
      // Return HTTP reason phrase without status code
      // statusText might be "200 OK" or just "OK"
      const text = statusText || ""
      // If it starts with a number (status code), extract just the reason
      const match = text.match(/^\d+\s+(.+)$/)
      return match ? match[1] : text
    },
    writable: false,
    enumerable: true,
    configurable: false,
  })

  Object.defineProperty(hoppResponse, "dataURI", {
    value: () => {
      // Convert response to data URI format
      try {
        const bytes = toBytes(body)
        const contentTypeHeader = headers.find(
          (h) => h.key.toLowerCase() === "content-type"
        )
        const mimeType = contentTypeHeader
          ? contentTypeHeader.value.split(";")[0].trim()
          : "application/octet-stream"

        // Convert bytes to base64
        let base64 = ""
        if (bytes && typeof bytes === "object") {
          // Handle both array-like and object representations
          const byteArray = Array.isArray(bytes)
            ? bytes
            : Object.keys(bytes)
                .filter((k) => !isNaN(k))
                .map((k) => bytes[k])

          // Convert to binary string
          let binary = ""
          for (let i = 0; i < byteArray.length; i++) {
            binary += String.fromCharCode(byteArray[i])
          }

          // Convert to base64 using btoa if available
          if (typeof btoa !== "undefined") {
            base64 = btoa(binary)
          } else {
            // Fallback: manual base64 encoding
            const chars =
              "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
            for (let i = 0; i < binary.length; i += 3) {
              const b1 = binary.charCodeAt(i) & 0xff
              const b2 = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0
              const b3 = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0

              const enc1 = b1 >> 2
              const enc2 = ((b1 & 3) << 4) | (b2 >> 4)
              const enc3 = ((b2 & 15) << 2) | (b3 >> 6)
              const enc4 = b3 & 63

              base64 += chars[enc1] + chars[enc2]
              base64 += i + 1 < binary.length ? chars[enc3] : "="
              base64 += i + 2 < binary.length ? chars[enc4] : "="
            }
          }
        }

        return `data:${mimeType};base64,${base64}`
      } catch (_e) {
        // Fallback: return text as data URI
        try {
          const text = toText(body)
          return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`
        } catch {
          return "data:,"
        }
      }
    },
    writable: false,
    enumerable: true,
    configurable: false,
  })

  Object.defineProperty(hoppResponse, "jsonp", {
    value: (callbackName = "callback") => {
      // Parse JSONP response by extracting JSON from callback wrapper
      try {
        const text = toText(body)

        // Match pattern: callbackName({...})
        const regex = new RegExp(
          `^\\s*${callbackName}\\s*\\((.*)\\)\\s*;?\\s*$`,
          "s"
        )
        const match = text.match(regex)

        if (match && match[1]) {
          return JSON.parse(match[1])
        }

        // If no callback wrapper, try parsing as JSON directly
        return JSON.parse(text)
      } catch (e) {
        throw new Error(`Failed to parse JSONP response: ${e.message}`)
      }
    },
    writable: false,
    enumerable: true,
    configurable: false,
  })

  // Freeze the entire response object
  Object.freeze(hoppResponse)

  globalThis.pw = {
    env: {
      get: (key) => inputs.envGet(key),
      getResolve: (key) => inputs.envGetResolve(key),
      set: (key, value) => inputs.envSet(key, value),
      unset: (key) => inputs.envUnset(key),
      resolve: (key) => inputs.envResolve(key),
    },
    expect: (expectVal) => {
      // Legacy expectation system only (no Chai for backward compatibility)
      const isDateInstance = expectVal instanceof Date

      const expectation = {
        toBe: (expectedVal) => inputs.expectToBe(expectVal, expectedVal),
        toBeLevel2xx: () => inputs.expectToBeLevel2xx(expectVal),
        toBeLevel3xx: () => inputs.expectToBeLevel3xx(expectVal),
        toBeLevel4xx: () => inputs.expectToBeLevel4xx(expectVal),
        toBeLevel5xx: () => inputs.expectToBeLevel5xx(expectVal),
        toBeType: (expectedType) =>
          inputs.expectToBeType(expectVal, expectedType, isDateInstance),
        toHaveLength: (expectedLength) =>
          inputs.expectToHaveLength(expectVal, expectedLength),
        toInclude: (needle) => inputs.expectToInclude(expectVal, needle),
      }

      Object.defineProperty(expectation, "not", {
        get: () => ({
          toBe: (expectedVal) => inputs.expectNotToBe(expectVal, expectedVal),
          toBeLevel2xx: () => inputs.expectNotToBeLevel2xx(expectVal),
          toBeLevel3xx: () => inputs.expectNotToBeLevel3xx(expectVal),
          toBeLevel4xx: () => inputs.expectNotToBeLevel4xx(expectVal),
          toBeLevel5xx: () => inputs.expectNotToBeLevel5xx(expectVal),
          toBeType: (expectedType) =>
            inputs.expectNotToBeType(expectVal, expectedType, isDateInstance),
          toHaveLength: (expectedLength) =>
            inputs.expectNotToHaveLength(expectVal, expectedLength),
          toInclude: (needle) => inputs.expectNotToInclude(expectVal, needle),
        }),
      })

      return expectation
    },
    test: (descriptor, testFn) => {
      inputs.preTest(descriptor)
      testFn()
      inputs.postTest()
    },
    response: pwResponse,
  }

  // Immutable getters under the `request` namespace
  const requestProps = {}

  // Define all properties with unified read-only protection
  ;["url", "method", "params", "headers", "body", "auth"].forEach((prop) => {
    Object.defineProperty(requestProps, prop, {
      enumerable: true,
      configurable: false,
      get() {
        return inputs.getRequestProps()[prop]
      },
      set(_value) {
        throw new TypeError(`hopp.request.${prop} is read-only`)
      },
    })
  })

  // Special handling for variables property
  Object.defineProperty(requestProps, "variables", {
    enumerable: true,
    configurable: false,
    get() {
      return Object.freeze({
        get: (key) => inputs.getRequestVariable(key),
      })
    },
    set(_value) {
      throw new TypeError(`hopp.request.variables is read-only`)
    },
  })

  // Freeze the entire requestProps object for additional protection
  Object.freeze(requestProps)

  // Special markers for undefined and null values to preserve them across sandbox boundary
  // NOTE: These values MUST match constants/sandbox-markers.ts
  // (Cannot import directly as this runs in QuickJS sandbox)
  const UNDEFINED_MARKER = "__HOPPSCOTCH_UNDEFINED__"
  const NULL_MARKER = "__HOPPSCOTCH_NULL__"

  // Helper function to convert markers back to their original values
  const convertMarkerToValue = (value) => {
    if (value === UNDEFINED_MARKER) return undefined
    if (value === NULL_MARKER) return null
    return value
  }

  // Helper function for PM namespace setters with marker handling
  const pmSetWithMarkers = (key, value, source) => {
    if (typeof value === "undefined") {
      return inputs.pmEnvSetAny(key, UNDEFINED_MARKER, { source })
    } else if (value === null) {
      return inputs.pmEnvSetAny(key, NULL_MARKER, { source })
    } else {
      return inputs.pmEnvSetAny(key, value, { source })
    }
  }

  // Helper function for PM namespace getters with tracking
  const pmGetWithTracking = (getRawFn, trackingSet, key) => {
    const value = getRawFn(key)
    // Return undefined for missing keys, preserve null for explicit null values
    if (value === null && (!trackingSet || !trackingSet.has(key))) {
      return undefined
    }
    return value
  }

  globalThis.hopp = {
    env: {
      get: (key) => {
        const value = inputs.envGetResolve(key, {
          fallbackToNull: true,
          source: "all",
        })
        return convertMarkerToValue(value)
      },
      getRaw: (key) => {
        const value = inputs.envGet(key, {
          fallbackToNull: true,
          source: "all",
        })
        return convertMarkerToValue(value)
      },
      set: (key, value) => inputs.envSet(key, value),
      delete: (key) => inputs.envUnset(key),
      reset: (key) => inputs.envReset(key),
      getInitialRaw: (key) => {
        const value = inputs.envGetInitialRaw(key)
        return convertMarkerToValue(value)
      },
      setInitial: (key, value) => inputs.envSetInitial(key, value),

      active: {
        get: (key) => {
          const value = inputs.envGetResolve(key, {
            fallbackToNull: true,
            source: "active",
          })
          return convertMarkerToValue(value)
        },
        getRaw: (key) => {
          const value = inputs.envGet(key, {
            fallbackToNull: true,
            source: "active",
          })
          return convertMarkerToValue(value)
        },
        set: (key, value) => inputs.envSet(key, value, { source: "active" }),
        delete: (key) => inputs.envUnset(key, { source: "active" }),
        reset: (key) => inputs.envReset(key, { source: "active" }),
        getInitialRaw: (key) => {
          const value = inputs.envGetInitialRaw(key, { source: "active" })
          return convertMarkerToValue(value)
        },
        setInitial: (key, value) =>
          inputs.envSetInitial(key, value, { source: "active" }),
      },

      global: {
        get: (key) => {
          const value = inputs.envGetResolve(key, {
            fallbackToNull: true,
            source: "global",
          })
          return convertMarkerToValue(value)
        },
        getRaw: (key) => {
          const value = inputs.envGet(key, {
            fallbackToNull: true,
            source: "global",
          })
          return convertMarkerToValue(value)
        },
        set: (key, value) => inputs.envSet(key, value, { source: "global" }),
        delete: (key) => inputs.envUnset(key, { source: "global" }),
        reset: (key) => inputs.envReset(key, { source: "global" }),
        getInitialRaw: (key) => {
          const value = inputs.envGetInitialRaw(key, { source: "global" })
          return convertMarkerToValue(value)
        },
        setInitial: (key, value) =>
          inputs.envSetInitial(key, value, { source: "global" }),
      },
    },
    request: requestProps,
    cookies: {
      get: (domain, name) => inputs.cookieGet(domain, name),
      set: (domain, cookie) => inputs.cookieSet(domain, cookie),
      has: (domain, name) => inputs.cookieHas(domain, name),
      getAll: (domain) => inputs.cookieGetAll(domain),
      delete: (domain, name) => inputs.cookieDelete(domain, name),
      clear: (domain) => inputs.cookieClear(domain),
    },
    expect: Object.assign(
      (expectVal) => {
        // Use Chai if available
        if (inputs.chaiEqual) {
          return globalThis.__createChaiProxy(expectVal, inputs)
        }

        // Fallback to legacy expectation system
        const isDateInstance = expectVal instanceof Date

        const expectation = {
          toBe: (expectedVal) => inputs.expectToBe(expectVal, expectedVal),
          toBeLevel2xx: () => inputs.expectToBeLevel2xx(expectVal),
          toBeLevel3xx: () => inputs.expectToBeLevel3xx(expectVal),
          toBeLevel4xx: () => inputs.expectToBeLevel4xx(expectVal),
          toBeLevel5xx: () => inputs.expectToBeLevel5xx(expectVal),
          toBeType: (expectedType) =>
            inputs.expectToBeType(expectVal, expectedType, isDateInstance),
          toHaveLength: (expectedLength) =>
            inputs.expectToHaveLength(expectVal, expectedLength),
          toInclude: (needle) => inputs.expectToInclude(expectVal, needle),
        }

        Object.defineProperty(expectation, "not", {
          get: () => ({
            toBe: (expectedVal) => inputs.expectNotToBe(expectVal, expectedVal),
            toBeLevel2xx: () => inputs.expectNotToBeLevel2xx(expectVal),
            toBeLevel3xx: () => inputs.expectNotToBeLevel3xx(expectVal),
            toBeLevel4xx: () => inputs.expectNotToBeLevel4xx(expectVal),
            toBeLevel5xx: () => inputs.expectNotToBeLevel5xx(expectVal),
            toBeType: (expectedType) =>
              inputs.expectNotToBeType(expectVal, expectedType, isDateInstance),
            toHaveLength: (expectedLength) =>
              inputs.expectNotToHaveLength(expectVal, expectedLength),
            toInclude: (needle) => inputs.expectNotToInclude(expectVal, needle),
          }),
        })

        return expectation
      },
      {
        // expect.fail() - Chai compatibility
        // Supports multiple signatures:
        // expect.fail()
        // expect.fail(message)
        // expect.fail(actual, expected)
        // expect.fail(actual, expected, message)
        // expect.fail(actual, expected, message, operator)
        fail: (actual, expected, message, operator) => {
          if (inputs.chaiFail) {
            inputs.chaiFail(actual, expected, message, operator)
          } else {
            // Fallback: throw an error with the message
            const errorMessage =
              message ||
              (actual !== undefined && expected !== undefined
                ? `expected ${actual} to ${operator || "equal"} ${expected}`
                : "expect.fail()")
            throw new Error(errorMessage)
          }
        },
      }
    ),
    test: (descriptor, testFn) => {
      inputs.preTest(descriptor)
      testFn()
      inputs.postTest()
    },
    response: hoppResponse,
  }

  // Initialize tracking Sets for PM namespace from incoming envs
  // This allows toObject() to work even when variables were set in previous scripts
  if (!globalThis.__pmEnvKeys) {
    globalThis.__pmEnvKeys = new Set()
  }
  if (!globalThis.__pmGlobalKeys) {
    globalThis.__pmGlobalKeys = new Set()
  }

  // Populate tracking Sets from inputs.envs if available
  // This allows toObject() to work even when variables were set in previous scripts
  if (inputs && inputs.envs) {
    // Track all selected/active environment variables
    if (inputs.envs.selected && Array.isArray(inputs.envs.selected)) {
      inputs.envs.selected.forEach((envVar) => {
        if (envVar && envVar.key && envVar.currentValue !== undefined) {
          globalThis.__pmEnvKeys.add(envVar.key)
        }
      })
    }
    // Track all global variables
    if (inputs.envs.global && Array.isArray(inputs.envs.global)) {
      inputs.envs.global.forEach((envVar) => {
        if (envVar && envVar.key && envVar.currentValue !== undefined) {
          globalThis.__pmGlobalKeys.add(envVar.key)
        }
      })
    }
  }

  // PM Namespace - Postman Compatibility Layer
  globalThis.pm = {
    environment: {
      name: "active",
      get: (key) => {
        return pmGetWithTracking(
          globalThis.hopp.env.active.getRaw,
          globalThis.__pmEnvKeys,
          key
        )
      },
      set: (key, value) => {
        // Track the key for clear() and toObject()
        if (!globalThis.__pmEnvKeys) {
          globalThis.__pmEnvKeys = new Set()
        }
        globalThis.__pmEnvKeys.add(key)
        return pmSetWithMarkers(key, value, "active")
      },
      unset: (key) => {
        // Remove from tracking when unset
        if (globalThis.__pmEnvKeys) {
          globalThis.__pmEnvKeys.delete(key)
        }
        return globalThis.hopp.env.active.delete(key)
      },
      has: (key) => globalThis.hopp.env.active.get(key) !== null,
      clear: () => {
        // Clear ALL environment variables (not just tracked ones)
        // Get all keys from the inputs array
        if (typeof inputs !== "undefined" && inputs.getAllSelectedEnvs) {
          const selectedEnvs = inputs.getAllSelectedEnvs()
          if (Array.isArray(selectedEnvs)) {
            selectedEnvs.forEach((envVar) => {
              if (envVar && envVar.key) {
                globalThis.hopp.env.active.delete(envVar.key)
              }
            })
          }
        }

        // Also clear any tracked keys
        if (globalThis.__pmEnvKeys) {
          globalThis.__pmEnvKeys.forEach((key) => {
            globalThis.hopp.env.active.delete(key)
          })
          globalThis.__pmEnvKeys.clear()
        }
      },
      toObject: () => {
        // Return all environment variables as an object
        // Read from getAllSelectedEnvs but verify each key still exists in the Map
        // (to respect deletions made via unset() or clear())
        const result = {}

        if (typeof inputs !== "undefined" && inputs.getAllSelectedEnvs) {
          const selectedEnvs = inputs.getAllSelectedEnvs()
          if (Array.isArray(selectedEnvs)) {
            selectedEnvs.forEach((envVar) => {
              if (envVar && envVar.key) {
                // Check if this key still exists in the active environment
                // (it might have been deleted via unset() or clear())
                const currentValue = globalThis.hopp.env.active.get(envVar.key)
                if (currentValue !== null) {
                  result[envVar.key] = currentValue
                }
              }
            })
          }
        }

        return result
      },
      replaceIn: (template) => {
        // Replace {{varName}} with actual values
        if (typeof template !== "string") return template
        return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
          const value = globalThis.hopp.env.active.get(varName.trim())
          return value !== null ? value : match
        })
      },
    },

    globals: {
      get: (key) => {
        return pmGetWithTracking(
          globalThis.hopp.env.global.getRaw,
          globalThis.__pmGlobalKeys,
          key
        )
      },
      set: (key, value) => {
        // Track the key for clear() and toObject()
        if (!globalThis.__pmGlobalKeys) {
          globalThis.__pmGlobalKeys = new Set()
        }
        globalThis.__pmGlobalKeys.add(key)
        return pmSetWithMarkers(key, value, "global")
      },
      unset: (key) => {
        // Remove from tracking when unset
        if (globalThis.__pmGlobalKeys) {
          globalThis.__pmGlobalKeys.delete(key)
        }
        return globalThis.hopp.env.global.delete(key)
      },
      has: (key) => globalThis.hopp.env.global.get(key) !== null,
      clear: () => {
        // Clear ALL global variables (not just tracked ones)
        // Get all keys from the inputs array
        if (typeof inputs !== "undefined" && inputs.getAllGlobalEnvs) {
          const globalEnvs = inputs.getAllGlobalEnvs()
          if (Array.isArray(globalEnvs)) {
            globalEnvs.forEach((envVar) => {
              if (envVar && envVar.key) {
                globalThis.hopp.env.global.delete(envVar.key)
              }
            })
          }
        }

        // Also clear any tracked keys
        if (globalThis.__pmGlobalKeys) {
          globalThis.__pmGlobalKeys.forEach((key) => {
            globalThis.hopp.env.global.delete(key)
          })
          globalThis.__pmGlobalKeys.clear()
        }
      },
      toObject: () => {
        // Return all global variables as an object
        // Read from getAllGlobalEnvs but verify each key still exists in the Map
        // (to respect deletions made via unset() or clear())
        const result = {}

        if (typeof inputs !== "undefined" && inputs.getAllGlobalEnvs) {
          const globalEnvs = inputs.getAllGlobalEnvs()
          if (Array.isArray(globalEnvs)) {
            globalEnvs.forEach((envVar) => {
              if (envVar && envVar.key) {
                // Check if this key still exists in the global environment
                const currentValue = globalThis.hopp.env.global.get(envVar.key)
                if (currentValue !== null) {
                  result[envVar.key] = currentValue
                }
              }
            })
          }
        }

        return result
      },
      replaceIn: (template) => {
        // Replace {{varName}} with actual values
        if (typeof template !== "string") return template
        return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
          const value = globalThis.hopp.env.global.get(varName.trim())
          return value !== null ? value : match
        })
      },
    },

    variables: {
      get: (key) => {
        // pm.variables searches both active and global scopes
        // Try active first
        let value = globalThis.hopp.env.active.getRaw(key)
        let isTracked =
          globalThis.__pmEnvKeys && globalThis.__pmEnvKeys.has(key)

        // If not found in active, try global
        if (value === null && !isTracked) {
          value = globalThis.hopp.env.global.getRaw(key)
          isTracked =
            globalThis.__pmGlobalKeys && globalThis.__pmGlobalKeys.has(key)
        }

        // Return undefined for missing keys, preserve null for explicit null values
        if (value === null && !isTracked) {
          return undefined // Key doesn't exist in either scope
        }
        return value // Returns null (from NULL_MARKER) or actual value
      },
      set: (key, value) => {
        return pmSetWithMarkers(key, value, "active")
      },
      has: (key) => globalThis.hopp.env.get(key) !== null,
      replaceIn: (template) => {
        if (typeof template !== "string") return template
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const value = globalThis.hopp.env.get(key.trim())
          return value !== null ? value : match
        })
      },
      toObject: () => {
        // Variables scope includes both environment and global with precedence
        // Read from arrays but verify keys still exist in Maps (respect deletions)
        const result = {}

        // Add global variables first
        if (typeof inputs !== "undefined" && inputs.getAllGlobalEnvs) {
          const globalEnvs = inputs.getAllGlobalEnvs()
          if (Array.isArray(globalEnvs)) {
            globalEnvs.forEach((envVar) => {
              if (envVar && envVar.key) {
                const currentValue = globalThis.hopp.env.global.get(envVar.key)
                if (currentValue !== null) {
                  result[envVar.key] = currentValue
                }
              }
            })
          }
        }

        // Then override with environment variables (environment takes precedence)
        if (typeof inputs !== "undefined" && inputs.getAllSelectedEnvs) {
          const selectedEnvs = inputs.getAllSelectedEnvs()
          if (Array.isArray(selectedEnvs)) {
            selectedEnvs.forEach((envVar) => {
              if (envVar && envVar.key) {
                const currentValue = globalThis.hopp.env.active.get(envVar.key)
                if (currentValue !== null) {
                  result[envVar.key] = currentValue
                }
              }
            })
          }
        }

        return result
      },
    },

    request: {
      // ID and name (read-only, exposed from inputs)
      get id() {
        return inputs.pmInfoRequestId()
      },

      get name() {
        return inputs.pmInfoRequestName()
      },

      // Certificate and proxy (read-only, not accessible in scripts)
      // These are configured at app/collection level in Postman, not in scripts
      get certificate() {
        return withModifiers(modifiers)
      },

      get proxy() {
        return withModifiers(modifiers)
      },

      // URL - Read-only with Postman-compatible structure (no setters in post-request)
      get url() {
        const urlObj = {
          // toString reads current URL dynamically
          toString: () => globalThis.hopp.request.url,

          _parseUrl: () => {
            const urlString = globalThis.hopp.request.url
            try {
              const parsed = new URL(urlString)
              return {
                protocol: parsed.protocol.slice(0, -1),
                host: parsed.hostname.split("."),
                port:
                  parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
                path: parsed.pathname.split("/").filter(Boolean),
                queryParams: Array.from(parsed.searchParams.entries()).map(
                  ([key, value]) => ({ key, value })
                ),
              }
            } catch {
              return {
                protocol: "https",
                host: [],
                port: "443",
                path: [],
                queryParams: [],
              }
            }
          },
        }

        // Read-only properties (no setters in post-request script)
        Object.defineProperty(urlObj, "protocol", {
          get: () => urlObj._parseUrl().protocol,
          enumerable: true,
        })

        Object.defineProperty(urlObj, "host", {
          get: () => urlObj._parseUrl().host,
          enumerable: true,
        })

        Object.defineProperty(urlObj, "path", {
          get: () => urlObj._parseUrl().path,
          enumerable: true,
        })

        // Postman-compatible URL helper methods (read-only in post-request)
        urlObj.getHost = () => urlObj._parseUrl().host.join(".")

        urlObj.getPath = (_unresolved = false) => {
          const pathArray = urlObj._parseUrl().path
          return pathArray.length > 0 ? "/" + pathArray.join("/") : "/"
        }

        urlObj.getPathWithQuery = () => {
          const parsed = urlObj._parseUrl()
          const path =
            parsed.path.length > 0 ? "/" + parsed.path.join("/") : "/"
          const query =
            parsed.queryParams.length > 0
              ? "?" +
                parsed.queryParams
                  .map(
                    (p) =>
                      `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
                  )
                  .join("&")
              : ""
          return path + query
        }

        urlObj.getQueryString = (_options = {}) => {
          const params = urlObj._parseUrl().queryParams
          if (params.length === 0) return ""
          return params
            .map(
              (p) =>
                `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
            )
            .join("&")
        }

        urlObj.getRemote = (forcePort = false) => {
          const parsed = urlObj._parseUrl()
          const host = parsed.host.join(".")
          const showPort =
            forcePort || (parsed.port !== "443" && parsed.port !== "80")
          return showPort ? `${host}:${parsed.port}` : host
        }

        // hostname property (string alias for host array)
        Object.defineProperty(urlObj, "hostname", {
          get: () => urlObj._parseUrl().host.join("."),
          enumerable: true,
        })

        // hash property for URL fragments
        Object.defineProperty(urlObj, "hash", {
          get: () => {
            try {
              const parsed = new URL(globalThis.hopp.request.url)
              return parsed.hash ? parsed.hash.slice(1) : ""
            } catch {
              return ""
            }
          },
          enumerable: true,
        })

        Object.defineProperty(urlObj, "query", {
          get: () => {
            return {
              all: () => {
                // Parse current URL dynamically
                const parsed = urlObj._parseUrl()
                const result = {}

                // Handle duplicate keys by converting to arrays
                parsed.queryParams.forEach((p) => {
                  if (Object.prototype.hasOwnProperty.call(result, p.key)) {
                    if (!Array.isArray(result[p.key])) {
                      result[p.key] = [result[p.key]]
                    }
                    result[p.key].push(p.value)
                  } else {
                    result[p.key] = p.value
                  }
                })

                return result
              },

              // PropertyList methods (read-only in post-request)
              get: (key) => {
                const params = urlObj._parseUrl().queryParams
                const param = params.find((p) => p.key === key)
                return param ? param.value : null
              },

              has: (key) => {
                const params = urlObj._parseUrl().queryParams
                return params.some((p) => p.key === key)
              },

              toObject: () => {
                const parsed = urlObj._parseUrl()
                const result = {}

                // Handle duplicate keys by converting to arrays
                parsed.queryParams.forEach((p) => {
                  if (Object.prototype.hasOwnProperty.call(result, p.key)) {
                    if (!Array.isArray(result[p.key])) {
                      result[p.key] = [result[p.key]]
                    }
                    result[p.key].push(p.value)
                  } else {
                    result[p.key] = p.value
                  }
                })

                return result
              },

              each: (callback) => {
                const params = urlObj._parseUrl().queryParams
                params.forEach(callback)
              },

              map: (callback) => {
                const params = urlObj._parseUrl().queryParams
                return params.map(callback)
              },

              filter: (callback) => {
                const params = urlObj._parseUrl().queryParams
                return params.filter(callback)
              },

              count: () => {
                return urlObj._parseUrl().queryParams.length
              },

              idx: (index) => {
                const params = urlObj._parseUrl().queryParams
                return params[index] || null
              },

              // Advanced PropertyList methods (read-only)
              find: (rule, context) => {
                const params = urlObj._parseUrl().queryParams
                if (typeof rule === "function") {
                  return (
                    params.find(context ? rule.bind(context) : rule) || null
                  )
                }
                // String rule: find by key
                if (typeof rule === "string") {
                  return params.find((p) => p.key === rule) || null
                }
                return null
              },

              indexOf: (item) => {
                const params = urlObj._parseUrl().queryParams
                if (typeof item === "string") {
                  // Find by key
                  return params.findIndex((p) => p.key === item)
                }
                if (item && typeof item === "object" && item.key) {
                  // Find by object with key
                  return params.findIndex((p) => p.key === item.key)
                }
                return -1
              },
            }
          },
          enumerable: true,
        })

        return urlObj
      },

      get method() {
        return globalThis.hopp.request.method
      },

      get headers() {
        return {
          get: (name) => {
            const headers = globalThis.hopp.request.headers
            const header = headers.find(
              (h) => h.key.toLowerCase() === name.toLowerCase()
            )
            return header ? header.value : null
          },
          has: (name) => {
            const headers = globalThis.hopp.request.headers
            return headers.some(
              (h) => h.key.toLowerCase() === name.toLowerCase()
            )
          },
          all: () => {
            const result = {}
            globalThis.hopp.request.headers.forEach((header) => {
              result[header.key] = header.value
            })
            return result
          },

          // PropertyList methods (read-only in post-request)
          toObject: () => {
            const result = {}
            globalThis.hopp.request.headers.forEach((header) => {
              result[header.key] = header.value
            })
            return result
          },

          each: (callback) => {
            globalThis.hopp.request.headers.forEach(callback)
          },

          map: (callback) => {
            return globalThis.hopp.request.headers.map(callback)
          },

          filter: (callback) => {
            return globalThis.hopp.request.headers.filter(callback)
          },

          count: () => {
            return globalThis.hopp.request.headers.length
          },

          idx: (index) => {
            return globalThis.hopp.request.headers[index] || null
          },

          // Advanced PropertyList methods (read-only)
          find: (rule, context) => {
            const headers = globalThis.hopp.request.headers
            if (typeof rule === "function") {
              return headers.find(context ? rule.bind(context) : rule) || null
            }
            // String rule: find by key (case-insensitive)
            if (typeof rule === "string") {
              return (
                headers.find(
                  (h) => h.key.toLowerCase() === rule.toLowerCase()
                ) || null
              )
            }
            return null
          },

          indexOf: (item) => {
            const headers = globalThis.hopp.request.headers
            if (typeof item === "string") {
              // Find by key (case-insensitive)
              return headers.findIndex(
                (h) => h.key.toLowerCase() === item.toLowerCase()
              )
            }
            if (item && typeof item === "object" && item.key) {
              // Find by object with key (case-insensitive)
              return headers.findIndex(
                (h) => h.key.toLowerCase() === item.key.toLowerCase()
              )
            }
            return -1
          },
        }
      },

      get body() {
        return globalThis.hopp.request.body
      },

      get auth() {
        return globalThis.hopp.request.auth
      },

      // Custom serialization for console.log to match pre-request behavior
      // This method is called by faraday-cage's marshalling system
      toJSON() {
        // Return a plain object with all properties expanded
        // This ensures console.log(pm.request) shows the full structure
        const urlParsed = this.url._parseUrl()
        return {
          id: this.id,
          name: this.name,
          url: {
            protocol: urlParsed.protocol,
            host: urlParsed.host,
            hostname: urlParsed.host.join("."),
            port: urlParsed.port,
            path: urlParsed.path,
            hash: urlParsed.hash || "",
            query: this.url.query.all(),
          },
          method: this.method,
          headers: this.headers.toObject(),
          body: this.body,
          auth: this.auth,
        }
      },

      toString() {
        return `Request { id: ${this.id}, name: ${this.name}, method: ${this.method}, url: ${this.url.toString()} }`
      },

      [Symbol.toStringTag]: "Request",
    },

    response: {
      get code() {
        return globalThis.hopp.response.statusCode
      },
      get status() {
        // Get status text from response, fallback to standard reason phrase if empty
        const statusText = globalThis.hopp.response.statusText
        if (statusText && statusText.trim() !== "") {
          return statusText
        }

        // Map status code to standard HTTP reason phrase (for HTTP/2 or empty responses)
        const statusCode = globalThis.hopp.response.statusCode
        const standardReasonPhrases = {
          100: "Continue",
          101: "Switching Protocols",
          102: "Processing",
          103: "Early Hints",
          200: "OK",
          201: "Created",
          202: "Accepted",
          203: "Non-Authoritative Information",
          204: "No Content",
          205: "Reset Content",
          206: "Partial Content",
          207: "Multi-Status",
          208: "Already Reported",
          226: "IM Used",
          300: "Multiple Choices",
          301: "Moved Permanently",
          302: "Found",
          303: "See Other",
          304: "Not Modified",
          305: "Use Proxy",
          307: "Temporary Redirect",
          308: "Permanent Redirect",
          400: "Bad Request",
          401: "Unauthorized",
          402: "Payment Required",
          403: "Forbidden",
          404: "Not Found",
          405: "Method Not Allowed",
          406: "Not Acceptable",
          407: "Proxy Authentication Required",
          408: "Request Timeout",
          409: "Conflict",
          410: "Gone",
          411: "Length Required",
          412: "Precondition Failed",
          413: "Payload Too Large",
          414: "URI Too Long",
          415: "Unsupported Media Type",
          416: "Range Not Satisfiable",
          417: "Expectation Failed",
          418: "I'm a teapot",
          421: "Misdirected Request",
          422: "Unprocessable Entity",
          423: "Locked",
          424: "Failed Dependency",
          425: "Too Early",
          426: "Upgrade Required",
          428: "Precondition Required",
          429: "Too Many Requests",
          431: "Request Header Fields Too Large",
          451: "Unavailable For Legal Reasons",
          500: "Internal Server Error",
          501: "Not Implemented",
          502: "Bad Gateway",
          503: "Service Unavailable",
          504: "Gateway Timeout",
          505: "HTTP Version Not Supported",
          506: "Variant Also Negotiates",
          507: "Insufficient Storage",
          508: "Loop Detected",
          510: "Not Extended",
          511: "Network Authentication Required",
        }

        return standardReasonPhrases[statusCode] || ""
      },
      get responseTime() {
        return globalThis.hopp.response.responseTime
      },
      get responseSize() {
        // Calculate response size from body bytes
        try {
          // Check if response and body exist
          if (
            !globalThis.hopp ||
            !globalThis.hopp.response ||
            !globalThis.hopp.response.body
          ) {
            return withModifiers(modifiers)
          }

          // Try bytes() first
          if (typeof globalThis.hopp.response.body.bytes === "function") {
            const bytes = globalThis.hopp.response.body.bytes()
            if (bytes && typeof bytes.length === "number") {
              return bytes.length
            }
          }

          // Fallback: calculate from text representation
          if (typeof globalThis.hopp.response.body.asText === "function") {
            const text = globalThis.hopp.response.body.asText()
            if (typeof text === "string") {
              // Use TextEncoder if available
              if (typeof TextEncoder !== "undefined") {
                try {
                  const encoder = new TextEncoder()
                  const encoded = encoder.encode(text)

                  // Try standard Uint8Array properties first
                  if (
                    encoded &&
                    typeof encoded.length === "number" &&
                    encoded.length > 0
                  ) {
                    return encoded.length
                  } else if (
                    encoded &&
                    typeof encoded.byteLength === "number" &&
                    encoded.byteLength > 0
                  ) {
                    return encoded.byteLength
                  } else if (encoded && Object.keys(encoded).length > 0) {
                    // QuickJS represents Uint8Array as object with numeric keys
                    // Count numeric keys to get byte length
                    const len = Object.keys(encoded).filter(
                      (k) => !isNaN(k)
                    ).length
                    if (len > 0) {
                      return len
                    }
                  }
                } catch (_e) {
                  // Fall through to manual calculation
                }
              }

              // Fallback: manual UTF-8 byte length calculation
              let byteLength = 0
              for (let i = 0; i < text.length; i++) {
                const code = text.charCodeAt(i)
                if (code < 0x80) byteLength += 1
                else if (code < 0x800) byteLength += 2
                else if (code < 0x10000) byteLength += 3
                else byteLength += 4
              }
              return byteLength
            }
          }

          return withModifiers(modifiers)
        } catch (_e) {
          return withModifiers(modifiers)
        }
      },
      text: () => globalThis.hopp.response.body.asText(),
      json: () => globalThis.hopp.response.body.asJSON(),
      get stream() {
        return globalThis.hopp.response.body.bytes()
      },
      reason: inputs.responseReason,
      dataURI: inputs.responseDataURI,
      jsonp: (callbackName) => inputs.responseJsonp(callbackName),
      headers: {
        get: (name) => {
          const headers = globalThis.hopp.response.headers
          const header = headers.find(
            (h) => h.key.toLowerCase() === name.toLowerCase()
          )
          // NOTE: Postman returns undefined for non-existent headers, not null
          return header ? header.value : undefined
        },
        has: (name) => {
          const headers = globalThis.hopp.response.headers
          return headers.some((h) => h.key.toLowerCase() === name.toLowerCase())
        },
        all: () => {
          const result = {}
          globalThis.hopp.response.headers.forEach((header) => {
            result[header.key] = header.value
          })
          return result
        },
      },
      cookies: {
        get: (name) => {
          // Parse cookies from Set-Cookie headers
          const headers = globalThis.hopp.response.headers
          const setCookieHeaders = headers.filter(
            (h) => h.key.toLowerCase() === "set-cookie"
          )

          for (const header of setCookieHeaders) {
            const cookieStr = header.value
            const cookieName = cookieStr.split("=")[0].trim()
            if (cookieName === name) {
              // Extract cookie value (everything after first =, before first ;)
              const parts = cookieStr.split(";")
              const [, ...valueRest] = parts[0].split("=")
              const value = valueRest.join("=").trim()

              // Return just the value string, matching Postman behavior
              return value
            }
          }
          return null
        },
        has: (name) => {
          const headers = globalThis.hopp.response.headers
          const setCookieHeaders = headers.filter(
            (h) => h.key.toLowerCase() === "set-cookie"
          )

          for (const header of setCookieHeaders) {
            const cookieName = header.value.split("=")[0].trim()
            if (cookieName === name) {
              return true
            }
          }
          return false
        },
        toObject: () => {
          const headers = globalThis.hopp.response.headers
          const setCookieHeaders = headers.filter(
            (h) => h.key.toLowerCase() === "set-cookie"
          )

          const cookies = {}
          for (const header of setCookieHeaders) {
            const parts = header.value.split(";")
            const [nameValue] = parts
            const [name, ...valueRest] = nameValue.split("=")
            const value = valueRest.join("=").trim()
            cookies[name.trim()] = value
          }
          return cookies
        },
      },

      // Postman BDD-style assertion helpers
      to: {
        have: {
          status: (expectedCode) => {
            const actual = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(actual).to.equal(expectedCode)
          },
          header: (headerName, headerValue) => {
            const headers = globalThis.hopp.response.headers
            const header = headers.find(
              (h) => h.key.toLowerCase() === headerName.toLowerCase()
            )
            if (headerValue !== undefined) {
              globalThis.hopp
                .expect(header ? header.value : null)
                .to.equal(headerValue)
            } else {
              globalThis.hopp.expect(header).to.exist
            }
          },
          body: (expectedBody) => {
            const actualBody = globalThis.hopp.response.body.asText()
            globalThis.hopp.expect(actualBody).to.equal(expectedBody)
          },
          jsonBody: (keyOrSchema, expectedValue) => {
            const jsonData = globalThis.hopp.response.body.asJSON()
            if (keyOrSchema === undefined) {
              // No arguments: assert response is JSON object
              globalThis.hopp.expect(jsonData).to.be.an("object")
            } else if (typeof keyOrSchema === "string") {
              // Key provided
              if (expectedValue !== undefined) {
                // Key and value: assert property equals value
                globalThis.hopp
                  .expect(jsonData[keyOrSchema])
                  .to.equal(expectedValue)
              } else {
                // Key only: assert property exists
                globalThis.hopp.expect(jsonData).to.have.property(keyOrSchema)
              }
            } else if (typeof keyOrSchema === "object") {
              // Schema validation (basic deep equality check)
              globalThis.hopp.expect(jsonData).to.deep.equal(keyOrSchema)
            }
          },
          responseTime: {
            below: (ms) => {
              const actual = globalThis.hopp.response.responseTime
              globalThis.hopp.expect(actual).to.be.below(ms)
            },
            above: (ms) => {
              const actual = globalThis.hopp.response.responseTime
              globalThis.hopp.expect(actual).to.be.above(ms)
            },
          },
          jsonSchema: (schema) => {
            // Basic JSON Schema validation (supports common keywords)
            const jsonData = globalThis.hopp.response.body.asJSON()

            const validateSchema = (data, schema) => {
              // Type validation
              if (schema.type) {
                const actualType = Array.isArray(data)
                  ? "array"
                  : data === null
                    ? "null"
                    : typeof data
                if (actualType !== schema.type) {
                  return `Expected type ${schema.type}, got ${actualType}`
                }
              }

              // Required properties
              if (schema.required && Array.isArray(schema.required)) {
                for (const prop of schema.required) {
                  if (!(prop in data)) {
                    return `Required property '${prop}' is missing`
                  }
                }
              }

              // Properties validation
              if (schema.properties && typeof data === "object") {
                for (const prop in schema.properties) {
                  if (prop in data) {
                    const error = validateSchema(
                      data[prop],
                      schema.properties[prop]
                    )
                    if (error) return error
                  }
                }
              }

              // Array validation
              if (schema.items && Array.isArray(data)) {
                for (const item of data) {
                  const error = validateSchema(item, schema.items)
                  if (error) return error
                }
              }

              // Enum validation
              if (schema.enum && Array.isArray(schema.enum)) {
                if (!schema.enum.includes(data)) {
                  return `Value must be one of ${JSON.stringify(schema.enum)}`
                }
              }

              // Min/max validation
              if (typeof data === "number") {
                if (schema.minimum !== undefined && data < schema.minimum) {
                  return `Value must be >= ${schema.minimum}`
                }
                if (schema.maximum !== undefined && data > schema.maximum) {
                  return `Value must be <= ${schema.maximum}`
                }
              }

              // String length validation
              if (typeof data === "string") {
                if (
                  schema.minLength !== undefined &&
                  data.length < schema.minLength
                ) {
                  return `String length must be >= ${schema.minLength}`
                }
                if (
                  schema.maxLength !== undefined &&
                  data.length > schema.maxLength
                ) {
                  return `String length must be <= ${schema.maxLength}`
                }
                if (schema.pattern) {
                  const regex = new RegExp(schema.pattern)
                  if (!regex.test(data)) {
                    return `String must match pattern ${schema.pattern}`
                  }
                }
              }

              // Array length validation
              if (Array.isArray(data)) {
                if (
                  schema.minItems !== undefined &&
                  data.length < schema.minItems
                ) {
                  return `Array must have >= ${schema.minItems} items`
                }
                if (
                  schema.maxItems !== undefined &&
                  data.length > schema.maxItems
                ) {
                  return `Array must have <= ${schema.maxItems} items`
                }
              }

              return null
            }

            const error = validateSchema(jsonData, schema)
            if (error) {
              // Schema validation failed - this would throw in Postman,
              // but we record it as a test failure instead for better UX
              throw new Error(error)
            }
            // On success, no assertion is recorded (Postman behavior)
          },
          charset: (expectedCharset) => {
            const headers = globalThis.hopp.response.headers
            const contentType = headers.find(
              (h) => h.key.toLowerCase() === "content-type"
            )
            const contentTypeValue = contentType ? contentType.value : ""
            const charsetMatch = contentTypeValue.match(/charset=([^;]+)/)
            const actualCharset = charsetMatch
              ? charsetMatch[1].trim().toLowerCase()
              : null
            globalThis.hopp
              .expect(actualCharset)
              .to.equal(expectedCharset.toLowerCase())
          },
          cookie: (cookieName, cookieValue) => {
            const headers = globalThis.hopp.response.headers
            const setCookieHeaders = headers.filter(
              (h) => h.key.toLowerCase() === "set-cookie"
            )

            let found = false
            let actualValue = null
            for (const header of setCookieHeaders) {
              const cookieStr = header.value
              const name = cookieStr.split("=")[0].trim()
              if (name === cookieName) {
                found = true
                const [, ...valueRest] = cookieStr.split("=")
                actualValue = valueRest.join("=").split(";")[0].trim()
                break
              }
            }

            if (!found) {
              // Cookie not found - record expectation failure
              globalThis.hopp.expect(found, `Cookie '${cookieName}' not found`)
                .to.be.true
            } else if (cookieValue !== undefined) {
              // Cookie found and value specified - check value
              globalThis.hopp.expect(actualValue).to.equal(cookieValue)
            } else {
              // Cookie found and no value specified - just assert it exists
              globalThis.hopp.expect(found).to.be.true
            }
          },
          jsonPath: (path, expectedValue) => {
            // Basic JSONPath implementation (supports simple paths)
            const jsonData = globalThis.hopp.response.body.asJSON()

            const evaluatePath = (data, path) => {
              // Remove leading $ if present
              const cleanPath = path.startsWith("$") ? path.slice(1) : path
              if (!cleanPath || cleanPath === ".") {
                return { success: true, value: data }
              }

              // Split by dots and brackets, handling array indices
              const parts = cleanPath
                .replace(/\[(\d+)\]/g, ".$1")
                .split(".")
                .filter((p) => p)

              let current = data
              for (const part of parts) {
                if (current === null || current === undefined) {
                  return {
                    success: false,
                    error: `Cannot access property '${part}' of ${current}`,
                  }
                }
                if (Array.isArray(current)) {
                  const index = parseInt(part)
                  if (isNaN(index) || index >= current.length) {
                    return {
                      success: false,
                      error: `Array index '${part}' out of bounds`,
                    }
                  }
                  current = current[index]
                } else if (typeof current === "object") {
                  if (!(part in current)) {
                    return {
                      success: false,
                      error: `Property '${part}' not found`,
                    }
                  }
                  current = current[part]
                } else {
                  return {
                    success: false,
                    error: `Cannot access property '${part}' of ${typeof current}`,
                  }
                }
              }
              return { success: true, value: current }
            }

            const result = evaluatePath(jsonData, path)
            if (!result.success) {
              throw new Error(result.error)
            }

            if (expectedValue !== undefined) {
              globalThis.hopp.expect(result.value).to.deep.equal(expectedValue)
            } else {
              globalThis.hopp.expect(result.value).to.exist
            }
          },
        },
        be: {
          // Status code convenience methods
          ok: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code >= 200 && code < 300).to.be.true
          },
          success: () => {
            // Alias for ok - validates 2xx status codes
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code >= 200 && code < 300).to.be.true
          },
          accepted: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code).to.equal(202)
          },
          badRequest: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code).to.equal(400)
          },
          unauthorized: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code).to.equal(401)
          },
          forbidden: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code).to.equal(403)
          },
          notFound: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code).to.equal(404)
          },
          rateLimited: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code).to.equal(429)
          },
          clientError: () => {
            // Validates 4xx status codes
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code >= 400 && code < 500).to.be.true
          },
          serverError: () => {
            const code = globalThis.hopp.response.statusCode
            globalThis.hopp.expect(code >= 500 && code < 600).to.be.true
          },
          // Content type checks
          json: () => {
            const headers = globalThis.hopp.response.headers
            const contentType = headers.find(
              (h) => h.key.toLowerCase() === "content-type"
            )
            globalThis.hopp
              .expect(contentType ? contentType.value : "")
              .to.include("application/json")
          },
          html: () => {
            const headers = globalThis.hopp.response.headers
            const contentType = headers.find(
              (h) => h.key.toLowerCase() === "content-type"
            )
            globalThis.hopp
              .expect(contentType ? contentType.value : "")
              .to.include("text/html")
          },
          xml: () => {
            const headers = globalThis.hopp.response.headers
            const contentType = headers.find(
              (h) => h.key.toLowerCase() === "content-type"
            )
            const ct = contentType ? contentType.value : ""
            globalThis.hopp.expect(
              ct.includes("application/xml") || ct.includes("text/xml")
            ).to.be.true
          },
          text: () => {
            const headers = globalThis.hopp.response.headers
            const contentType = headers.find(
              (h) => h.key.toLowerCase() === "content-type"
            )
            globalThis.hopp
              .expect(contentType ? contentType.value : "")
              .to.include("text/plain")
          },
        },
      },
    },

    cookies: {
      get: (_name) => {
        throw new Error(
          "pm.cookies.get() needs domain information - use hopp.cookies instead"
        )
      },
      set: (_name, _value, _options) => {
        throw new Error(
          "pm.cookies.set() needs domain information - use hopp.cookies instead"
        )
      },
      jar: () => {
        throw new Error("pm.cookies.jar() not yet implemented")
      },
    },

    test: (name, fn) => globalThis.hopp.test(name, fn),
    expect: Object.assign((value) => globalThis.hopp.expect(value), {
      // pm.expect.fail() - Postman compatibility
      fail: globalThis.hopp.expect.fail,
    }),

    // Script context information
    info: {
      eventName: "test", // Postman uses "test" for test scripts, not "post-request"
      get requestName() {
        return inputs.pmInfoRequestName()
      },
      get requestId() {
        return inputs.pmInfoRequestId()
      },
      // Unsupported Collection Runner features
      get iteration() {
        throw new Error(
          "pm.info.iteration is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      get iterationCount() {
        throw new Error(
          "pm.info.iterationCount is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Unsupported APIs that throw errors
    sendRequest: () => {
      throw new Error("pm.sendRequest() is not yet implemented in Hoppscotch")
    },

    // Postman Vault (unsupported)
    vault: {
      get: () => {
        throw new Error(
          "pm.vault.get() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
      set: () => {
        throw new Error(
          "pm.vault.set() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.vault.unset() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
    },

    // Postman Visualizer (unsupported)
    visualizer: {
      set: () => {
        throw new Error(
          "pm.visualizer.set() is not supported in Hoppscotch (Postman Visualizer feature)"
        )
      },
      clear: () => {
        throw new Error(
          "pm.visualizer.clear() is not supported in Hoppscotch (Postman Visualizer feature)"
        )
      },
    },

    // Iteration data (unsupported)
    iterationData: {
      get: () => {
        throw new Error(
          "pm.iterationData.get() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      set: () => {
        throw new Error(
          "pm.iterationData.set() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.iterationData.unset() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      has: () => {
        throw new Error(
          "pm.iterationData.has() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      toObject: () => {
        throw new Error(
          "pm.iterationData.toObject() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      toJSON: () => {
        throw new Error(
          "pm.iterationData.toJSON() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Collection variables (unsupported)
    collectionVariables: {
      get: () => {
        throw new Error(
          "pm.collectionVariables.get() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      set: () => {
        throw new Error(
          "pm.collectionVariables.set() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.collectionVariables.unset() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      has: () => {
        throw new Error(
          "pm.collectionVariables.has() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      clear: () => {
        throw new Error(
          "pm.collectionVariables.clear() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      toObject: () => {
        throw new Error(
          "pm.collectionVariables.toObject() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      replaceIn: () => {
        throw new Error(
          "pm.collectionVariables.replaceIn() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
    },

    // Execution control
    execution: {
      location: (() => {
        const location = ["Hoppscotch"]
        Object.defineProperty(location, "current", {
          value: "Hoppscotch",
          writable: false,
          enumerable: true,
        })
        Object.freeze(location)
        return location
      })(),
      setNextRequest: () => {
        throw new Error(
          "pm.execution.setNextRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      skipRequest: () => {
        throw new Error(
          "pm.execution.skipRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      runRequest: () => {
        throw new Error(
          "pm.execution.runRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Package imports (unsupported)
    require: (packageName) => {
      throw new Error(
        `pm.require('${packageName}') is not supported in Hoppscotch (Package Library feature)`
      )
    },
  }
}
