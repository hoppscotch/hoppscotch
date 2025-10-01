/**
 * PM Namespace - Keys and Members Assertions Test Suite
 *
 * This test suite validates Chai.js keys() and members() assertions
 * through the pm.expect() API, ensuring Postman compatibility.
 *
 * Coverage includes:
 * - keys() with array and spread syntax
 * - key() with string and array syntax
 * - members() assertions with and without negation
 * - include.members() with and without negation
 * - Negation handling for all assertion types
 *
 * These tests ensure compatibility with common Postman collection patterns
 * that were previously failing.
 *
 * @see https://github.com/hoppscotch/hoppscotch/issues/5489
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("pm.expect() - Keys Assertions", () => {
  describe("keys() method", () => {
    test("should accept array syntax: keys(['a', 'b'])", () => {
      return expect(
        runTest(`
          pm.test('Keys with array syntax', function () {
            pm.expect({a: 1, b: 2}).to.have.keys(['a','b']);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Keys with array syntax",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have keys 'a', 'b'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should accept spread syntax: keys('a', 'b')", () => {
      return expect(
        runTest(`
          pm.test('Keys with spread syntax', function () {
            pm.expect({a: 1, b: 2}).to.have.keys('a','b');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Keys with spread syntax",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to have keys 'a', 'b'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support negation with array syntax", () => {
      return expect(
        runTest(`
          pm.test('Negated keys assertion', function () {
            pm.expect({a: 1, b: 2}).to.not.have.keys('x', 'y');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated keys assertion",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1, b: 2} to not have keys 'x', 'y'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should fail when keys don't match", () => {
      return expect(
        runTest(`
          pm.test('Keys mismatch fails', function () {
            pm.expect({a: 1, b: 2}).to.have.keys('a', 'c');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Keys mismatch fails",
              expectResults: [
                {
                  status: "fail",
                  message: "Expected {a: 1, b: 2} to have keys 'a', 'c'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("key() method", () => {
    test("should accept single string: key('a')", () => {
      return expect(
        runTest(`
          pm.test('Key with string syntax', function () {
            pm.expect({a: 1}).to.have.key('a');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Key with string syntax",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to have keys 'a'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support negation: not.have.key('z')", () => {
      return expect(
        runTest(`
          pm.test('Negated key assertion', function () {
            pm.expect({x:5}).to.not.have.key('z');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated key assertion",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {x: 5} to not have keys 'z'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should fail when negated key exists", () => {
      return expect(
        runTest(`
          pm.test('Negated key assertion fails', function () {
            pm.expect({x:5}).to.not.have.key('x');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated key assertion fails",
              expectResults: [
                {
                  status: "fail",
                  message: "Expected {x: 5} to not have keys 'x'",
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

describe("pm.expect() - Members Assertions", () => {
  describe("members() method", () => {
    test("should match members in any order", () => {
      return expect(
        runTest(`
          pm.test('Members matching', function () {
            pm.expect([1,2,3]).to.have.members([3,2,1]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Members matching",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to have members [3, 2, 1]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should fail when members don't match", () => {
      return expect(
        runTest(`
          pm.test('Members mismatch', function () {
            pm.expect([1,2,3]).to.have.members([1,2,4]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Members mismatch",
              expectResults: [
                {
                  status: "fail",
                  message: "Expected [1, 2, 3] to have members [1, 2, 4]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support negation", () => {
      return expect(
        runTest(`
          pm.test('Negated members', function () {
            pm.expect([1,2,3]).to.not.have.members([4,5,6]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated members",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to not have members [4, 5, 6]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("include.members() method", () => {
    test("should match subset of members", () => {
      return expect(
        runTest(`
          pm.test('Include members', function () {
            pm.expect([1,2,3]).to.include.members([2]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Include members",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to include members [2]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support negation: not.include.members([5])", () => {
      return expect(
        runTest(`
          pm.test('Negated include.members', function () {
            pm.expect([1,2,3]).to.not.include.members([5]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated include.members",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to not include members [5]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should fail when negated member is included", () => {
      return expect(
        runTest(`
          pm.test('Negated include.members fails', function () {
            pm.expect([1,2,3]).to.not.include.members([2]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated include.members fails",
              expectResults: [
                {
                  status: "fail",
                  message: "Expected [1, 2, 3] to not include members [2]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should fail when members are not included", () => {
      return expect(
        runTest(`
          pm.test('Include members fails', function () {
            pm.expect([1,2,3]).to.include.members([4]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Include members fails",
              expectResults: [
                {
                  status: "fail",
                  message: "Expected [1, 2, 3] to include members [4]",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("include() with strings and arrays", () => {
    test("should work with array include", () => {
      return expect(
        runTest(`
          pm.test('Array include', function () {
            var arr = [1,2,3];
            pm.expect(arr).to.include(2);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Array include",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3] to include 2",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should work with string include", () => {
      return expect(
        runTest(`
          pm.test('String include', function () {
            pm.expect('hoppscotch').to.include('hopp');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "String include",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected 'hoppscotch' to include 'hopp'",
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

describe("pm.expect() - Combined Assertions (Real-world Postman Patterns)", () => {
  test("should handle the reported issue case from #5489", () => {
    return expect(
      runTest(`
        pm.test('Contains and includes', function () {
          var arr = [1,2,3];
          pm.expect(arr).to.include(2);
          pm.expect('hoppscotch').to.include('hopp');
          pm.expect({a: 1, b: 2}).to.have.keys(['a','b']);
          pm.expect({x:5}).to.not.have.key('z');
        });

        pm.test('Members matching', function () {
          pm.expect([1,2,3]).to.have.members([3,2,1]);
          pm.expect([1,2,3]).to.include.members([2]);
          pm.expect([1,2,3]).to.not.include.members([5]);
        });
      `)()
    ).resolves.toEqualRight([
      {
        descriptor: "root",
        expectResults: [],
        children: [
          {
            descriptor: "Contains and includes",
            expectResults: [
              {
                status: "pass",
                message: "Expected [1, 2, 3] to include 2",
              },
              {
                status: "pass",
                message: "Expected 'hoppscotch' to include 'hopp'",
              },
              {
                status: "pass",
                message: "Expected {a: 1, b: 2} to have keys 'a', 'b'",
              },
              {
                status: "pass",
                message: "Expected {x: 5} to not have keys 'z'",
              },
            ],
            children: [],
          },
          {
            descriptor: "Members matching",
            expectResults: [
              {
                status: "pass",
                message: "Expected [1, 2, 3] to have members [3, 2, 1]",
              },
              {
                status: "pass",
                message: "Expected [1, 2, 3] to include members [2]",
              },
              {
                status: "pass",
                message: "Expected [1, 2, 3] to not include members [5]",
              },
            ],
            children: [],
          },
        ],
      },
    ])
  })
})
