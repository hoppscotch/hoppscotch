/**
 * Hopp Namespace - Keys and Members Assertions Test Suite
 *
 * This test suite validates Chai.js keys() and members() assertions
 * through the hopp.expect() API, ensuring feature parity with pm.expect().
 *
 * Coverage includes:
 * - keys() with array and spread syntax
 * - key() with string and array syntax
 * - members() assertions with and without negation
 * - include.members() with and without negation
 * - Negation handling for all assertion types
 *
 * @see https://github.com/hoppscotch/hoppscotch/issues/5489
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("hopp.expect() - Keys Assertions", () => {
  describe("keys() method", () => {
    test("should accept array syntax: keys(['a', 'b'])", () => {
      return expect(
        runTest(`
          hopp.test('Keys with array syntax', function () {
            hopp.expect({a: 1, b: 2}).to.have.keys(['a','b']);
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
          hopp.test('Keys with spread syntax', function () {
            hopp.expect({a: 1, b: 2}).to.have.keys('a','b');
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

    test("should support negation: not.have.key('z')", () => {
      return expect(
        runTest(`
          hopp.test('Negated key assertion', function () {
            hopp.expect({x:5}).to.not.have.key('z');
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
  })
})

describe("hopp.expect() - Members Assertions", () => {
  describe("members() method", () => {
    test("should match members in any order", () => {
      return expect(
        runTest(`
          hopp.test('Members matching', function () {
            hopp.expect([1,2,3]).to.have.members([3,2,1]);
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

    test("should support negation", () => {
      return expect(
        runTest(`
          hopp.test('Negated members', function () {
            hopp.expect([1,2,3]).to.not.have.members([4,5,6]);
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
          hopp.test('Include members', function () {
            hopp.expect([1,2,3]).to.include.members([2]);
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
          hopp.test('Negated include.members', function () {
            hopp.expect([1,2,3]).to.not.include.members([5]);
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
  })
})

describe("hopp.expect() - Combined Assertions", () => {
  test("should handle all assertions from the reported issue", () => {
    return expect(
      runTest(`
        hopp.test('Contains and includes', function () {
          var arr = [1,2,3];
          hopp.expect(arr).to.include(2);
          hopp.expect('hoppscotch').to.include('hopp');
          hopp.expect({a: 1, b: 2}).to.have.keys(['a','b']);
          hopp.expect({x:5}).to.not.have.key('z');
        });

        hopp.test('Members matching', function () {
          hopp.expect([1,2,3]).to.have.members([3,2,1]);
          hopp.expect([1,2,3]).to.include.members([2]);
          hopp.expect([1,2,3]).to.not.include.members([5]);
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
