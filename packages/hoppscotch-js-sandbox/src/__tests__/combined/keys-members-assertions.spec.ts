/**
 * @see https://github.com/hoppscotch/hoppscotch/issues/5489
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)("%s.expect() - Keys Assertions", (namespace) => {
  describe("keys() method", () => {
    test("should accept array syntax: keys(['a', 'b'])", () => {
      return expect(
        runTest(`
          ${namespace}.test('Keys with array syntax', function () {
            ${namespace}.expect({a: 1, b: 2}).to.have.keys(['a','b']);
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
          ${namespace}.test('Keys with spread syntax', function () {
            ${namespace}.expect({a: 1, b: 2}).to.have.keys('a','b');
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
          ${namespace}.test('Negated keys with array', function () {
            ${namespace}.expect({a: 1}).to.not.have.keys(['b','c']);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated keys with array",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {a: 1} to not have keys 'b', 'c'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })

    test("should support negation with spread syntax", () => {
      return expect(
        runTest(`
          ${namespace}.test('Negated keys with spread', function () {
            ${namespace}.expect({x:5}).to.not.have.keys('y','z');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Negated keys with spread",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {x: 5} to not have keys 'y', 'z'",
                },
              ],
              children: [],
            },
          ],
        },
      ])
    })
  })

  describe("key() singular method", () => {
    test("should accept single string argument", () => {
      return expect(
        runTest(`
          ${namespace}.test('Single key check', function () {
            ${namespace}.expect({name: 'test'}).to.have.key('name');
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Single key check",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected {name: 'test'} to have keys 'name'",
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
          ${namespace}.test('Negated key assertion', function () {
            ${namespace}.expect({x:5}).to.not.have.key('z');
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

describe.each(NAMESPACES)("%s.expect() - Members Assertions", (namespace) => {
  describe("members() method", () => {
    test("should match members in any order", () => {
      return expect(
        runTest(`
          ${namespace}.test('Members matching', function () {
            ${namespace}.expect([1,2,3]).to.have.members([3,2,1]);
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
          ${namespace}.test('Negated members', function () {
            ${namespace}.expect([1,2,3]).to.not.have.members([4,5,6]);
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

    test("should fail when members don't match", () => {
      return expect(
        runTest(`
          ${namespace}.test('Members mismatch', function () {
            ${namespace}.expect([1,2]).to.have.members([1,2,3]);
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
                  message: expect.stringContaining("to have members"),
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
          ${namespace}.test('Include members', function () {
            ${namespace}.expect([1,2,3]).to.include.members([2]);
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

    test("should match multiple subset members", () => {
      return expect(
        runTest(`
          ${namespace}.test('Multiple include members', function () {
            ${namespace}.expect([1,2,3,4,5]).to.include.members([2,4]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Multiple include members",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [1, 2, 3, 4, 5] to include members [2, 4]",
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
          ${namespace}.test('Negated include.members', function () {
            ${namespace}.expect([1,2,3]).to.not.include.members([5]);
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

    test("should fail when subset members not present", () => {
      return expect(
        runTest(`
          ${namespace}.test('Missing subset members', function () {
            ${namespace}.expect([1,2,3]).to.include.members([4,5]);
          })
        `)()
      ).resolves.toEqualRight([
        {
          descriptor: "root",
          expectResults: [],
          children: [
            {
              descriptor: "Missing subset members",
              expectResults: [
                {
                  status: "fail",
                  message: expect.stringContaining("to include members"),
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

describe.each(NAMESPACES)(
  "%s.expect() - Combined Keys and Members",
  (namespace) => {
    test("should handle all assertions from the reported issue", () => {
      return expect(
        runTest(`
          ${namespace}.test('Contains and includes', function () {
            var arr = [1,2,3];
            ${namespace}.expect(arr).to.include(2);
            ${namespace}.expect('hoppscotch').to.include('hopp');
            ${namespace}.expect({a: 1, b: 2}).to.have.keys(['a','b']);
            ${namespace}.expect({x:5}).to.not.have.key('z');
          });

          ${namespace}.test('Members matching', function () {
            ${namespace}.expect([1,2,3]).to.have.members([3,2,1]);
            ${namespace}.expect([1,2,3]).to.include.members([2]);
            ${namespace}.expect([1,2,3]).to.not.include.members([5]);
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
  }
)
