/**
 * PM Namespace - Serialization Edge Cases
 *
 * Tests for edge cases that arise from QuickJS sandbox boundary serialization.
 * When objects cross the sandbox boundary, they are JSON serialized/deserialized,
 * which loses:
 * - Object reference identity
 * - Prototype chain information
 * - Type metadata (RegExp, Date become plain objects/strings)
 * - Function references
 *
 * Solution: Pre-check pattern - compute values BEFORE crossing boundary,
 * then pass the pre-computed results along with the serialized data.
 */

import { describe, expect, test } from "vitest"
import { runTestWithResponse, fakeResponse } from "~/utils/test-helpers"

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

    test("should fail for different Date references even with same value", async () => {
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
})
