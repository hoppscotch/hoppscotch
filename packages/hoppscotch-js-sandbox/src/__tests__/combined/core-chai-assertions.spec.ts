/**
 * @see https://github.com/hoppscotch/hoppscotch/discussions/5221
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)("%s.expect() - Core Chai Assertions", (namespace) => {
  describe("Equality Assertions", () => {
    test("should support `.equal()` for strict equality", () => {
      return expect(
        runTest(`
          ${namespace}.test("equality assertions", () => {
            ${namespace}.expect(42).to.equal(42)
            ${namespace}.expect('test').to.equal('test')
            ${namespace}.expect(true).to.equal(true)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "equality assertions",
              expectResults: [
                { status: "pass", message: "Expected 42 to equal 42" },
                { status: "pass", message: "Expected 'test' to equal 'test'" },
                { status: "pass", message: "Expected true to equal true" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support `.eql()` for deep equality", () => {
      return expect(
        runTest(`
          ${namespace}.test("deep equality", () => {
            ${namespace}.expect({a: 1}).to.eql({a: 1})
            ${namespace}.expect([1, 2, 3]).to.eql([1, 2, 3])
            ${namespace}.expect({nested: {value: 42}}).to.eql({nested: {value: 42}})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep equality",
              expectResults: [
                { status: "pass", message: "Expected {a: 1} to eql {a: 1}" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to eql [1, 2, 3]",
                },
                { status: "pass", message: expect.stringContaining("to eql") },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Type Assertions", () => {
    test("should assert primitive types with `.a()` and `.an()`", () => {
      return expect(
        runTest(`
          ${namespace}.test("type assertions", () => {
            ${namespace}.expect('foo').to.be.a('string')
            ${namespace}.expect({a: 1}).to.be.an('object')
            ${namespace}.expect([1, 2, 3]).to.be.an('array')
            ${namespace}.expect(42).to.be.a('number')
            ${namespace}.expect(true).to.be.a('boolean')
            ${namespace}.expect(null).to.be.a('null')
            ${namespace}.expect(undefined).to.be.an('undefined')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "type assertions",
              expectResults: [
                { status: "pass", message: "Expected 'foo' to be a string" },
                { status: "pass", message: "Expected {a: 1} to be an object" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
                { status: "pass", message: "Expected 42 to be a number" },
                { status: "pass", message: "Expected true to be a boolean" },
                { status: "pass", message: "Expected null to be a null" },
                {
                  status: "pass",
                  message: "Expected undefined to be an undefined",
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
          ${namespace}.test("truthiness", () => {
            ${namespace}.expect(true).to.be.true
            ${namespace}.expect(false).to.be.false
            ${namespace}.expect(1).to.be.ok
            ${namespace}.expect('hello').to.be.ok
            ${namespace}.expect(0).to.not.be.ok
            ${namespace}.expect('').to.not.be.ok
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "truthiness",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
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
          ${namespace}.test("numerical comparisons", () => {
            ${namespace}.expect(10).to.be.above(5)
            ${namespace}.expect(5).to.be.below(10)
            ${namespace}.expect(5).to.not.be.above(10)
            ${namespace}.expect(10).to.not.be.below(5)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "numerical comparisons",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.within()` for range comparisons", () => {
      return expect(
        runTest(`
          ${namespace}.test("within range", () => {
            ${namespace}.expect(5).to.be.within(1, 10)
            ${namespace}.expect(1).to.be.within(1, 10)
            ${namespace}.expect(10).to.be.within(1, 10)
            ${namespace}.expect(0).to.not.be.within(1, 10)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "within range",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.closeTo()` for floating point comparisons", () => {
      return expect(
        runTest(`
          ${namespace}.test("close to", () => {
            ${namespace}.expect(1.5).to.be.closeTo(1.0, 0.6)
            ${namespace}.expect(10.5).to.be.closeTo(10.0, 0.5)
            ${namespace}.expect(5.1).to.not.be.closeTo(5.0, 0.05)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "close to",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Property Assertions", () => {
    test("should support `.property()` for property existence and value", () => {
      return expect(
        runTest(`
          ${namespace}.test("property assertions", () => {
            ${namespace}.expect({a: 1}).to.have.property('a')
            ${namespace}.expect({a: 1}).to.have.property('a', 1)
            ${namespace}.expect({x: {y: 2}}).to.have.property('x')
            ${namespace}.expect({}).to.not.have.property('missing')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "property assertions",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.ownProperty()` for own properties", () => {
      return expect(
        runTest(`
          ${namespace}.test("own property", () => {
            ${namespace}.expect({a: 1}).to.have.ownProperty('a')
            ${namespace}.expect({a: 1}).to.have.ownProperty('a', 1)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "own property",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Collection Assertions", () => {
    test("should support `.include()` for arrays and strings", () => {
      return expect(
        runTest(`
          ${namespace}.test("include assertions", () => {
            ${namespace}.expect([1, 2, 3]).to.include(2)
            ${namespace}.expect('hoppscotch').to.include('hopp')
            ${namespace}.expect({a: 1, b: 2}).to.include({a: 1})
            ${namespace}.expect([1, 2, 3]).to.not.include(5)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "include assertions",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
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
          ${namespace}.test("negation works", () => {
            ${namespace}.expect(42).to.not.equal(43)
            ${namespace}.expect('foo').to.not.be.a('number')
            ${namespace}.expect(false).to.not.be.true
            ${namespace}.expect(5).to.not.be.above(10)
            ${namespace}.expect({a: 1}).to.not.have.property('b')
            ${namespace}.expect([1, 2]).to.not.include(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation works",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Deep Equality Modifiers", () => {
    test("should support `.deep.equal()` and `.deep.property()`", () => {
      return expect(
        runTest(`
          ${namespace}.test("deep modifiers", () => {
            ${namespace}.expect({a: {b: 1}}).to.deep.equal({a: {b: 1}})
            ${namespace}.expect({a: {b: 1}}).to.have.deep.property('a', {b: 1})
            ${namespace}.expect([{x: 1}]).to.deep.include({x: 1})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep modifiers",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Language Chains", () => {
    test("should support basic language chain properties (`.to`, `.be`, `.that`)", () => {
      return expect(
        runTest(`
          ${namespace}.test("basic language chains", () => {
            ${namespace}.expect(2).to.equal(2)
            ${namespace}.expect(2).to.be.equal(2)
            ${namespace}.expect(2).to.be.a('number').that.equals(2)
            ${namespace}.expect([1,2,3]).to.be.an('array').that.has.lengthOf(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "basic language chains",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should chain type assertion with include using `.and`", () => {
      return expect(
        runTest(`
          ${namespace}.test("and chain - type and include", () => {
            ${namespace}.expect('hello world').to.be.a('string').and.include('world')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "and chain - type and include",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should chain type assertion with lengthOf using `.and`", () => {
      return expect(
        runTest(`
          ${namespace}.test("and chain - type and length", () => {
            ${namespace}.expect([1, 2, 3]).to.be.an('array').and.have.lengthOf(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "and chain - type and length",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support complex chaining with multiple `.and` and `.that`", () => {
      return expect(
        runTest(`
          ${namespace}.test("complex and chaining", () => {
            ${namespace}.expect({ name: 'John', age: 30 })
              .to.be.an('object')
              .and.have.property('name')
              .that.is.a('string')
              .and.equals('John')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "complex and chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should work with `.and.not` for negation", () => {
      return expect(
        runTest(`
          ${namespace}.test("and with negation", () => {
            ${namespace}.expect({ a: 1, b: 2 })
              .to.be.an('object')
              .and.not.be.empty
              .and.not.have.property('c')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "and with negation",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should chain numeric comparisons with `.and`", () => {
      return expect(
        runTest(`
          ${namespace}.test("and with numbers", () => {
            ${namespace}.expect(200)
              .to.be.a('number')
              .and.be.within(200, 299)
              .and.equal(200)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "and with numbers",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  })
})

describe.each(NAMESPACES)(
  "%s.expect() - Basic Function Assertions",
  (namespace) => {
    test("should support `.throw()` for error throwing", () => {
      return expect(
        runTest(`
        ${namespace}.test("throw assertions", () => {
          ${namespace}.expect(() => { throw new Error('oops') }).to.throw()
          ${namespace}.expect(() => { throw new Error('oops') }).to.throw(Error)
          ${namespace}.expect(() => {}).to.not.throw()
        })
      `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throw assertions",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.respondTo()` for method existence", () => {
      return expect(
        runTest(`
        ${namespace}.test("respondTo assertions", () => {
          const obj = { method: () => {} }
          ${namespace}.expect(obj).to.respondTo('method')
          ${namespace}.expect([]).to.respondTo('push')
          ${namespace}.expect('').to.respondTo('charAt')
        })
      `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "respondTo assertions",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })

    test("should support `.satisfy()` for custom predicates", () => {
      return expect(
        runTest(`
        ${namespace}.test("satisfy assertions", () => {
          ${namespace}.expect(2).to.satisfy((n) => n > 0)
          ${namespace}.expect(10).to.satisfy((n) => n % 2 === 0)
          ${namespace}.expect('hello').to.satisfy((s) => s.length > 3)
        })
      `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy assertions",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ],
        }),
      ])
    })
  }
)
