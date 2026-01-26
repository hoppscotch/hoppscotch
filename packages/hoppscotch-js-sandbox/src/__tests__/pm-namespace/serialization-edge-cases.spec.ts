// QuickJS sandbox boundary serialization: compute values BEFORE crossing to preserve type info

import { describe, expect, test } from "vitest"
import {
  runTestWithResponse,
  fakeResponse,
  runTest,
} from "~/utils/test-helpers"

describe("Serialization Edge Cases - Object Reference Equality", () => {
  describe("`pm.expect.equal()` - Reference Equality", () => {
    test("should pass for same object reference", async () => {
      const testScript = `
        pm.test("same reference equality", () => {
          const obj = { a: 1 };
          pm.expect(obj).to.equal(obj);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "same reference equality",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail for different object references with same content", async () => {
      const testScript = `
        pm.test("different references", () => {
          pm.expect({ a: 1 }).to.not.equal({ a: 1 });
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "different references",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with arrays", async () => {
      const testScript = `
        pm.test("array reference equality", () => {
          const arr = [1, 2, 3];
          pm.expect(arr).to.equal(arr);
          pm.expect([1, 2, 3]).to.not.equal([1, 2, 3]);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array reference equality",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with primitives (always equal by value)", async () => {
      const testScript = `
        pm.test("primitive equality", () => {
          pm.expect(5).to.equal(5);
          pm.expect('hello').to.equal('hello');
          pm.expect(true).to.equal(true);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "primitive equality",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })
})

describe("Serialization Edge Cases - Prototype Chain Preservation", () => {
  describe("`pm.expect.own.property()` - Own vs Inherited Properties", () => {
    test("should pass when object HAS own property", async () => {
      const testScript = `
        pm.test("own property - positive case", () => {
          const obj = Object.create({ inherited: true });
          obj.own = true;
          pm.expect(obj).to.have.own.property('own');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "own property - positive case",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should distinguish own properties from inherited (negation)", async () => {
      const testScript = `
        pm.test("own property vs inherited", () => {
          const obj = Object.create({ inherited: true });
          obj.own = true;
          pm.expect(obj).to.have.own.property('own');
          pm.expect(obj).to.not.have.own.property('inherited');
          pm.expect(obj).to.have.property('inherited');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "own property vs inherited",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with plain objects", async () => {
      const testScript = `
        pm.test("plain object own properties", () => {
          const obj = { a: 1, b: 2 };
          pm.expect(obj).to.have.own.property('a');
          pm.expect(obj).to.have.own.property('b');
          pm.expect(obj).to.not.have.own.property('toString');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "plain object own properties",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail when assertion is incorrect", async () => {
      const testScript = `
        pm.test("incorrect assertion", () => {
          const obj = { a: 1 };
          pm.expect(obj).to.not.have.own.property('a');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "incorrect assertion",
                expectResults: [expect.objectContaining({ status: "fail" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with arrays (inherited from Array.prototype)", async () => {
      const testScript = `
        pm.test("array own vs inherited", () => {
          const arr = [1, 2, 3];
          pm.expect(arr).to.have.own.property('0');
          pm.expect(arr).to.have.own.property('length');
          pm.expect(arr).to.not.have.own.property('push');
          pm.expect(arr).to.have.property('push');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array own vs inherited",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("`pm.expect.itself.respondTo()` - Static vs Instance Methods", () => {
    test("should pass when class HAS static method", async () => {
      const testScript = `
        pm.test("static method - positive case", () => {
          class MyClass {
            static staticMethod() {}
            instanceMethod() {}
          }
          pm.expect(MyClass).itself.to.respondTo('staticMethod');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "static method - positive case",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should distinguish static methods from instance methods", async () => {
      const testScript = `
        pm.test("static vs instance methods", () => {
          class MyClass {
            static staticMethod() {}
            instanceMethod() {}
          }
          pm.expect(MyClass).itself.to.respondTo('staticMethod');
          pm.expect(MyClass).to.not.itself.respondTo('instanceMethod');
          pm.expect(MyClass).to.respondTo('instanceMethod');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "static vs instance methods",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with built-in constructors", async () => {
      const testScript = `
        pm.test("built-in static methods", () => {
          pm.expect(Array).itself.to.respondTo('isArray');
          pm.expect(Array).itself.to.respondTo('from');
          pm.expect(Object).itself.to.respondTo('keys');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "built-in static methods",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail when static method doesn't exist", async () => {
      const testScript = `
        pm.test("non-existent static method", () => {
          class MyClass {
            instanceMethod() {}
          }
          pm.expect(MyClass).itself.to.respondTo('nonExistent');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "non-existent static method",
                expectResults: [expect.objectContaining({ status: "fail" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with negation", async () => {
      const testScript = `
        pm.test("static method negation", () => {
          class MyClass {
            static staticMethod() {}
          }
          pm.expect(MyClass).itself.to.respondTo('staticMethod');
          pm.expect(MyClass).itself.to.not.respondTo('nonExistent');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "static method negation",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should work with multiple static methods", async () => {
      const testScript = `
        pm.test("multiple static methods", () => {
          class MyClass {
            static method1() {}
            static method2() {}
            static method3() {}
          }
          pm.expect(MyClass).itself.to.respondTo('method1');
          pm.expect(MyClass).itself.to.respondTo('method2');
          pm.expect(MyClass).itself.to.respondTo('method3');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "multiple static methods",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })
})

describe("Serialization Edge Cases - Special Object Types", () => {
  describe("`pm.expect.eql()` - RegExp Comparison", () => {
    test("should pass for identical RegExp patterns", async () => {
      const testScript = `
        pm.test("identical regex", () => {
          pm.expect(/test/i).to.eql(/test/i);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "identical regex",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail for different RegExp flags", async () => {
      const testScript = `
        pm.test("different flags", () => {
          pm.expect(/test/i).to.not.eql(/test/g);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "different flags",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail for different RegExp patterns", async () => {
      const testScript = `
        pm.test("different patterns", () => {
          pm.expect(/test/).to.not.eql(/demo/);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "different patterns",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("`pm.expect.equal()` - Date Comparison", () => {
    test("should pass for same Date reference", async () => {
      const testScript = `
        pm.test("same date reference", () => {
          const date = new Date('2024-01-01');
          pm.expect(date).to.equal(date);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "same date reference",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should pass when different Date references are not equal (reference inequality)", async () => {
      const testScript = `
        pm.test("different date references", () => {
          pm.expect(new Date('2024-01-01')).to.not.equal(new Date('2024-01-01'));
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "different date references",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should use eql() for value equality on dates", async () => {
      const testScript = `
        pm.test("date value equality", () => {
          pm.expect(new Date('2024-01-01')).to.eql(new Date('2024-01-01'));
          pm.expect(new Date('2024-01-01')).to.not.eql(new Date('2024-01-02'));
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "date value equality",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("`pm.expect.a()` - Array Type Checking", () => {
    test("should pass for 'object' type check", async () => {
      const testScript = `
        pm.test("array is object", () => {
          pm.expect([]).to.be.a('object');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array is object",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should pass for 'array' type check", async () => {
      const testScript = `
        pm.test("array is array", () => {
          pm.expect([]).to.be.an('array');
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array is array",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should pass all typeof vs instanceof tests", async () => {
      const testScript = `
        pm.test("typeof vs instanceof", () => {
          pm.expect([]).to.be.a('object');
          pm.expect([]).to.be.an('array');
          pm.expect([]).to.be.instanceOf(Array);
          pm.expect([]).to.be.instanceOf(Object);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "typeof vs instanceof",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })
})

describe("Serialization Edge Cases - Assertion Chaining", () => {
  describe("`.length().which` - Value Proxy Chaining", () => {
    test("should allow chaining after length check", async () => {
      const testScript = `
        pm.test("length chaining", () => {
          pm.expect([1, 2, 3]).to.have.length(3).which.is.above(2);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "length chaining",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should chain with .that instead of .which", async () => {
      const testScript = `
        pm.test("length with that", () => {
          pm.expect('test').to.have.length(4).that.is.above(3);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "length with that",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support complex chaining", async () => {
      const testScript = `
        pm.test("complex chaining", () => {
          pm.expect([1, 2, 3, 4, 5]).to.have.length(5).which.is.above(4).and.below(6);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "complex chaining",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("`.not.have.lengthOf()` - Negation Support", () => {
    test("should pass when string does NOT have specified length", async () => {
      const testScript = `
        pm.test("string lengthOf negation", () => {
          pm.expect('test').to.have.lengthOf(4);
          pm.expect('test').to.not.have.lengthOf(10);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "string lengthOf negation",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should pass when array does NOT have specified length", async () => {
      const testScript = `
        pm.test("array lengthOf negation", () => {
          pm.expect([1, 2]).to.have.lengthOf(2);
          pm.expect([1, 2]).to.not.have.lengthOf(3);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array lengthOf negation",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail when negation is incorrect", async () => {
      const testScript = `
        pm.test("incorrect negation", () => {
          pm.expect('test').to.not.have.lengthOf(4);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "incorrect negation",
                expectResults: [expect.objectContaining({ status: "fail" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support empty string/array", async () => {
      const testScript = `
        pm.test("empty values", () => {
          pm.expect('').to.have.lengthOf(0);
          pm.expect('').to.not.have.lengthOf(1);
          pm.expect([]).to.have.lengthOf(0);
          pm.expect([]).to.not.have.lengthOf(5);
        });
      `

      const result = await runTestWithResponse(testScript, fakeResponse)()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "empty values",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })
  })

  describe("Circular Reference Handling", () => {
    test("should handle circular object references in property assertions", () => {
      return expect(
        runTest(`
          pm.test("Circular reference property", function() {
            const obj = { a: 1, b: 2 }
            obj.self = obj  // Circular reference

            pm.expect(obj).to.have.property('self')
            pm.expect(obj.self).to.equal(obj)
            pm.expect(obj).to.have.property('a', 1)
          })
        `)()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Circular reference property",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("should handle nested circular references", () => {
      return expect(
        runTest(`
          pm.test("Nested circular references", function() {
            const parent = { name: "parent", child: null }
            const child = { name: "child", parent: parent }
            parent.child = child  // Creates circular reference

            pm.expect(parent.child.parent).to.equal(parent)
            pm.expect(parent).to.have.property('name', 'parent')
            pm.expect(child).to.have.property('name', 'child')
          })
        `)()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "Nested circular references",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("should not throw 'Converting circular structure to JSON' error", () => {
      return expect(
        runTest(`
          pm.test("No JSON.stringify error", function() {
            const obj = { data: 'test' }
            obj.circular = obj

            // This should not throw even though obj has circular reference
            pm.expect(obj).to.have.property('data')
            pm.expect(obj.circular).to.equal(obj)
          })
        `)()
      ).resolves.toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "No JSON.stringify error",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ]),
          }),
        ])
      )
    })

    test("should fail with stack overflow for circular array references (known limitation)", () => {
      return expect(
        runTest(`
          pm.test("Circular array limitation", function() {
            const arr = [1, 2, 3]
            arr.push(arr)  // Creates circular reference

            pm.expect(arr).to.have.lengthOf(4)
          })
        `)()
      ).resolves.toEqualLeft(
        // QuickJS returns a GC error instead of "Maximum call stack size exceeded"
        // The exact QuickJS error message may vary between versions and environments
        // (e.g., "internal error: out of memory in GC"), so we only check for the
        // generic prefix to avoid brittle tests
        expect.stringContaining("Script execution failed:")
      )
    })
  })
})

describe("Serialization Edge Cases - Symbol Properties", () => {
  test("should not enumerate Symbol properties in assertions", async () => {
    const testScript = `
      pm.test("Symbol properties are not enumerable", () => {
        const sym = Symbol('test');
        const obj = { regular: 'value' };
        obj[sym] = 'symbol value';

        // Should only see regular properties
        pm.expect(obj).to.have.property('regular');
        pm.expect(Object.keys(obj)).to.have.lengthOf(1);
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Symbol properties are not enumerable",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should handle objects with Symbol.iterator", async () => {
    const testScript = `
      pm.test("Symbol.iterator support", () => {
        const customIterable = {
          data: [1, 2, 3],
          [Symbol.iterator]: function*() {
            yield* this.data;
          }
        };

        // Should be able to assert on regular properties
        pm.expect(customIterable).to.have.property('data');
        pm.expect(customIterable.data).to.have.lengthOf(3);
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Symbol.iterator support",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should serialize objects with Symbol properties correctly", async () => {
    const testScript = `
      pm.test("Symbol property serialization", () => {
        const sym = Symbol('hidden');
        const obj = {
          visible: 'data',
          nested: { value: 42 }
        };
        obj[sym] = 'should not appear in JSON';

        const jsonStr = JSON.stringify(obj);
        const parsed = JSON.parse(jsonStr);

        // After serialization, Symbol properties are lost
        pm.expect(parsed).to.have.property('visible', 'data');
        pm.expect(parsed).to.have.property('nested');
        pm.expect(parsed.nested).to.have.property('value', 42);
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Symbol property serialization",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Serialization Edge Cases - Special Numbers", () => {
  test("should handle NaN assertions correctly", async () => {
    const testScript = `
      pm.test("NaN handling", () => {
        const result = 0 / 0;

        // NaN is not equal to itself
        pm.expect(result).to.be.NaN;
        pm.expect(result).to.not.equal(result);
        pm.expect(Number.isNaN(result)).to.be.true;
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "NaN handling",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should handle Infinity and -Infinity", async () => {
    const testScript = `
      pm.test("Infinity values", () => {
        const posInf = 1 / 0;
        const negInf = -1 / 0;

        pm.expect(posInf).to.equal(Infinity);
        pm.expect(negInf).to.equal(-Infinity);
        pm.expect(posInf).to.not.equal(negInf);
        pm.expect(Number.isFinite(posInf)).to.be.false;
        pm.expect(Number.isFinite(negInf)).to.be.false;
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Infinity values",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should distinguish between +0 and -0", async () => {
    const testScript = `
      pm.test("Negative zero handling", () => {
        const positiveZero = 0;
        const negativeZero = -0;

        // In most contexts, +0 and -0 are equal
        pm.expect(positiveZero).to.equal(negativeZero);
        pm.expect(positiveZero === negativeZero).to.be.true;

        // But they can be distinguished with Object.is or 1/x
        pm.expect(Object.is(positiveZero, negativeZero)).to.be.false;
        pm.expect(1 / positiveZero).to.equal(Infinity);
        pm.expect(1 / negativeZero).to.equal(-Infinity);
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Negative zero handling",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should handle special numbers in JSON serialization", async () => {
    const testScript = `
      pm.test("Special numbers in JSON", () => {
        const obj = {
          nan: NaN,
          inf: Infinity,
          negInf: -Infinity,
          zero: 0,
          negZero: -0
        };

        const jsonStr = JSON.stringify(obj);
        const parsed = JSON.parse(jsonStr);

        // NaN, Infinity, -Infinity become null in JSON
        pm.expect(parsed.nan).to.be.null;
        pm.expect(parsed.inf).to.be.null;
        pm.expect(parsed.negInf).to.be.null;

        // Both zeros become 0
        pm.expect(parsed.zero).to.equal(0);
        pm.expect(parsed.negZero).to.equal(0);
      });
    `

    const result = await runTestWithResponse(testScript, fakeResponse)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Special numbers in JSON",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})
