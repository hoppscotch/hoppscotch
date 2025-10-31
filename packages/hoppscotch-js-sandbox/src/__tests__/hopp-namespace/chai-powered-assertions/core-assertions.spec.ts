/**
 * @see https://github.com/hoppscotch/hoppscotch/discussions/5221
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`hopp.expect` - Core Chai Assertions", () => {
  describe("Language Chains", () => {
    test("should support all language chain properties (`to`, `be`, `that`, `and`, `has`, etc.)", () => {
      return expect(
        runTest(`
          hopp.test("language chains work", () => {
            hopp.expect(2).to.equal(2)
            hopp.expect(2).to.be.equal(2)
            hopp.expect(2).to.be.a('number').that.equals(2)
            hopp.expect([1,2,3]).to.be.an('array').that.has.lengthOf(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "language chains work",
              expectResults: [
                { status: "pass", message: "Expected 2 to equal 2" },
                { status: "pass", message: "Expected 2 to be equal 2" },
                { status: "pass", message: "Expected 2 to be a number" },
                {
                  status: "pass",
                  message: "Expected 2 to be a number that equals 2",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
                {
                  status: "pass",
                  message:
                    "Expected [1, 2, 3] to be an array that has lengthOf 3",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support multiple modifier combinations with language chains", () => {
      return expect(
        runTest(`
          hopp.test("complex chains work", () => {
            hopp.expect([1,2,3]).to.be.an('array')
            hopp.expect([1,2,3]).to.have.lengthOf(3)
            hopp.expect([1,2,3]).to.include(2)
            hopp.expect({a: 1, b: 2}).to.be.an('object')
            hopp.expect({a: 1, b: 2}).to.have.property('a')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "complex chains work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/array/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/lengthOf 3/),
                },
                { status: "pass", message: expect.stringMatching(/include 2/) },
                { status: "pass", message: expect.stringMatching(/object/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/property 'a'/),
                },
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Type Assertions", () => {
    test("should assert primitive types correctly (`.a()`, `.an()`)", () => {
      return expect(
        runTest(`
          hopp.test("type assertions work", () => {
            hopp.expect('foo').to.be.a('string')
            hopp.expect({a: 1}).to.be.an('object')
            hopp.expect([1, 2, 3]).to.be.an('array')
            hopp.expect(null).to.be.a('null')
            hopp.expect(undefined).to.be.an('undefined')
            hopp.expect(42).to.be.a('number')
            hopp.expect(true).to.be.a('boolean')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "type assertions work",
              expectResults: [
                { status: "pass", message: "Expected 'foo' to be a string" },
                { status: "pass", message: "Expected {a: 1} to be an object" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
                { status: "pass", message: "Expected null to be a null" },
                {
                  status: "pass",
                  message: "Expected undefined to be an undefined",
                },
                { status: "pass", message: "Expected 42 to be a number" },
                { status: "pass", message: "Expected true to be a boolean" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert Symbol and BigInt types", () => {
      return expect(
        runTest(`
          hopp.test("modern type assertions work", () => {
            hopp.expect(Symbol('test')).to.be.a('symbol')
            hopp.expect(Symbol.for('shared')).to.be.a('symbol')
            hopp.expect(BigInt(123)).to.be.a('bigint')
            hopp.expect(BigInt('999999999999999999')).to.be.a('bigint')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "modern type assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected Symbol\(test\) to be a symbol/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected Symbol\(shared\) to be a symbol/
                  ),
                },
                {
                  status: "pass",
                  message: "Expected 123n to be a bigint",
                },
                {
                  status: "pass",
                  message: "Expected 999999999999999999n to be a bigint",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Equality Assertions", () => {
    test("should support `.equal()`, `.equals()`, `.eq()` for strict equality", () => {
      return expect(
        runTest(`
          hopp.test("equality works", () => {
            hopp.expect(42).to.equal(42)
            hopp.expect('test').to.equals('test')
            hopp.expect(true).to.eq(true)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "equality works",
              expectResults: [
                { status: "pass", message: "Expected 42 to equal 42" },
                { status: "pass", message: "Expected 'test' to equals 'test'" },
                { status: "pass", message: "Expected true to eq true" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.eql()` for deep equality", () => {
      return expect(
        runTest(`
          hopp.test("deep equality works", () => {
            hopp.expect({a: 1}).to.eql({a: 1})
            hopp.expect([1, 2, 3]).to.eql([1, 2, 3])
            hopp.expect({a: {b: 2}}).to.eql({a: {b: 2}})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep equality works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to eql {a: 1}",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to eql [1, 2, 3]",
                },
                {
                  status: "pass",
                  message: "Expected {a: {b: 2}} to eql {a: {b: 2}}",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Truthiness Assertions", () => {
    test("should support `.true`, `.false`, `.ok` assertions", () => {
      return expect(
        runTest(`
          hopp.test("truthiness assertions work", () => {
            hopp.expect(true).to.be.true
            hopp.expect(false).to.be.false
            hopp.expect(1).to.be.ok
            hopp.expect('hello').to.be.ok
            hopp.expect({}).to.be.ok
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "truthiness assertions work",
              expectResults: [
                { status: "pass", message: "Expected true to be true" },
                { status: "pass", message: "Expected false to be false" },
                { status: "pass", message: "Expected 1 to be ok" },
                { status: "pass", message: "Expected 'hello' to be ok" },
                { status: "pass", message: "Expected {} to be ok" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Nullish Assertions", () => {
    test("should support `.null`, `.undefined`, `.NaN` assertions", () => {
      return expect(
        runTest(`
          hopp.test("nullish assertions work", () => {
            hopp.expect(null).to.be.null
            hopp.expect(undefined).to.be.undefined
            hopp.expect(NaN).to.be.NaN
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "nullish assertions work",
              expectResults: [
                { status: "pass", message: "Expected null to be null" },
                {
                  status: "pass",
                  message: "Expected undefined to be undefined",
                },
                { status: "pass", message: "Expected NaN to be NaN" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.exist` assertion", () => {
      return expect(
        runTest(`
          hopp.test("exist assertion works", () => {
            hopp.expect(0).to.exist
            hopp.expect('').to.exist
            hopp.expect(false).to.exist
            hopp.expect({}).to.exist
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "exist assertion works",
              expectResults: [
                { status: "pass", message: "Expected 0 to exist" },
                { status: "pass", message: "Expected '' to exist" },
                { status: "pass", message: "Expected false to exist" },
                { status: "pass", message: "Expected {} to exist" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Numerical Comparisons", () => {
    test("should support `.above()` and `.below()` comparisons", () => {
      return expect(
        runTest(`
          hopp.test("numerical comparisons work", () => {
            hopp.expect(10).to.be.above(5)
            hopp.expect(5).to.be.below(10)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "numerical comparisons work",
              expectResults: [
                { status: "pass", message: "Expected 10 to be above 5" },
                { status: "pass", message: "Expected 5 to be below 10" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support comparison aliases (`.gt()`, `.gte()`, `.lt()`, `.lte()`)", () => {
      return expect(
        runTest(`
          hopp.test("comparison aliases work", () => {
            hopp.expect(10).to.be.gt(5)
            hopp.expect(10).to.be.gte(10)
            hopp.expect(5).to.be.lt(10)
            hopp.expect(5).to.be.lte(5)
            hopp.expect(10).to.be.greaterThan(5)
            hopp.expect(10).to.be.greaterThanOrEqual(10)
            hopp.expect(5).to.be.lessThan(10)
            hopp.expect(5).to.be.lessThanOrEqual(5)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "comparison aliases work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/above|gt/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/above|gte|at least/),
                },
                { status: "pass", message: expect.stringMatching(/below|lt/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/below|lte|at most/),
                },
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.within()` for range comparisons", () => {
      return expect(
        runTest(`
          hopp.test("within range works", () => {
            hopp.expect(5).to.be.within(1, 10)
            hopp.expect(7).to.be.within(7, 7)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "within range works",
              expectResults: [
                { status: "pass", message: "Expected 5 to be within 1, 10" },
                { status: "pass", message: "Expected 7 to be within 7, 7" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.closeTo()` and `.approximately()` for floating point comparisons", () => {
      return expect(
        runTest(`
          hopp.test("close to works", () => {
            hopp.expect(1.5).to.be.closeTo(1.0, 0.6)
            hopp.expect(1.5).to.be.approximately(1.0, 0.6)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "close to works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 1.5 to be closeTo 1, 0.6",
                },
                {
                  status: "pass",
                  message: "Expected 1.5 to be approximately 1, 0.6",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Special Value Assertions", () => {
    test("should support `.empty` assertion for various types", () => {
      return expect(
        runTest(`
          hopp.test("empty assertion works", () => {
            hopp.expect('').to.be.empty
            hopp.expect([]).to.be.empty
            hopp.expect({}).to.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "empty assertion works",
              expectResults: [
                { status: "pass", message: "Expected '' to be empty" },
                { status: "pass", message: "Expected [] to be empty" },
                { status: "pass", message: "Expected {} to be empty" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.finite` assertion for numbers", () => {
      return expect(
        runTest(`
          hopp.test("finite assertion works", () => {
            hopp.expect(42).to.be.finite
            hopp.expect(0).to.be.finite
            hopp.expect(-100.5).to.be.finite
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "finite assertion works",
              expectResults: [
                { status: "pass", message: "Expected 42 to be finite" },
                { status: "pass", message: "Expected 0 to be finite" },
                { status: "pass", message: "Expected -100.5 to be finite" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should detect Infinity and reject `.finite`", () => {
      return expect(
        runTest(`
          hopp.test("infinity is not finite", () => {
            hopp.expect(Infinity).to.not.be.finite
            hopp.expect(-Infinity).to.not.be.finite
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "infinity is not finite",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected Infinity to not be finite",
                },
                {
                  status: "pass",
                  message: "Expected -Infinity to not be finite",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Negation with `.not`", () => {
    test("should support negation for all assertion types", () => {
      return expect(
        runTest(`
          hopp.test("negation works", () => {
            hopp.expect(1).to.not.equal(2)
            hopp.expect('foo').to.not.be.a('number')
            hopp.expect(false).to.not.be.true
            hopp.expect('foo').to.not.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "negation works",
              expectResults: [
                { status: "pass", message: "Expected 1 to not equal 2" },
                {
                  status: "pass",
                  message: "Expected 'foo' to not be a number",
                },
                { status: "pass", message: "Expected false to not be true" },
                { status: "pass", message: "Expected 'foo' to not be empty" },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Boundary Value Testing", () => {
    test("should handle boundary values correctly in comparisons", () => {
      return expect(
        runTest(`
          hopp.test("boundary values work", () => {
            hopp.expect(Number.MAX_SAFE_INTEGER).to.be.a('number')
            hopp.expect(Number.MIN_SAFE_INTEGER).to.be.a('number')
            hopp.expect(Number.EPSILON).to.be.above(0)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "boundary values work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/number/) },
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Failure Cases", () => {
    test("should produce meaningful error messages on assertion failures", () => {
      return expect(
        runTest(`
          hopp.test("failures have good messages", () => {
            hopp.expect(1).to.equal(2)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "failures have good messages",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringContaining("Expected 1 to equal 2"),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
