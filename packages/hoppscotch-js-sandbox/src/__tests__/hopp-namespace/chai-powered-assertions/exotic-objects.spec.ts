import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

// Behavior validation for exotic objects (Proxy, etc.) within sandbox serialization constraints
describe("hopp.expect - Exotic Objects & Error Edge Cases", () => {
  describe("Proxy Objects", () => {
    test("should handle basic Proxy objects", () => {
      return expect(
        runTest(`
          hopp.test("proxy object assertions work", () => {
            const target = { value: 42 }
            const proxy = new Proxy(target, {})

            hopp.expect(proxy).to.be.an("object")
            hopp.expect(proxy).to.have.property("value", 42)
            hopp.expect(proxy.value).to.equal(42)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "proxy object assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an object/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to have property 'value'/),
                },
                {
                  status: "pass",
                  message: "Expected 42 to equal 42",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle Proxy with custom traps", () => {
      return expect(
        runTest(`
          hopp.test("proxy with custom traps work", () => {
            const target = { value: 10 }
            const proxy = new Proxy(target, {
              get(target, prop) {
                if (prop === 'value') return target[prop] * 2
                return target[prop]
              }
            })

            hopp.expect(proxy.value).to.equal(20)
            hopp.expect(target.value).to.equal(10)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "proxy with custom traps work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 20 to equal 20",
                },
                {
                  status: "pass",
                  message: "Expected 10 to equal 10",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle revocable Proxy", () => {
      return expect(
        runTest(`
          hopp.test("revocable proxy assertions work", () => {
            const target = { value: 42 }
            const { proxy, revoke } = Proxy.revocable(target, {})

            hopp.expect(proxy.value).to.equal(42)

            revoke()

            hopp.expect(() => proxy.value).to.throw(TypeError)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "revocable proxy assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 42 to equal 42",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to throw TypeError/),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("WeakMap & WeakSet", () => {
    test("should handle WeakMap behavior", () => {
      return expect(
        runTest(`
          hopp.test("weakmap behavior tests work", () => {
            const wm = new WeakMap()
            const key1 = {}
            const key2 = { id: 1 }

            wm.set(key1, 'value1')
            wm.set(key2, 42)

            hopp.expect(wm.has(key1)).to.be.true
            hopp.expect(wm.get(key1)).to.equal('value1')
            hopp.expect(wm.get(key2)).to.equal(42)
            hopp.expect(wm.has({})).to.be.false
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "weakmap behavior tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected true to be true",
                },
                {
                  status: "pass",
                  message: "Expected 'value1' to equal 'value1'",
                },
                {
                  status: "pass",
                  message: "Expected 42 to equal 42",
                },
                {
                  status: "pass",
                  message: "Expected false to be false",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle WeakSet behavior", () => {
      return expect(
        runTest(`
          hopp.test("weakset behavior tests work", () => {
            const ws = new WeakSet()
            const obj1 = { id: 1 }
            const obj2 = { id: 2 }

            ws.add(obj1)
            ws.add(obj2)

            hopp.expect(ws.has(obj1)).to.be.true
            hopp.expect(ws.has(obj2)).to.be.true
            hopp.expect(ws.has({})).to.be.false

            // WeakSet doesn't have reference equality for new objects
            const newObj = { id: 1 }
            hopp.expect(ws.has(newObj)).to.be.false
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "weakset behavior tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected true to be true",
                },
                {
                  status: "pass",
                  message: "Expected true to be true",
                },
                {
                  status: "pass",
                  message: "Expected false to be false",
                },
                {
                  status: "pass",
                  message: "Expected false to be false",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("TypedArrays", () => {
    test("should handle Uint8Array", () => {
      return expect(
        runTest(`
          hopp.test("uint8array tests work", () => {
            const arr = new Uint8Array([1, 2, 3, 4, 5])

            hopp.expect(arr).to.be.an('object')
            hopp.expect(arr.length).to.equal(5)
            hopp.expect(arr[0]).to.equal(1)
            hopp.expect(arr[4]).to.equal(5)
            hopp.expect(arr[10]).to.equal(undefined)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "uint8array tests work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an object/),
                },
                {
                  status: "pass",
                  message: "Expected 5 to equal 5",
                },
                {
                  status: "pass",
                  message: "Expected 1 to equal 1",
                },
                {
                  status: "pass",
                  message: "Expected 5 to equal 5",
                },
                {
                  status: "pass",
                  message: "Expected undefined to equal undefined",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle Int16Array", () => {
      return expect(
        runTest(`
          hopp.test("int16array tests work", () => {
            const arr = new Int16Array([-1000, 0, 1000])

            hopp.expect(arr[0]).to.equal(-1000)
            hopp.expect(arr[2]).to.equal(1000)
            hopp.expect(arr.byteLength).to.equal(6)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "int16array tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected -1000 to equal -1000",
                },
                {
                  status: "pass",
                  message: "Expected 1000 to equal 1000",
                },
                {
                  status: "pass",
                  message: "Expected 6 to equal 6",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle Float32Array", () => {
      return expect(
        runTest(`
          hopp.test("float32array tests work", () => {
            const arr = new Float32Array([3.14, 2.718, 1.414])

            hopp.expect(arr[0]).to.be.closeTo(3.14, 0.01)
            hopp.expect(arr[1]).to.be.closeTo(2.718, 0.001)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "float32array tests work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be closeTo 3\.14/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be closeTo 2\.718/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle multiple TypedArray types", () => {
      return expect(
        runTest(`
          hopp.test("various typedarray types work", () => {
            const u32 = new Uint32Array([1, 2, 3])
            const i8 = new Int8Array([-1, 0, 1])
            const f64 = new Float64Array([1.1, 2.2])

            hopp.expect(u32.byteLength).to.equal(12)
            hopp.expect(i8.length).to.equal(3)
            hopp.expect(f64.byteLength).to.equal(16)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "various typedarray types work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 12 to equal 12",
                },
                {
                  status: "pass",
                  message: "Expected 3 to equal 3",
                },
                {
                  status: "pass",
                  message: "Expected 16 to equal 16",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("ArrayBuffer & DataView", () => {
    test("should handle ArrayBuffer", () => {
      return expect(
        runTest(`
          hopp.test("arraybuffer tests work", () => {
            const buffer = new ArrayBuffer(16)
            const view = new Uint8Array(buffer)

            hopp.expect(buffer.byteLength).to.equal(16)
            hopp.expect(view.length).to.equal(16)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "arraybuffer tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 16 to equal 16",
                },
                {
                  status: "pass",
                  message: "Expected 16 to equal 16",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle DataView", () => {
      return expect(
        runTest(`
          hopp.test("dataview tests work", () => {
            const buffer = new ArrayBuffer(8)
            const view = new DataView(buffer)

            view.setInt32(0, 42)
            view.setFloat32(4, 3.14)

            hopp.expect(view.byteLength).to.equal(8)
            hopp.expect(view.getInt32(0)).to.equal(42)
            hopp.expect(view.getFloat32(4)).to.be.closeTo(3.14, 0.01)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "dataview tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 8 to equal 8",
                },
                {
                  status: "pass",
                  message: "Expected 42 to equal 42",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be closeTo 3\.14/),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Error Objects & Custom Errors", () => {
    test("should handle standard Error types", () => {
      return expect(
        runTest(`
          hopp.test("standard error types work", () => {
            const err = new Error('Test error')
            const typeErr = new TypeError('Type error')
            const rangeErr = new RangeError('Range error')
            const refErr = new ReferenceError('Reference error')

            hopp.expect(err).to.be.an.instanceof(Error)
            hopp.expect(typeErr).to.be.an.instanceof(TypeError)
            hopp.expect(rangeErr).to.be.an.instanceof(RangeError)
            hopp.expect(refErr).to.be.an.instanceof(ReferenceError)
            hopp.expect(err.message).to.equal('Test error')
            hopp.expect(typeErr.message).to.equal('Type error')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "standard error types work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Error/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /to be an instanceof TypeError/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /to be an instanceof RangeError/
                  ),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /to be an instanceof ReferenceError/
                  ),
                },
                {
                  status: "pass",
                  message: "Expected 'Test error' to equal 'Test error'",
                },
                {
                  status: "pass",
                  message: "Expected 'Type error' to equal 'Type error'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle custom Error classes", () => {
      return expect(
        runTest(`
          hopp.test("custom error classes work", () => {
            class CustomError extends Error {
              constructor(message, code) {
                super(message)
                this.name = 'CustomError'
                this.code = code
              }
            }

            const err = new CustomError('Custom error', 500)

            hopp.expect(err).to.be.an.instanceof(Error)
            hopp.expect(err.name).to.equal('CustomError')
            hopp.expect(err.code).to.equal(500)
            hopp.expect(err.message).to.equal('Custom error')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "custom error classes work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Error/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(
                    /to equal 'CustomError'|to equal CustomError/
                  ),
                },
                {
                  status: "pass",
                  message: "Expected 500 to equal 500",
                },
                {
                  status: "pass",
                  message: "Expected 'Custom error' to equal 'Custom error'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle Error with cause (ES2022)", () => {
      return expect(
        runTest(`
          hopp.test("error with cause work", () => {
            const original = new Error('Original error')
            const wrapped = new Error('Wrapped error', { cause: original })

            hopp.expect(wrapped).to.be.an.instanceof(Error)
            hopp.expect(wrapped.message).to.equal('Wrapped error')
            hopp.expect(wrapped.cause).to.exist
            hopp.expect(wrapped.cause.message).to.equal('Original error')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "error with cause work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Error/),
                },
                {
                  status: "pass",
                  message: "Expected 'Wrapped error' to equal 'Wrapped error'",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to exist/),
                },
                {
                  status: "pass",
                  message:
                    "Expected 'Original error' to equal 'Original error'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle throw with Error objects", () => {
      return expect(
        runTest(`
          hopp.test("throwing error objects work", () => {
            const thrower = () => { throw new TypeError('Invalid type') }

            hopp.expect(thrower).to.throw(TypeError)
            hopp.expect(thrower).to.throw(TypeError, 'Invalid type')
            hopp.expect(thrower).to.throw('Invalid type')
            hopp.expect(thrower).to.throw(/Invalid/)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "throwing error objects work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to throw TypeError/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to throw TypeError/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to throw 'Invalid type'/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to throw \/Invalid\//),
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Promise Objects", () => {
    test("should handle Promise state checking", () => {
      return expect(
        runTest(`
          hopp.test("promise tests work", async () => {
            const resolved = Promise.resolve(42)
            const rejected = Promise.reject(new Error('Failed'))

            hopp.expect(await resolved).to.equal(42)

            try {
              await rejected
            } catch (e) {
              hopp.expect(e).to.be.an.instanceof(Error)
              hopp.expect(e.message).to.equal('Failed')
            }
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          expectResults: [
            {
              status: "pass",
              message: "Expected 42 to equal 42",
            },
            {
              status: "pass",
              message: expect.stringMatching(/to be an instanceof Error/),
            },
            {
              status: "pass",
              message: "Expected 'Failed' to equal 'Failed'",
            },
          ],
          children: [
            expect.objectContaining({
              descriptor: "promise tests work",
              expectResults: [],
            }),
          ],
        }),
      ])
    })

    test("should handle Promise.all", () => {
      return expect(
        runTest(`
          hopp.test("promise.all tests work", async () => {
            const p1 = Promise.resolve(1)
            const p2 = Promise.resolve(2)
            const p3 = Promise.resolve(3)

            const results = await Promise.all([p1, p2, p3])

            hopp.expect(results).to.have.lengthOf(3)
            hopp.expect(results[0]).to.equal(1)
            hopp.expect(results[2]).to.equal(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          expectResults: [
            {
              status: "pass",
              message: expect.stringMatching(/to have lengthOf 3/),
            },
            {
              status: "pass",
              message: "Expected 1 to equal 1",
            },
            {
              status: "pass",
              message: "Expected 3 to equal 3",
            },
          ],
          children: [
            expect.objectContaining({
              descriptor: "promise.all tests work",
              expectResults: [],
            }),
          ],
        }),
      ])
    })
  })

  describe("Symbol.iterator & Iterables", () => {
    test("should handle custom iterables", () => {
      return expect(
        runTest(`
          hopp.test("custom iterable tests work", () => {
            const iterable = {
              *[Symbol.iterator]() {
                yield 1
                yield 2
                yield 3
              }
            }

            hopp.expect(iterable).to.be.an('object')
            hopp.expect(typeof iterable[Symbol.iterator]).to.equal('function')

            const values = [...iterable]
            hopp.expect(values[0]).to.equal(1)
            hopp.expect(values[1]).to.equal(2)
            hopp.expect(values[2]).to.equal(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          expectResults: [],
          children: [
            expect.objectContaining({
              descriptor: "custom iterable tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {} to be an object",
                },
                {
                  status: "pass",
                  message: "Expected function to equal function",
                },
                {
                  status: "pass",
                  message: "Expected 1 to equal 1",
                },
                {
                  status: "pass",
                  message: "Expected 2 to equal 2",
                },
                {
                  status: "pass",
                  message: "Expected 3 to equal 3",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle generator functions", () => {
      return expect(
        runTest(`
          hopp.test("generator function tests work", () => {
            function* gen() {
              yield 'a'
              yield 'b'
              yield 'c'
            }

            hopp.expect(typeof gen).to.equal('function')

            const iterator = gen()
            hopp.expect(iterator).to.be.an('object')
            hopp.expect(typeof iterator.next).to.equal('function')

            const first = iterator.next()
            hopp.expect(first.value).to.equal('a')
            hopp.expect(first.done).to.be.false

            iterator.next()
            iterator.next()
            const last = iterator.next()
            hopp.expect(last.done).to.be.true
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          expectResults: [],
          children: [
            expect.objectContaining({
              descriptor: "generator function tests work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected function to equal function",
                },
                {
                  status: "pass",
                  message: "Expected {} to be an object",
                },
                {
                  status: "pass",
                  message: "Expected function to equal function",
                },
                {
                  status: "pass",
                  message: "Expected 'a' to equal 'a'",
                },
                {
                  status: "pass",
                  message: "Expected false to be false",
                },
                {
                  status: "pass",
                  message: "Expected true to be true",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Complex Compositions", () => {
    test("should handle nested exotic objects", () => {
      return expect(
        runTest(`
          hopp.test("nested exotic objects work", () => {
            const buffer = new ArrayBuffer(3)
            const view = new Uint8Array(buffer)
            view[0] = 1
            view[1] = 2
            view[2] = 3

            const mySet = new Set([1, 2, 3])
            const myMap = new Map([['key', 'value']])

            const composed = {
              buffer,
              view,
              set: mySet,
              map: myMap
            }

            hopp.expect(composed.buffer.byteLength).to.equal(3)
            hopp.expect(composed.view[1]).to.equal(2)
            hopp.expect(composed.set).to.be.an.instanceof(Set)
            hopp.expect(composed.map).to.be.an.instanceof(Map)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "nested exotic objects work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 3 to equal 3",
                },
                {
                  status: "pass",
                  message: "Expected 2 to equal 2",
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Set/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be an instanceof Map/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle Proxy wrapping exotic objects", () => {
      return expect(
        runTest(`
          hopp.test("proxy wrapping exotic objects work", () => {
            const arr = new Uint8Array([10, 20, 30])
            const proxy = new Proxy(arr, {
              get(target, prop) {
                if (typeof prop === 'string' && !isNaN(prop)) {
                  return target[prop] * 2
                }
                return target[prop]
              }
            })

            hopp.expect(proxy[0]).to.equal(20)
            hopp.expect(proxy[1]).to.equal(40)
            hopp.expect(arr[0]).to.equal(10)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "proxy wrapping exotic objects work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 20 to equal 20",
                },
                {
                  status: "pass",
                  message: "Expected 40 to equal 40",
                },
                {
                  status: "pass",
                  message: "Expected 10 to equal 10",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("Edge Cases", () => {
    test("should handle Error stack traces", () => {
      return expect(
        runTest(`
          hopp.test("error stack traces work", () => {
            const err = new Error('Test error')

            hopp.expect(err).to.have.property('stack')
            hopp.expect(err.stack).to.be.a('string')
            hopp.expect(err.stack.length).to.be.above(0)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "error stack traces work",
              expectResults: [
                {
                  status: "pass",
                  message: expect.stringMatching(/to have property 'stack'/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be a string/),
                },
                {
                  status: "pass",
                  message: expect.stringMatching(/to be above 0/),
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should handle TypedArray negative indexing patterns", () => {
      return expect(
        runTest(`
          hopp.test("typedarray negative patterns work", () => {
            const arr = new Int8Array([-128, -1, 0, 1, 127])

            hopp.expect(arr[0]).to.equal(-128)
            hopp.expect(arr[arr.length - 1]).to.equal(127)
            hopp.expect(arr.slice(-2)[0]).to.equal(1)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "typedarray negative patterns work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected -128 to equal -128",
                },
                {
                  status: "pass",
                  message: "Expected 127 to equal 127",
                },
                {
                  status: "pass",
                  message: "Expected 1 to equal 1",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
