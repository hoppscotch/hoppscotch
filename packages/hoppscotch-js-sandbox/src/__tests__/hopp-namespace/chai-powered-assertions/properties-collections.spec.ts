/**
 * @see https://github.com/hoppscotch/hoppscotch/discussions/5221
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`hopp.expect` - Properties and Collections Assertions", () => {
  describe("Property Assertions", () => {
    test("should assert basic property existence and values using `.property()`", () => {
      return expect(
        runTest(`
          hopp.test("property assertions work", () => {
            hopp.expect({a: 1}).to.have.property('a')
            hopp.expect({a: 1}).to.have.property('a', 1)
            hopp.expect({x: {a: 1}}).to.have.deep.property('x', {a: 1})
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
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert own properties using `.own.property()`", () => {
      return expect(
        runTest(`
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

    test("should assert property descriptors using `.ownPropertyDescriptor()`", () => {
      return expect(
        runTest(`
          hopp.test("ownPropertyDescriptor assertions work", () => {
            const obj = {}
            Object.defineProperty(obj, 'test', {
              value: 42,
              writable: false,
              enumerable: true,
              configurable: false
            })

            hopp.expect(obj).to.have.ownPropertyDescriptor('test')
            hopp.expect(obj).to.have.ownPropertyDescriptor('test', {
              value: 42,
              writable: false,
              enumerable: true,
              configurable: false
            })
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "ownPropertyDescriptor assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {} to have ownPropertyDescriptor 'test'",
                },
                {
                  status: "pass",
                  message: "Expected {} to have ownPropertyDescriptor 'test'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Nested Property Assertions", () => {
    test("should assert nested properties using `.nested.property()`", () => {
      return expect(
        runTest(`
          hopp.test("nested property assertions work", () => {
            hopp.expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]')
            hopp.expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[1]', 'y')
            hopp.expect({a: {b: ['x', 'y']}}).to.have.nested.property('a.b[0]', 'x')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "nested property assertions work",
              expectResults: [
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
                {
                  status: "pass",
                  message:
                    "Expected {a: {b: ['x', 'y']}} to have nested property 'a.b[0]', 'x'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert complex nested properties using `.deep.nested.property()`", () => {
      return expect(
        runTest(`
          hopp.test("deep nested property testing work", () => {
            const complexObj = {
              user: {
                profile: {
                  settings: {
                    theme: 'dark',
                    notifications: {
                      email: true,
                      push: false
                    }
                  },
                  metadata: ['tag1', 'tag2', 'tag3']
                }
              },
              array: [
                {nested: {deep: 'value'}},
                {nested: {deeper: {deepest: 42}}}
              ]
            }

            hopp.expect(complexObj).to.have.deep.nested.property('user.profile.settings', {
              theme: 'dark',
              notifications: {
                email: true,
                push: false
              }
            })

            hopp.expect(complexObj).to.have.nested.property('user.profile.metadata[1]', 'tag2')
            hopp.expect(complexObj).to.have.nested.property('array[0].nested.deep', 'value')
            hopp.expect(complexObj).to.have.nested.property('array[1].nested.deeper.deepest', 42)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep nested property testing work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have deep nested property 'user\.profile\.settings'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have nested property 'user\.profile\.metadata\[1\]', 'tag2'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have nested property 'array\[0\]\.nested\.deep', 'value'/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have nested property 'array\[1\]\.nested\.deeper\.deepest', 42/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should negate nested property assertions", () => {
      return expect(
        runTest(`
          hopp.test("negation with nested properties work", () => {
            hopp.expect({a: 1}).to.not.have.own.property('b')
            hopp.expect({a: {b: 1}}).to.not.have.nested.property('a.c')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation with nested properties work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to not have own property 'b'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: {b: 1}} to not have nested property 'a.c'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Keys Assertions", () => {
    test("should assert all keys using `.all.keys()`", () => {
      return expect(
        runTest(`
          hopp.test("all keys assertions work", () => {
            hopp.expect({a: 1, b: 2}).to.have.all.keys('a', 'b')
            hopp.expect(['x', 'y']).to.have.all.keys(0, 1)
            hopp.expect({a: 1, b: 2}).to.have.all.keys(['a', 'b'])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "all keys assertions work",
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
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert any keys using `.any.keys()`", () => {
      return expect(
        runTest(`
          hopp.test("any keys assertions work", () => {
            hopp.expect({a: 1, b: 2}).to.have.any.keys('a', 'c')
            hopp.expect({a: 1, b: 2}).to.have.any.keys(['a', 'z'])
            hopp.expect({a: 1, b: 2, c: 3, d: 4}).to.have.any.keys('x', 'y', 'z', 'a')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "any keys assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have any keys 'a', 'c'",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have any keys 'a', 'z'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2, c: 3, d: 4} to have any keys 'x', 'y', 'z', 'a'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert included keys using `.include.keys()`", () => {
      return expect(
        runTest(`
          hopp.test("include keys assertions work", () => {
            hopp.expect({a: 1, b: 2, c: 3}).to.include.all.keys('a', 'b')
            hopp.expect({a: 1, b: 2, c: 3, d: 4}).to.include.any.keys('a', 'z')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "include keys assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2, c: 3} to include all keys 'a', 'b'",
                },
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2, c: 3, d: 4} to include any keys 'a', 'z'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should negate keys assertions", () => {
      return expect(
        runTest(`
          hopp.test("negation with keys work", () => {
            hopp.expect({a: 1, b: 2}).to.not.have.any.keys('x', 'y', 'z')
            hopp.expect({a: 1, b: 2}).to.not.have.all.keys('a', 'b', 'c')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation with keys work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2} to not have any keys 'x', 'y', 'z'",
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

  describe("Members Assertions", () => {
    test("should assert array members using `.members()`", () => {
      return expect(
        runTest(`
          hopp.test("member assertions work", () => {
            hopp.expect([1, 2, 3]).to.have.members([2, 1, 3])
            hopp.expect([1, 2, 2]).to.have.members([2, 1, 2])
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
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert included members using `.include.members()`", () => {
      return expect(
        runTest(`
          hopp.test("include members assertions work", () => {
            hopp.expect([1, 2, 3]).to.include.members([1, 2])
            hopp.expect([1, 2, 3, 4]).to.include.members([2, 3])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "include members assertions work",
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

    test("should assert deep members using `.deep.members()`", () => {
      return expect(
        runTest(`
          hopp.test("deep members assertions work", () => {
            hopp.expect([{a: 1}]).to.have.deep.members([{a: 1}])
            hopp.expect([{a: 1}, {b: 2}]).to.have.deep.members([{b: 2}, {a: 1}])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep members assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [{a: 1}] to have deep members [{a: 1}]",
                },
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}, {b: 2}] to have deep members [{b: 2}, {a: 1}]",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert ordered members using `.ordered.members()`", () => {
      return expect(
        runTest(`
          hopp.test("ordered members assertions work", () => {
            hopp.expect([1, 2, 3]).to.have.ordered.members([1, 2, 3])
            hopp.expect([1, 2]).to.not.have.ordered.members([2, 1])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "ordered members assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected [1, 2, 3] to have ordered members [1, 2, 3]",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2] to not have ordered members [2, 1]",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert deep ordered members using `.deep.ordered.members()`", () => {
      return expect(
        runTest(`
          hopp.test("deep ordered members assertions work", () => {
            hopp.expect([{a: 1}, {b: 2}]).to.have.deep.ordered.members([{a: 1}, {b: 2}])
            hopp.expect([{a: 1}, {b: 2}]).to.not.have.deep.ordered.members([{b: 2}, {a: 1}])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep ordered members assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}, {b: 2}] to have deep ordered members [{a: 1}, {b: 2}]",
                },
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}, {b: 2}] to not have deep ordered members [{b: 2}, {a: 1}]",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert include deep ordered members using `.include.deep.ordered.members()`", () => {
      return expect(
        runTest(`
          hopp.test("include deep ordered members assertions work", () => {
            hopp.expect([{a: 1}, {b: 2}, {c: 3}]).to.include.deep.ordered.members([{a: 1}, {b: 2}])
            hopp.expect([{a: 1}, {b: 2}, {c: 3}]).to.not.include.deep.ordered.members([{b: 2}, {a: 1}])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "include deep ordered members assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}, {b: 2}, {c: 3}] to include deep ordered members [{a: 1}, {b: 2}]",
                },
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}, {b: 2}, {c: 3}] to not include deep ordered members [{b: 2}, {a: 1}]",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should negate members assertions", () => {
      return expect(
        runTest(`
          hopp.test("negation with members work", () => {
            hopp.expect([{a: 1}]).to.not.have.deep.members([{b: 2}])
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "negation with members work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected [{a: 1}] to not have deep members [{b: 2}]",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Length Assertions", () => {
    test("should assert length for arrays using `.lengthOf()`", () => {
      return expect(
        runTest(`
          hopp.test("array length assertions work", () => {
            hopp.expect([1, 2, 3]).to.have.lengthOf(3)
            hopp.expect([1, 2, 3]).to.have.length(3)
            hopp.expect([]).to.have.lengthOf(0)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "array length assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have lengthOf 3",
                },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have length 3",
                },
                {
                  status: "pass",
                  message: "Expected [] to have lengthOf 0",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert length for strings using `.lengthOf()`", () => {
      return expect(
        runTest(`
          hopp.test("string length assertions work", () => {
            hopp.expect('foo').to.have.lengthOf(3)
            hopp.expect('hello world').to.have.lengthOf(11)
            hopp.expect('').to.have.lengthOf(0)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "string length assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 'foo' to have lengthOf 3",
                },
                {
                  status: "pass",
                  message: "Expected 'hello world' to have lengthOf 11",
                },
                {
                  status: "pass",
                  message: "Expected '' to have lengthOf 0",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert length for Set using `.lengthOf()`", () => {
      return expect(
        runTest(`
          hopp.test("Set length assertions work", () => {
            hopp.expect(new Set([1, 2, 3])).to.have.lengthOf(3)
            hopp.expect(new Set()).to.have.lengthOf(0)
            hopp.expect(new Set([1, 2, 3])).to.be.an.instanceof(Set)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Set length assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected new Set([1, 2, 3]) to have lengthOf 3",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have lengthOf 0/
                  ),
                },
                {
                  status: "pass",
                  message:
                    "Expected new Set([1, 2, 3]) to be an instanceof Set",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert length for Map using `.lengthOf()`", () => {
      return expect(
        runTest(`
          hopp.test("Map length assertions work", () => {
            hopp.expect(new Map([['a', 1], ['b', 2], ['c', 3]])).to.have.lengthOf(3)
            hopp.expect(new Map()).to.have.lengthOf(0)
            hopp.expect(new Map([['a', 1]])).to.be.an.instanceof(Map)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "Map length assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have lengthOf 3/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to have lengthOf 0/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /Expected .* to be an instanceof Map/
                  ),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should work with length in language chains", () => {
      return expect(
        runTest(`
          hopp.test("language chains with length work", () => {
            hopp.expect([1,2,3]).to.be.an('array').that.has.lengthOf(3)
            hopp.expect([1,2,3]).to.be.an('array').and.have.lengthOf(3).and.include(2)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "language chains with length work",
              expectResults: expect.arrayContaining([
                { status: "pass", message: expect.stringMatching(/array/) },
                {
                  status: "pass",
                  message: expect.stringMatching(/lengthOf 3/),
                },
                { status: "pass", message: expect.stringMatching(/include 2/) },
              ]),
            }),
          ],
        }),
      ])
    })
  })

  describe("Include/Contain Assertions", () => {
    test("should assert inclusion in strings using `.include()`", () => {
      return expect(
        runTest(`
          hopp.test("string inclusion assertions work", () => {
            hopp.expect('foobar').to.include('foo')
            hopp.expect('foobar').to.contain('bar')
            hopp.expect('hello world').to.include('world')
            hopp.expect('test123').to.contain('123')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "string inclusion assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 'foobar' to include 'foo'",
                },
                {
                  status: "pass",
                  message: "Expected 'foobar' to include 'bar'",
                },
                {
                  status: "pass",
                  message: "Expected 'hello world' to include 'world'",
                },
                {
                  status: "pass",
                  message: "Expected 'test123' to include '123'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert inclusion in arrays using `.include()`", () => {
      return expect(
        runTest(`
          hopp.test("array inclusion assertions work", () => {
            hopp.expect([1, 2, 3]).to.include(2)
            hopp.expect([1, 2, 3]).to.contain(3)
            hopp.expect([1, 2, 3]).to.not.include(4)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "array inclusion assertions work",
              expectResults: [
                { status: "pass", message: "Expected [1, 2, 3] to include 2" },
                { status: "pass", message: "Expected [1, 2, 3] to include 3" },
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to not include 4",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert inclusion in objects using `.include()`", () => {
      return expect(
        runTest(`
          hopp.test("object inclusion assertions work", () => {
            hopp.expect({a: 1, b: 2, c: 3}).to.include({a: 1, b: 2})
            hopp.expect({a: 1, b: 2}).to.not.have.property('c')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "object inclusion assertions work",
              expectResults: [
                {
                  status: "pass",
                  message:
                    "Expected {a: 1, b: 2, c: 3} to include {a: 1, b: 2}",
                },
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to not have property 'c'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert deep inclusion using `.deep.include()`", () => {
      return expect(
        runTest(`
          hopp.test("deep include assertions work", () => {
            hopp.expect([{a: 1}]).to.deep.include({a: 1})
            hopp.expect({x: {a: 1}}).to.deep.include({x: {a: 1}})
            hopp.expect({a: {b: 2}, c: 3}).to.deep.include({a: {b: 2}})
            hopp.expect([{name: 'Alice'}, {name: 'Bob'}]).to.deep.include({name: 'Alice'})
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "deep include assertions work",
              expectResults: [
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
                  message:
                    "Expected {a: {b: 2}, c: 3} to deep include {a: {b: 2}}",
                },
                {
                  status: "pass",
                  message:
                    "Expected [{name: 'Alice'}, {name: 'Bob'}] to deep include {name: 'Alice'}",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should assert oneOf inclusion using `.contain.oneOf()`", () => {
      return expect(
        runTest(`
          hopp.test("oneOf inclusion assertions work", () => {
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
              descriptor: "oneOf inclusion assertions work",
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

    test("should support `.includes()` and `.contains()` aliases", () => {
      return expect(
        runTest(`
          hopp.test("inclusion aliases work", () => {
            hopp.expect([1, 2, 3]).to.includes(2)
            hopp.expect('hello').to.contains('ell')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "inclusion aliases work",
              expectResults: [
                { status: "pass", message: "Expected [1, 2, 3] to include 2" },
                {
                  status: "pass",
                  message: "Expected 'hello' to include 'ell'",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Combined Modifier Scenarios", () => {
    test("should combine deep and own modifiers with properties", () => {
      return expect(
        runTest(`
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

    test("should use properties in complex language chains", () => {
      return expect(
        runTest(`
          hopp.test("complex chains with properties work", () => {
            hopp.expect([1,2,3]).to.be.an('array').and.have.lengthOf(3).and.include(2)
            hopp.expect({a: 1, b: 2}).to.be.an('object').that.has.property('a').which.equals(1)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "complex chains with properties work",
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
})
