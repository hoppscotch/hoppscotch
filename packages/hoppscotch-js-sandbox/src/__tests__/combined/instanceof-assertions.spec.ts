import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)(
  "%s.expect() - instanceof assertions - Built-in types",
  (namespace) => {
    test("should support instanceof Object for plain objects", async () => {
      const testScript = `
      ${namespace}.test("instanceof Object", () => {
        const obj = { key: "value" };
        ${namespace}.expect(obj).to.be.an.instanceof(Object);
        ${namespace}.expect(obj).to.be.instanceOf(Object);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "instanceof Object",
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

    test("should support instanceof Array", async () => {
      const testScript = `
      ${namespace}.test("instanceof Array", () => {
        const arr = [1, 2, 3];
        ${namespace}.expect(arr).to.be.an.instanceof(Array);
        ${namespace}.expect(arr).to.be.instanceOf(Array);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "instanceof Array",
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

    test("should support instanceof Date", async () => {
      const testScript = `
      ${namespace}.test("instanceof Date", () => {
        const date = new Date();
        ${namespace}.expect(date).to.be.an.instanceof(Date);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "instanceof Date",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support instanceof RegExp", async () => {
      const testScript = `
      ${namespace}.test("instanceof RegExp", () => {
        const regex = /test/;
        ${namespace}.expect(regex).to.be.an.instanceof(RegExp);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "instanceof RegExp",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support instanceof Error", async () => {
      const testScript = `
      ${namespace}.test("instanceof Error", () => {
        const err = new Error("test error");
        ${namespace}.expect(err).to.be.an.instanceof(Error);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "instanceof Error",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support arrays as instanceof Object", async () => {
      const testScript = `
      ${namespace}.test("array instanceof Object", () => {
        const arr = [1, 2, 3];
        ${namespace}.expect(arr).to.be.an.instanceof(Object);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array instanceof Object",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - instanceof assertions - Custom classes",
  (namespace) => {
    test("should support instanceof with custom class definitions", async () => {
      const testScript = `
      ${namespace}.test("custom class instanceof", () => {
        class Person {
          constructor(name) {
            this.name = name;
          }
        }

        const john = new Person("John");
        ${namespace}.expect(john).to.be.an.instanceof(Person);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "custom class instanceof",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ]),
          }),
        ])
      )
    })

    test("should support instanceof with ES6 class syntax", async () => {
      const testScript = `
      ${namespace}.test("ES6 class instanceof", () => {
        class Animal {
          constructor(type) {
            this.type = type;
          }
        }

        class Dog extends Animal {
          constructor(name) {
            super("dog");
            this.name = name;
          }
        }

        const rover = new Dog("Rover");
        ${namespace}.expect(rover).to.be.an.instanceof(Dog);
        ${namespace}.expect(rover).to.be.an.instanceof(Animal);
        ${namespace}.expect(rover).to.be.an.instanceof(Object);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "ES6 class instanceof",
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

    test("should support instanceof with constructor functions", async () => {
      const testScript = `
      ${namespace}.test("constructor function instanceof", () => {
        function Car(make, model) {
          this.make = make;
          this.model = model;
        }

        const tesla = new Car("Tesla", "Model 3");
        ${namespace}.expect(tesla).to.be.an.instanceof(Car);
        ${namespace}.expect(tesla).to.be.an.instanceof(Object);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "constructor function instanceof",
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

    test("should work with custom classes in response data context", async () => {
      const testScript = `
      ${namespace}.test("custom class with response data", () => {
        class ResponseData {
          constructor(data) {
            this.data = data;
          }
        }

        const responseData = pm.response.json();
        const wrapped = new ResponseData(responseData);

        ${namespace}.expect(wrapped).to.be.an.instanceof(ResponseData);
        ${namespace}.expect(wrapped).to.be.an.instanceof(Object);
      });
    `

      const mockResponse = {
        status: 200,
        statusText: "OK",
        responseTime: 100,
        headers: [],
        body: { test: "data" },
      }

      const result = await runTest(
        testScript,
        { global: [], selected: [] },
        mockResponse
      )()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "custom class with response data",
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
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - instanceof assertions - Custom classes with other assertions",
  (namespace) => {
    test("should work with custom classes in property assertions", async () => {
      const testScript = `
      ${namespace}.test("custom class with properties", () => {
        class User {
          constructor(name, age) {
            this.name = name;
            this.age = age;
          }
        }

        const user = new User("Alice", 30);

        ${namespace}.expect(user).to.be.an.instanceof(User);
        ${namespace}.expect(user).to.have.property("name", "Alice");
        ${namespace}.expect(user).to.have.property("age", 30);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "custom class with properties",
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

    test("should work with custom classes in array assertions", async () => {
      const testScript = `
      ${namespace}.test("array of custom class instances", () => {
        class Item {
          constructor(id) {
            this.id = id;
          }
        }

        const items = [new Item(1), new Item(2), new Item(3)];

        ${namespace}.expect(items).to.be.an.instanceof(Array);
        ${namespace}.expect(items).to.have.lengthOf(3);
        ${namespace}.expect(items[0]).to.be.an.instanceof(Item);
        ${namespace}.expect(items[1]).to.be.an.instanceof(Item);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "array of custom class instances",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
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

    test("should work with custom classes and deep equality", async () => {
      const testScript = `
      ${namespace}.test("custom class deep equality", () => {
        class Point {
          constructor(x, y) {
            this.x = x;
            this.y = y;
          }
        }

        const p1 = new Point(10, 20);
        const p2 = new Point(10, 20);

        ${namespace}.expect(p1).to.be.an.instanceof(Point);
        ${namespace}.expect(p2).to.be.an.instanceof(Point);
        ${namespace}.expect(p1).to.deep.equal(p2);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "custom class deep equality",
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
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - instanceof assertions - Negation and failure cases",
  (namespace) => {
    test("should support negation with .not.instanceof", async () => {
      const testScript = `
      ${namespace}.test("negated instanceof", () => {
        const str = "hello";
        const num = 42;
        const arr = [1, 2, 3];

        ${namespace}.expect(str).to.not.be.an.instanceof(Number);
        ${namespace}.expect(num).to.not.be.an.instanceof(String);
        ${namespace}.expect(arr).to.not.be.an.instanceof(String);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "negated instanceof",
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

    test("should fail when instanceof check fails", async () => {
      const testScript = `
      ${namespace}.test("instanceof failure", () => {
        const str = "hello";
        ${namespace}.expect(str).to.be.an.instanceof(Array);
      });
    `

      const result = await runTest(testScript, { global: [], selected: [] })()
      expect(result).toEqualRight(
        expect.arrayContaining([
          expect.objectContaining({
            descriptor: "root",
            children: expect.arrayContaining([
              expect.objectContaining({
                descriptor: "instanceof failure",
                expectResults: [expect.objectContaining({ status: "fail" })],
              }),
            ]),
          }),
        ])
      )
    })
  }
)
