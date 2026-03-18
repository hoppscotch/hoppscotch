// Map/Set serialize as {} across sandbox boundary, so we extract .size before serialization

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("Map.size property assertions", () => {
  test("should support .property('size') for Map", async () => {
    const testScript = `
      pm.test("Map - size property", () => {
        const myMap = new Map([['key1', 'value1'], ['key2', 'value2']]);
        pm.expect(myMap).to.have.property('size', 2);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Map - size property",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .property('size') with chaining for Map", async () => {
    const testScript = `
      pm.test("Map - size with chaining", () => {
        const myMap = new Map([['a', 1], ['b', 2], ['c', 3]]);
        pm.expect(myMap).to.have.property('size').that.equals(3);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Map - size with chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support negation for Map size", async () => {
    const testScript = `
      pm.test("Map - size negation", () => {
        const myMap = new Map([['key1', 'value1']]);
        pm.expect(myMap).to.not.have.property('size', 5);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Map - size negation",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Set.size property assertions", () => {
  test("should support .property('size') for Set", async () => {
    const testScript = `
      pm.test("Set - size property", () => {
        const mySet = new Set([1, 2, 3]);
        pm.expect(mySet).to.have.property('size', 3);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Set - size property",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .property('size') with chaining for Set", async () => {
    const testScript = `
      pm.test("Set - size with chaining", () => {
        const mySet = new Set(['a', 'b', 'c', 'd']);
        pm.expect(mySet).to.have.property('size').that.is.above(2);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Set - size with chaining",
              expectResults: expect.arrayContaining([
                expect.objectContaining({ status: "pass" }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })

  test("should support negation for Set size", async () => {
    const testScript = `
      pm.test("Set - size negation", () => {
        const mySet = new Set([1, 2]);
        pm.expect(mySet).to.not.have.property('size', 10);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Set - size negation",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should handle empty Set", async () => {
    const testScript = `
      pm.test("Set - empty size", () => {
        const mySet = new Set();
        pm.expect(mySet).to.have.property('size', 0);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Set - empty size",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should handle empty Map", async () => {
    const testScript = `
      pm.test("Map - empty size", () => {
        const myMap = new Map();
        pm.expect(myMap).to.have.property('size', 0);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "Map - empty size",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})
