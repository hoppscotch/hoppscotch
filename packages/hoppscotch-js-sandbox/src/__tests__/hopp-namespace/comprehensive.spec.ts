import { getDefaultRESTRequest } from "@hoppscotch/data"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { describe, expect, test } from "vitest"

import { runTestScript } from "~/node"
import { TestResponse } from "~/types"

const defaultRequest = getDefaultRESTRequest()
const fakeResponse: TestResponse = {
  status: 200,
  body: "hoi",
  headers: [],
}

const func = (script: string, res: TestResponse = fakeResponse) =>
  pipe(
    runTestScript(script, {
      envs: { global: [], selected: [] },
      request: defaultRequest,
      response: res,
    }),
    TE.map((x) => x.tests)
  )

describe("hopp.expect - Comprehensive Chai BDD API", () => {
  describe("Language Chains", () => {
    test("hopp.expect(...).to.equal(...) should pass with language chains", () => {
      return expect(
        func(`
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
                    "Expected [1,2,3] to be an array that has lengthOf 3",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Type Assertions", () => {
    test("hopp.expect(...).to.be.a/an(...) should assert types correctly", () => {
      return expect(
        func(`
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
  })

  describe("Truthiness Assertions", () => {
    test("hopp.expect(...).to.be.true/false/ok should work", () => {
      return expect(
        func(`
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
    test("hopp.expect(...).to.be.null/undefined should work", () => {
      return expect(
        func(`
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
  })

  describe("Existence Assertions", () => {
    test("hopp.expect(...).to.exist should work", () => {
      return expect(
        func(`
          hopp.test("existence assertions work", () => {
            hopp.expect(1).to.exist
            hopp.expect('hello').to.exist
            hopp.expect({}).to.exist
            hopp.expect([]).to.exist
            hopp.expect(false).to.exist
            hopp.expect(0).to.exist
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "existence assertions work",
              expectResults: [
                { status: "pass", message: "Expected 1 to exist" },
                { status: "pass", message: "Expected 'hello' to exist" },
                { status: "pass", message: "Expected {} to exist" },
                { status: "pass", message: "Expected [] to exist" },
                { status: "pass", message: "Expected false to exist" },
                { status: "pass", message: "Expected 0 to exist" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Emptiness Assertions", () => {
    test("hopp.expect(...).to.be.empty should work for different types", () => {
      return expect(
        func(`
          hopp.test("emptiness assertions work", () => {
            hopp.expect([]).to.be.empty
            hopp.expect('').to.be.empty
            hopp.expect({}).to.be.empty
            hopp.expect(new Set()).to.be.empty
            hopp.expect(new Map()).to.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "emptiness assertions work",
              expectResults: [
                { status: "pass", message: "Expected [] to be empty" },
                { status: "pass", message: "Expected '' to be empty" },
                { status: "pass", message: "Expected {} to be empty" },
                { status: "pass", message: "Expected new Set() to be empty" },
                { status: "pass", message: "Expected new Map() to be empty" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Equality Assertions", () => {
    test("hopp.expect(...).to.equal vs .to.eql vs .to.deep.equal should work", () => {
      return expect(
        func(`
          hopp.test("equality assertions work", () => {
            hopp.expect(1).to.equal(1)
            hopp.expect('foo').to.equal('foo')
            hopp.expect({a: 1}).to.eql({a: 1})
            hopp.expect({a: 1}).to.deep.equal({a: 1})
            hopp.expect([1, 2]).to.eql([1, 2])
            hopp.expect([1, 2]).to.deep.equal([1, 2])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "equality assertions work",
              expectResults: [
                { status: "pass", message: "Expected 1 to equal 1" },
                { status: "pass", message: "Expected 'foo' to equal 'foo'" },
                { status: "pass", message: "Expected {a: 1} to eql {a: 1}" },
                {
                  status: "pass",
                  message: "Expected {a: 1} to deep equal {a: 1}",
                },
                { status: "pass", message: "Expected [1, 2] to eql [1, 2]" },
                {
                  status: "pass",
                  message: "Expected [1, 2] to deep equal [1, 2]",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Inclusion Assertions", () => {
    test("hopp.expect(...).to.include/contain should work for different types", () => {
      return expect(
        func(`
          hopp.test("inclusion assertions work", () => {
            hopp.expect('foobar').to.include('foo')
            hopp.expect([1, 2, 3]).to.include(2)
            hopp.expect({a: 1, b: 2, c: 3}).to.include({a: 1, b: 2})
            hopp.expect('foobar').to.contain('bar')
            hopp.expect([1, 2, 3]).to.contain(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "inclusion assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 'foobar' to include 'foo'",
                },
                { status: "pass", message: "Expected [1, 2, 3] to include 2" },
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2, c: 3} to include {a: 1, b: 2}",
                },
                {
                  status: "pass",
                  message: "Expected 'foobar' to include 'bar'",
                },
                { status: "pass", message: "Expected [1, 2, 3] to include 3" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Numerical Comparisons", () => {
    test("hopp.expect(...).to.be.above/below/within should work", () => {
      return expect(
        func(`
          hopp.test("numerical comparisons work", () => {
            hopp.expect(2).to.be.above(1)
            hopp.expect(2).to.be.below(3)
            hopp.expect(2).to.be.within(1, 3)
            hopp.expect(2).to.be.at.least(2)
            hopp.expect(2).to.be.at.most(2)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "numerical comparisons work",
              expectResults: [
                { status: "pass", message: "Expected 2 to be above 1" },
                { status: "pass", message: "Expected 2 to be below 3" },
                { status: "pass", message: "Expected 2 to be within 1, 3" },
                { status: "pass", message: "Expected 2 to be at least 2" },
                { status: "pass", message: "Expected 2 to be at most 2" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Property Assertions", () => {
    test("hopp.expect(...).to.have.property should work", () => {
      return expect(
        func(`
          hopp.test("property assertions work", () => {
            hopp.expect({a: 1}).to.have.property('a')
            hopp.expect({a: 1}).to.have.property('a', 1)
            hopp.expect({x: {a: 1}}).to.have.deep.property('x', {a: 1})
            hopp.expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]')
            hopp.expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]', 'y')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "property assertions work",
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
                  message:
                    "Expected {x: {a: 1}} to have deep property 'x', {a: 1}",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: {b: ['x', 'y']}} to have nested property 'a.b[1]'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: {b: ['x', 'y']}} to have nested property 'a.b[1]', 'y'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("hopp.expect(...).to.have.own.property should work", () => {
      return expect(
        func(`
          hopp.test("own property assertions work", () => {
            hopp.expect({a: 1}).to.have.own.property('a')
            hopp.expect({a: 1}).to.have.own.property('a', 1)
            hopp.expect({x: {a: 1}}).to.have.deep.own.property('x', {a: 1})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "own property assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to have own property 'a'",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1} to have own property 'a', 1",
                },
                {
                  status: "pass",
                  message:
                    "Expected {x: {a: 1}} to have deep own property 'x', {a: 1}",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Length Assertions", () => {
    test("hopp.expect(...).to.have.lengthOf should work", () => {
      return expect(
        func(`
          hopp.test("length assertions work", () => {
            hopp.expect([1, 2, 3]).to.have.lengthOf(3)
            hopp.expect('foo').to.have.lengthOf(3)
            hopp.expect(new Set([1, 2, 3])).to.have.lengthOf(3)
            hopp.expect(new Map([['a', 1], ['b', 2], ['c', 3]])).to.have.lengthOf(3)
            hopp.expect([1, 2, 3]).to.have.length(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "length assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have lengthOf 3",
                },
                {
                  status: "pass",
                  message: "Expected 'foo' to have lengthOf 3",
                },
                {
                  status: "pass",
                  message: "Expected new Set([1, 2, 3]) to have lengthOf 3",
                },
                {
                  status: "pass",
                  message:
                    "Expected new Map([['a', 1], ['b', 2], ['c', 3]]) to have lengthOf 3",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have length 3",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Key Assertions", () => {
    test("hopp.expect(...).to.have.keys should work", () => {
      return expect(
        func(`
          hopp.test("key assertions work", () => {
            hopp.expect({a: 1, b: 2}).to.have.all.keys('a', 'b')
            hopp.expect(['x', 'y']).to.have.all.keys(0, 1)
            hopp.expect({a: 1, b: 2}).to.have.all.keys(['a', 'b'])
            hopp.expect({a: 1, b: 2}).to.have.any.keys('a', 'c')
            hopp.expect({a: 1, b: 2, c: 3}).to.include.all.keys('a', 'b')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "key assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have all keys 'a', 'b'",
                },
                {
                  status: "pass",
                  message: "Expected ['x', 'y'] to have all keys '0', '1'",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have all keys 'a', 'b'",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have any keys 'a', 'c'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2, c: 3} to include all keys 'a', 'b'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Instance Assertions", () => {
    test("hopp.expect(...).to.be.an.instanceof should work", () => {
      return expect(
        func(`
          hopp.test("instance assertions work", () => {
            hopp.expect([1, 2]).to.be.an.instanceof(Array)
            hopp.expect(new Date()).to.be.an.instanceof(Date)
            hopp.expect(new Error()).to.be.an.instanceof(Error)
            hopp.expect(new RegExp('test')).to.be.an.instanceof(RegExp)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "instance assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1,2] to be an instanceof Array",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /^Expected '.+' to be an instanceof Date$/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /^Expected \{name: 'Error', message: '', stack: '[\s\S]+'\} to be an instanceof Error$/
                  ),
                },
                {
                  status: "pass",
                  message: "Expected {} to be an instanceof RegExp",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("String/Pattern Matching", () => {
    test("hopp.expect(...).to.match/string should work", () => {
      return expect(
        func(`
          hopp.test("string matching assertions work", () => {
            hopp.expect('foobar').to.match(/^foo/)
            hopp.expect('foobar').to.have.string('bar')
            hopp.expect('hello world').to.match(/world$/)
            hopp.expect('test123').to.have.string('123')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "string matching assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 'foobar' to match /^foo/",
                },
                {
                  status: "pass",
                  message: "Expected 'foobar' to have string 'bar'",
                },
                {
                  status: "pass",
                  message: "Expected 'hello world' to match /world$/",
                },
                {
                  status: "pass",
                  message: "Expected 'test123' to have string '123'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Member Assertions", () => {
    test("hopp.expect(...).to.have.members should work", () => {
      return expect(
        func(`
          hopp.test("member assertions work", () => {
            hopp.expect([1, 2, 3]).to.have.members([2, 1, 3])
            hopp.expect([1, 2, 2]).to.have.members([2, 1, 2])
            hopp.expect([1, 2, 3]).to.have.ordered.members([1, 2, 3])
            hopp.expect([1, 2, 3]).to.include.members([1, 2])
            hopp.expect([{a: 1}]).to.have.deep.members([{a: 1}])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "member assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have members [2, 1, 3]",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 2] to have members [2, 1, 2]",
                },
                {
                  status: "pass",
                  message:
                    "Expected [1, 2, 3] to have ordered members [1, 2, 3]",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to include members [1, 2]",
                },
                {
                  status: "pass",
                  message: "Expected [{a: 1}] to have deep members [{a: 1}]",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("OneOf Assertions", () => {
    test("hopp.expect(...).to.be.oneOf should work", () => {
      return expect(
        func(`
          hopp.test("oneOf assertions work", () => {
            hopp.expect(1).to.be.oneOf([1, 2, 3])
            hopp.expect('foo').to.be.oneOf(['foo', 'bar', 'baz'])
            hopp.expect('Today is sunny').to.contain.oneOf(['sunny', 'cloudy'])
            hopp.expect([1,2,3]).to.contain.oneOf([3,4,5])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "oneOf assertions work",
              expectResults: [
                { status: "pass", message: "Expected 1 to be oneOf [1, 2, 3]" },
                {
                  status: "pass",
                  message: "Expected 'foo' to be oneOf ['foo', 'bar', 'baz']",
                },
                {
                  status: "pass",
                  message:
                    "Expected 'Today is sunny' to include oneOf ['sunny', 'cloudy']",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to include oneOf [3, 4, 5]",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Object State Assertions", () => {
    test("hopp.expect(...).to.be.extensible/sealed/frozen should work", () => {
      return expect(
        func(`
          hopp.test("object state assertions work", () => {
            hopp.expect({a: 1}).to.be.extensible
            hopp.expect(Object.seal({})).to.be.sealed
            hopp.expect(Object.freeze({})).to.be.frozen
            hopp.expect(Object.freeze({})).to.be.sealed
            hopp.expect(1).to.be.sealed
            hopp.expect(1).to.be.frozen
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "object state assertions work",
              expectResults: [
                { status: "pass", message: "Expected {a: 1} to be extensible" },
                {
                  status: "pass",
                  message: "Expected Object.freeze({}) to be sealed",
                },
                {
                  status: "pass",
                  message: "Expected Object.freeze({}) to be frozen",
                },
                {
                  status: "pass",
                  message: "Expected Object.freeze({}) to be sealed",
                },
                { status: "pass", message: "Expected 1 to be sealed" },
                { status: "pass", message: "Expected 1 to be frozen" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Number State Assertions", () => {
    test("hopp.expect(...).to.be.finite should work", () => {
      return expect(
        func(`
          hopp.test("number state assertions work", () => {
            hopp.expect(1).to.be.finite
            hopp.expect(42).to.be.finite
            hopp.expect(-100).to.be.finite
            hopp.expect(0).to.be.finite
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "number state assertions work",
              expectResults: [
                { status: "pass", message: "Expected 1 to be finite" },
                { status: "pass", message: "Expected 42 to be finite" },
                { status: "pass", message: "Expected -100 to be finite" },
                { status: "pass", message: "Expected 0 to be finite" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Approximate Assertions", () => {
    test("hopp.expect(...).to.be.closeTo should work", () => {
      return expect(
        func(`
          hopp.test("approximate assertions work", () => {
            hopp.expect(1.5).to.be.closeTo(1, 0.5)
            hopp.expect(1.5).to.be.closeTo(2, 0.5)
            hopp.expect(1.5).to.be.approximately(1.5, 0.01)
            hopp.expect(Math.PI).to.be.closeTo(3.14, 0.01)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "approximate assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 1.5 to be closeTo 1, 0.5",
                },
                {
                  status: "pass",
                  message: "Expected 1.5 to be closeTo 2, 0.5",
                },
                {
                  status: "pass",
                  message: "Expected 1.5 to be approximately 1.5, 0.01",
                },
                {
                  status: "pass",
                  message: "Expected Math.PI to be closeTo 3.14, 0.01",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Function Assertions", () => {
    test("hopp.expect(...).to.throw should work", () => {
      return expect(
        func(`
          hopp.test("function assertions work", () => {
            hopp.expect(() => { throw new Error('test') }).to.throw()
            hopp.expect(() => { throw new TypeError('type error') }).to.throw(TypeError)
            hopp.expect(() => { throw new Error('salmon') }).to.throw('salmon')
            hopp.expect(() => { throw new Error('illegal salmon!') }).to.throw(/salmon/)
            hopp.expect(() => {}).to.not.throw()
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "function assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new Error('test') } to throw",
                },
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new TypeError('type error') } to throw TypeError",
                },
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new Error('salmon') } to throw 'salmon'",
                },
                {
                  status: "pass",
                  message:
                    "Expected () => { throw new Error('illegal salmon!') } to throw /salmon/",
                },
                { status: "pass", message: "Expected () => {} to not throw" },
              ],
            }),
          ],
        }),
      ])
    })

    test("hopp.expect(...).to.respondTo should work", () => {
      return expect(
        func(`
          hopp.test("respondTo assertions work", () => {
            function Cat() {}
            Cat.prototype.meow = function() {}
            Cat.hiss = function() {}
            
            const cat = new Cat()
            hopp.expect(cat).to.respondTo('meow')
            hopp.expect(Cat).to.respondTo('meow')
            hopp.expect(Cat).itself.to.respondTo('hiss')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "respondTo assertions work",
              expectResults: [
                { status: "pass", message: "Expected {} to respondTo 'meow'" },
                {
                  status: "pass",
                  message: "Expected function Cat() {} to respondTo 'meow'",
                },
                {
                  status: "pass",
                  message:
                    "Expected function Cat() {} to itself respondTo 'hiss'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Custom Function Assertions", () => {
    test("hopp.expect(...).to.satisfy should work", () => {
      return expect(
        func(`
          hopp.test("satisfy assertions work", () => {
            hopp.expect(1).to.satisfy(function(num) { return num > 0 })
            hopp.expect(10).to.satisfy(function(num) { return num % 2 === 0 })
            hopp.expect('hello').to.satisfy(function(str) { return str.length === 5 })
            hopp.expect([1,2,3]).to.satisfy(function(arr) { return arr.length === 3 })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "satisfy assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected 1 to satisfy function(num) { return num > 0 }",
                },
                {
                  status: "pass",
                  message:
                    "Expected 10 to satisfy function(num) { return num % 2 === 0 }",
                },
                {
                  status: "pass",
                  message:
                    "Expected 'hello' to satisfy function(str) { return str.length === 5 }",
                },
                {
                  status: "pass",
                  message:
                    "Expected [1, 2, 3] to satisfy function(arr) { return arr.length === 3 }",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Negation with .not", () => {
    test("hopp.expect(...).to.not.* should work", () => {
      return expect(
        func(`
          hopp.test("negation assertions work", () => {
            hopp.expect(1).to.not.equal(2)
            hopp.expect('foo').to.not.be.a('number')
            hopp.expect(true).to.not.be.false
            hopp.expect([1, 2, 3]).to.not.include(4)
            hopp.expect({a: 1}).to.not.have.property('b')
            hopp.expect([1, 2, 3]).to.not.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation assertions work",
              expectResults: [
                { status: "pass", message: "Expected 1 to not equal 2" },
                {
                  status: "pass",
                  message: "Expected 'foo' to not be a number",
                },
                { status: "pass", message: "Expected true to not be false" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to not include 4",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1} to not have property 'b'",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to not be empty",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Deep Comparisons", () => {
    test("hopp.expect(...).to.deep.* should work", () => {
      return expect(
        func(`
          hopp.test("deep comparison assertions work", () => {
            hopp.expect({a: 1}).to.deep.equal({a: 1})
            hopp.expect([{a: 1}]).to.deep.include({a: 1})
            hopp.expect({x: {a: 1}}).to.deep.include({x: {a: 1}})
            hopp.expect([{a: 1}]).to.have.deep.members([{a: 1}])
            hopp.expect({x: {a: 1}}).to.have.deep.property('x', {a: 1})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep comparison assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to deep equal {a: 1}",
                },
                {
                  status: "pass",
                  message: "Expected [{a: 1}] to deep include {a: 1}",
                },
                {
                  status: "pass",
                  message: "Expected {x: {a: 1}} to deep include {x: {a: 1}}",
                },
                {
                  status: "pass",
                  message: "Expected [{a: 1}] to have deep members [{a: 1}]",
                },
                {
                  status: "pass",
                  message:
                    "Expected {x: {a: 1}} to have deep property 'x', {a: 1}",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Negation with Modifiers", () => {
    test("hopp.expect(...).to.not with deep/own/nested/ordered should work", () => {
      return expect(
        func(`
          hopp.test("negation with modifiers work", () => {
            hopp.expect({a: 1}).to.not.deep.equal({b: 2})
            hopp.expect([1,2]).to.not.have.ordered.members([2,1])
            hopp.expect({a: 1}).to.not.have.own.property('b')
            hopp.expect({a: {b: 1}}).to.not.have.nested.property('a.c')
            hopp.expect([{a: 1}]).to.not.have.deep.members([{b: 2}])
            hopp.expect({a: 1, b: 2}).to.not.have.any.keys('c', 'd')
            hopp.expect({a: 1, b: 2}).to.not.have.all.keys('a', 'b', 'c')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation with modifiers work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to not deep equal {b: 2}",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2] to not have ordered members [2, 1]",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1} to not have own property 'b'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: {b: 1}} to not have nested property 'a.c'",
                },
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}] to not have deep members [{b: 2}]",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2} to not have any keys 'c', 'd'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2} to not have all keys 'a', 'b', 'c'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Failure Cases", () => {
    test("hopp.expect(...) should properly report assertion failures", () => {
      return expect(
        func(`
          hopp.test("failure cases work", () => {
            hopp.expect(1).to.equal(2)
            hopp.expect('foo').to.be.a('number')
            hopp.expect([1,2]).to.have.lengthOf(5)
            hopp.expect({a: 1}).to.have.property('b')
            hopp.expect(5).to.be.above(10)
            hopp.expect('hello').to.include('world')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "failure cases work",
              expectResults: [
                { status: "fail", message: "Expected 1 to equal 2" },
                { status: "fail", message: "Expected 'foo' to be a number" },
                {
                  status: "fail",
                  message: "Expected [1, 2] to have lengthOf 5",
                },
                {
                  status: "fail",
                  message: "Expected {a: 1} to have property 'b'",
                },
                { status: "fail", message: "Expected 5 to be above 10" },
                {
                  status: "fail",
                  message: "Expected 'hello' to include 'world'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("hopp.expect(...).not should fail when assertion is true", () => {
      return expect(
        func(`
          hopp.test("negation failures work", () => {
            hopp.expect(1).to.not.equal(1)
            hopp.expect('foo').to.not.be.a('string')
            hopp.expect([1,2,3]).to.not.include(2)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation failures work",
              expectResults: [
                { status: "fail", message: "Expected 1 to not equal 1" },
                {
                  status: "fail",
                  message: "Expected 'foo' to not be a string",
                },
                {
                  status: "fail",
                  message: "Expected [1, 2, 3] to not include 2",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Edge Cases", () => {
    test("hopp.expect(...) with null/undefined/NaN edge cases should work", () => {
      return expect(
        func(`
          hopp.test("edge cases work", () => {
            hopp.expect(null).to.be.null
            hopp.expect(undefined).to.be.undefined
            hopp.expect(NaN).to.be.NaN
            hopp.expect(0).to.not.be.null
            hopp.expect('').to.not.be.undefined
            hopp.expect(1).to.not.be.NaN
            hopp.expect(null).to.not.be.ok
            hopp.expect(undefined).to.not.exist
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "edge cases work",
              expectResults: [
                { status: "pass", message: "Expected null to be null" },
                {
                  status: "pass",
                  message: "Expected undefined to be undefined",
                },
                { status: "pass", message: "Expected NaN to be NaN" },
                { status: "pass", message: "Expected 0 to not be null" },
                { status: "pass", message: "Expected '' to not be undefined" },
                { status: "pass", message: "Expected 1 to not be NaN" },
                { status: "pass", message: "Expected null to not be ok" },
                { status: "pass", message: "Expected undefined to not exist" },
              ],
            }),
          ],
        }),
      ])
    })

    test("hopp.expect(...) with empty values should work", () => {
      return expect(
        func(`
          hopp.test("empty value edge cases work", () => {
            hopp.expect([]).to.be.empty
            hopp.expect('').to.be.empty
            hopp.expect({}).to.be.empty
            hopp.expect([1]).to.not.be.empty
            hopp.expect('a').to.not.be.empty
            hopp.expect({a: 1}).to.not.be.empty
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "empty value edge cases work",
              expectResults: [
                { status: "pass", message: "Expected [] to be empty" },
                { status: "pass", message: "Expected '' to be empty" },
                { status: "pass", message: "Expected {} to be empty" },
                { status: "pass", message: "Expected [1] to not be empty" },
                { status: "pass", message: "Expected 'a' to not be empty" },
                { status: "pass", message: "Expected {a: 1} to not be empty" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Multiple Modifier Combinations", () => {
    test("hopp.expect(...) with deep + own combinations should work", () => {
      return expect(
        func(`
          hopp.test("deep + own combinations work", () => {
            hopp.expect({x: {a: 1}}).to.have.deep.own.property('x', {a: 1})
            hopp.expect({x: {a: 1}}).to.not.have.own.property('y')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep + own combinations work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected {x: {a: 1}} to have deep own property 'x', {a: 1}",
                },
                {
                  status: "pass",
                  message: "Expected {x: {a: 1}} to not have own property 'y'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("hopp.expect(...) with include + members should work", () => {
      return expect(
        func(`
          hopp.test("include + members combinations work", () => {
            hopp.expect([1, 2, 3]).to.include.members([1, 2])
            hopp.expect([1, 2, 3, 4]).to.include.members([2, 3])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "include + members combinations work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to include members [1, 2]",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3, 4] to include members [2, 3]",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Language Chain Variations", () => {
    test("hopp.expect(...) with different language chain combinations should work", () => {
      return expect(
        func(`
          hopp.test("language chain variations work", () => {
            hopp.expect(5).which.is.a('number')
            hopp.expect([1,2]).that.has.lengthOf(2)
            hopp.expect({a: 1}).which.has.property('a')
            hopp.expect('test').that.does.include('es')
            hopp.expect(10).but.does.not.equal(5)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "language chain variations work",
              expectResults: [
                { status: "pass", message: "Expected 5 to be a number" },
                {
                  status: "pass",
                  message: "Expected [1, 2] to have lengthOf 2",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1} to have property 'a'",
                },
                { status: "pass", message: "Expected 'test' to include 'es'" },
                { status: "pass", message: "Expected 10 to not equal 5" },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Boundary Value Testing", () => {
    test("hopp.expect(...) with boundary values should work", () => {
      return expect(
        func(`
          hopp.test("boundary values work", () => {
            hopp.expect(0).to.equal(0)
            hopp.expect(-0).to.equal(0)
            hopp.expect(100).to.be.finite
            hopp.expect(0.5).to.be.finite
            hopp.expect(Infinity).to.not.be.finite
            hopp.expect(-Infinity).to.not.be.finite
            hopp.expect(0.1 + 0.2).to.be.closeTo(0.3, 0.0001)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "boundary values work",
              expectResults: [
                { status: "pass", message: "Expected 0 to equal 0" },
                { status: "pass", message: "Expected 0 to equal 0" },
                {
                  status: "pass",
                  message: "Expected 100 to be finite",
                },
                {
                  status: "pass",
                  message: "Expected 0.5 to be finite",
                },
                {
                  status: "pass",
                  message: "Expected Infinity to not be finite",
                },
                {
                  status: "pass",
                  message: "Expected -Infinity to not be finite",
                },
                {
                  status: "pass",
                  message:
                    "Expected 0.30000000000000004 to be closeTo 0.3, 0.0001",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
