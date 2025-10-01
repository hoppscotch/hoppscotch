/**
 * PM Namespace - Chai Assertions Test Suite
 *
 * This test suite comprehensively validates all Chai.js BDD-style assertions
 * available through the `pm.expect()` API in the Postman compatibility layer.
 *
 * The `pm` namespace provides seamless migration from Postman scripts, allowing
 * existing Postman collections to work in Hoppscotch without modification.
 *
 * Coverage includes:
 * - Core equality and type assertions (equal, eql, a, an)
 * - Numerical comparisons (above, below, within, closeTo)
 * - Property and collection assertions (property, keys, members, include)
 * - Function assertions (throw, respondTo, satisfy)
 * - Side-effect assertions (change, increase, decrease with .by() chaining)
 * - Modifiers (not, deep, nested, own, ordered)
 * - Language chains (to, be, been, is, that, which, and, has, have, with, at, of, same)
 * - Integration with pm.test() wrapper
 *
 * This ensures 100% feature parity between `pm.expect` and `hopp.expect`.
 *
 * @see RFC: Enhanced Scripting - Chai.js Integration
 * @see RFC: Postman Compatibility Layer
 * @see https://github.com/hoppscotch/hoppscotch/discussions/5221
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`pm.expect` - Postman Compatibility with Chai Assertions", () => {
  describe("Core Assertions Parity", () => {
    test("should support equality assertions (`.equal()`, `.eql()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect equality works", () => {
            pm.expect(42).to.equal(42)
            pm.expect('test').to.equal('test')
            pm.expect({a: 1}).to.eql({a: 1})
            pm.expect([1, 2, 3]).to.eql([1, 2, 3])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "pm.expect equality works",
              expectResults: [
                { status: "pass", message: "Expected 42 to equal 42" },
                { status: "pass", message: "Expected 'test' to equal 'test'" },
                { status: "pass", message: "Expected {a: 1} to eql {a: 1}" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to eql [1, 2, 3]",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support type assertions (`.a()`, `.an()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect type assertions work", () => {
            pm.expect('foo').to.be.a('string')
            pm.expect({a: 1}).to.be.an('object')
            pm.expect([1, 2, 3]).to.be.an('array')
            pm.expect(42).to.be.a('number')
            pm.expect(true).to.be.a('boolean')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "pm.expect type assertions work",
              expectResults: [
                { status: "pass", message: "Expected 'foo' to be a string" },
                { status: "pass", message: "Expected {a: 1} to be an object" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
                { status: "pass", message: "Expected 42 to be a number" },
                { status: "pass", message: "Expected true to be a boolean" },
              ],
            }),
          ],
        }),
      ])
    })

    test("should support truthiness assertions (`.true`, `.false`, `.ok`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect truthiness works", () => {
            pm.expect(true).to.be.true
            pm.expect(false).to.be.false
            pm.expect(1).to.be.ok
            pm.expect('hello').to.be.ok
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "pm.expect truthiness works",
              expectResults: [
                { status: "pass", message: "Expected true to be true" },
                { status: "pass", message: "Expected false to be false" },
                { status: "pass", message: "Expected 1 to be ok" },
                { status: "pass", message: "Expected 'hello' to be ok" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Numerical Comparisons Parity", () => {
    test("should support `.above()`, `.below()`, `.within()` comparisons", () => {
      return expect(
        runTest(`
          pm.test("pm.expect numerical comparisons work", () => {
            pm.expect(10).to.be.above(5)
            pm.expect(5).to.be.below(10)
            pm.expect(5).to.be.within(1, 10)
            pm.expect(1.5).to.be.closeTo(1.0, 0.6)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect numerical comparisons work",
              expectResults: [
                { status: "pass", message: "Expected 10 to be above 5" },
                { status: "pass", message: "Expected 5 to be below 10" },
                { status: "pass", message: "Expected 5 to be within 1, 10" },
                {
                  status: "pass",
                  message: "Expected 1.5 to be closeTo 1, 0.6",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Property and Collection Assertions Parity", () => {
    test("should support property assertions (`.property()`, `.ownProperty()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect property assertions work", () => {
            pm.expect({a: 1}).to.have.property('a')
            pm.expect({a: 1}).to.have.property('a', 1)
            pm.expect({a: 1}).to.have.ownProperty('a')
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect property assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to have property 'a'",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1} to have property 'a', 1",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1} to have own property 'a'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support keys and members assertions", () => {
      return expect(
        runTest(`
          pm.test("pm.expect keys and members work", () => {
            pm.expect({a: 1, b: 2}).to.have.all.keys('a', 'b')
            pm.expect([1, 2, 3]).to.have.members([3, 2, 1])
            pm.expect([1, 2, 3]).to.have.lengthOf(3)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect keys and members work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have all keys 'a', 'b'",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have members [3, 2, 1]",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have lengthOf 3",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support include/contain assertions", () => {
      return expect(
        runTest(`
          pm.test("pm.expect include works", () => {
            pm.expect('foobar').to.include('foo')
            pm.expect([1, 2, 3]).to.include(2)
            pm.expect({a: 1, b: 2}).to.include({a: 1})
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect include works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 'foobar' to include 'foo'",
                },
                { status: "pass", message: "Expected [1, 2, 3] to include 2" },
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to include {a: 1}",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Function Assertions Parity", () => {
    test("should support throw assertions (`.throw()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect throw assertions work", () => {
            pm.expect(() => { throw new Error('oops') }).to.throw()
            pm.expect(() => { throw new Error('oops') }).to.throw(Error)
            pm.expect(() => { throw new Error('oops') }).to.throw('oops')
            pm.expect(() => {}).to.not.throw()
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect throw assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new Error('oops') } to throw",
                },
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new Error('oops') } to throw Error",
                },
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new Error('oops') } to throw 'oops'",
                },
                {
                  status: "pass",
                  message: "Expected () => {} to not throw",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support respondTo assertions (`.respondTo()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect respondTo works", () => {
            const obj = { method: () => {} }
            pm.expect(obj).to.respondTo('method')
            pm.expect([]).to.respondTo('push')
            pm.expect('').to.respondTo('charAt')
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect respondTo works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/respondTo 'method'/),
                },
                {
                  status: "pass",
                  message: "Expected [] to respondTo 'push'",
                },
                {
                  status: "pass",
                  message: "Expected '' to respondTo 'charAt'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support satisfy assertions (`.satisfy()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect satisfy works", () => {
            pm.expect(2).to.satisfy((n) => n > 0)
            pm.expect(10).to.satisfy((n) => n % 2 === 0)
            pm.expect('hello').to.satisfy((s) => s.length > 3)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect satisfy works",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/satisfy/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/satisfy/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/satisfy/),
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Side-Effect Assertions Parity", () => {
    test("should support `.change()`, `.increase()`, `.decrease()` assertions", () => {
      return expect(
        runTest(`
          pm.test("pm.expect side-effects work", () => {
            const obj = { val: 0, count: 5 }
            pm.expect(() => { obj.val = 10 }).to.change(obj, 'val')
            pm.expect(() => { obj.count++ }).to.increase(obj, 'count')
            pm.expect(() => { obj.count-- }).to.decrease(obj, 'count')
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect side-effects work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to change {}.'val'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to increase {}.'count'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to decrease {}.'count'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support chaining with `.by()` for delta assertions", () => {
      return expect(
        runTest(`
          pm.test("pm.expect .by() chaining works", () => {
            const obj = { val: 0 }
            pm.expect(() => { obj.val += 5 }).to.change(obj, 'val').by(5)
            pm.expect(() => { obj.val += 3 }).to.increase(obj, 'val').by(3)
            pm.expect(() => { obj.val -= 2 }).to.decrease(obj, 'val').by(2)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect .by() chaining works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to change {}.'val' by 5",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to increase {}.'val' by 3",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to decrease {}.'val' by 2",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Special Cases and Modifiers Parity", () => {
    test("should support `.instanceof()` assertions", () => {
      return expect(
        runTest(`
          pm.test("pm.expect instanceof works", () => {
            pm.expect([]).to.be.instanceof(Array)
            pm.expect(new Date()).to.be.instanceof(Date)
            pm.expect(/regex/).to.be.instanceof(RegExp)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect instanceof works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [] to be an instanceof Array",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/instanceof Date/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/instanceof RegExp/),
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support negation with `.not` modifier", () => {
      return expect(
        runTest(`
          pm.test("pm.expect negation works", () => {
            pm.expect(1).to.not.equal(2)
            pm.expect('foo').to.not.be.a('number')
            pm.expect(5).to.not.be.above(10)
            pm.expect([1, 2]).to.not.include(3)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect negation works",
              expectResults: [
                { status: "pass", message: "Expected 1 to not equal 2" },
                {
                  status: "pass",
                  message: "Expected 'foo' to not be a number",
                },
                { status: "pass", message: "Expected 5 to not be above 10" },
                {
                  status: "pass",
                  message: "Expected [1, 2] to not include 3",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support deep equality modifiers (`.deep.equal()`, `.deep.property()`)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect deep modifiers work", () => {
            pm.expect({a: 1}).to.deep.equal({a: 1})
            pm.expect({x: {a: 1}}).to.have.deep.property('x', {a: 1})
            pm.expect([{a: 1}, {b: 2}]).to.have.deep.members([{b: 2}, {a: 1}])
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect deep modifiers work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to deep equal {a: 1}",
                },
                {
                  status: "pass",
                  message:
                    "Expected {x: {a: 1}} to have deep property 'x', {a: 1}",
                },
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}, {b: 2}] to have deep members [{b: 2}, {a: 1}]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support language chains (`.to`, `.be`, `.that`, `.and`, etc.)", () => {
      return expect(
        runTest(`
          pm.test("pm.expect language chains work", () => {
            pm.expect(2).to.be.a('number').that.equals(2)
            pm.expect([1,2,3]).to.be.an('array').and.have.lengthOf(3).and.include(2)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "pm.expect language chains work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: "Expected 2 to be a number" },
                {
                  status: "pass",
                  message: "Expected 2 to be a number that equals 2",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to be an array",
                },
              ]),
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("Integration with pm.test()", () => {
    test("should work seamlessly with `pm.test()` wrapper", () => {
      return expect(
        runTest(`
          pm.test("Status code is 200", () => {
            pm.expect(pm.response.code).to.equal(200)
          })

          pm.test("Response is valid", () => {
            pm.expect(pm.response.code).to.be.above(199).and.below(300)
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Status code is 200",
              expectResults: [
                { status: "pass", message: "Expected 200 to equal 200" },
              ],
              children: [],
            },
            {
              descriptor: "Response is valid",
              expectResults: [
                { status: "pass", message: "Expected 200 to be above 199" },
                {
                  status: "pass",
                  message: "Expected 200 to be above 199 and below 300",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })
})
