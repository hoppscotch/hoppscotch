/**
 * PM Namespace - Change/Increase/Decrease Getter Function Pattern Tests
 *
 * Tests for change/increase/decrease assertions using getter functions.
 * These patterns are commonly used in Postman collections.
 *
 * Patterns tested:
 * - pm.expect(fn).to.change(() => value)
 * - pm.expect(fn).to.increase(() => counter)
 * - pm.expect(fn).to.decrease(() => counter)
 * - pm.expect(fn).to.increase(() => value).by(amount)
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("change() - Getter Function Pattern", () => {
  test("should detect when getter value changes", async () => {
    const testScript = `
      pm.test("change() - value changes", () => {
        let value = 0;
        const changeFn = () => { value = 1; };
        pm.expect(changeFn).to.change(() => value);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "change() - value changes",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass with negation when value does not change", async () => {
    const testScript = `
      pm.test("change() - negated when no change", () => {
        let value = 0;
        const noChangeFn = () => { value = 0; };
        pm.expect(noChangeFn).to.not.change(() => value);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "change() - negated when no change",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .by() chaining with getter", async () => {
    const testScript = `
      pm.test("change().by() - specific change amount", () => {
        let value = 5;
        const addFive = () => { value += 5; };
        pm.expect(addFive).to.change(() => value).by(5);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "change().by() - specific change amount",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("increase() - Getter Function Pattern", () => {
  test("should detect when getter value increases", async () => {
    const testScript = `
      pm.test("increase() - value increases", () => {
        let counter = 0;
        const incrementFn = () => { counter++; };
        pm.expect(incrementFn).to.increase(() => counter);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "increase() - value increases",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass with negation when value does not increase", async () => {
    const testScript = `
      pm.test("increase() - negated when no increase", () => {
        let counter = 5;
        const noIncreaseFn = () => { counter--; };
        pm.expect(noIncreaseFn).to.not.increase(() => counter);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "increase() - negated when no increase",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .by() chaining with getter", async () => {
    const testScript = `
      pm.test("increase().by() - specific increase amount", () => {
        let value = 5;
        const addFive = () => { value += 5; };
        pm.expect(addFive).to.increase(() => value).by(5);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "increase().by() - specific increase amount",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("decrease() - Getter Function Pattern", () => {
  test("should detect when getter value decreases", async () => {
    const testScript = `
      pm.test("decrease() - value decreases", () => {
        let counter = 10;
        const decrementFn = () => { counter--; };
        pm.expect(decrementFn).to.decrease(() => counter);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "decrease() - value decreases",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should pass with negation when value does not decrease", async () => {
    const testScript = `
      pm.test("decrease() - negated when no decrease", () => {
        let counter = 5;
        const noDecreaseFn = () => { counter++; };
        pm.expect(noDecreaseFn).to.not.decrease(() => counter);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "decrease() - negated when no decrease",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })

  test("should support .by() chaining with getter", async () => {
    const testScript = `
      pm.test("decrease().by() - specific decrease amount", () => {
        let value = 10;
        const subtractThree = () => { value -= 3; };
        pm.expect(subtractThree).to.decrease(() => value).by(3);
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "decrease().by() - specific decrease amount",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("Object + Property Pattern (Still Supported)", () => {
  test("should still work with object and property name", async () => {
    const testScript = `
      pm.test("change() - object+property pattern", () => {
        const obj = { count: 0 };
        const changeFn = () => { obj.count = 5; };
        pm.expect(changeFn).to.change(obj, 'count');
      });
    `

    const result = await runTest(testScript)()
    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "change() - object+property pattern",
              expectResults: [expect.objectContaining({ status: "pass" })],
            }),
          ]),
        }),
      ])
    )
  })
})
