/**
 * @see https://github.com/hoppscotch/hoppscotch/discussions/5221
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

const NAMESPACES = ["pm", "hopp"] as const

describe.each(NAMESPACES)(
  "%s.expect() - Side Effect Assertions (Standard Pattern)",
  (namespace) => {
    describe("`.change()` with object and property", () => {
      test("should detect property changes", () => {
        return expect(
          runTest(`
          ${namespace}.test("change assertions work", () => {
            const obj = { val: 0 }
            ${namespace}.expect(() => { obj.val = 5 }).to.change(obj, 'val')
            ${namespace}.expect(() => { obj.val = 5 }).to.not.change(obj, 'val')
            ${namespace}.expect(() => {}).to.not.change(obj, 'val')
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "change assertions work",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should detect changes by specific delta using `.by()`", () => {
        return expect(
          runTest(`
          ${namespace}.test("change by delta works", () => {
            const obj = { val: 0 }
            ${namespace}.expect(() => { obj.val += 5 }).to.change(obj, 'val').by(5)
            ${namespace}.expect(() => { obj.val -= 3 }).to.change(obj, 'val').by(3)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "change by delta works",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should support negative delta", () => {
        return expect(
          runTest(`
          ${namespace}.test("change with negative delta", () => {
            const obj = { value: 50 }
            const decreaseValue = () => { obj.value = 30 }
            ${namespace}.expect(decreaseValue).to.change(obj, "value").by(-20)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "change with negative delta",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })
    })

    describe("`.increase()` with object and property", () => {
      test("should detect property increases", () => {
        return expect(
          runTest(`
          ${namespace}.test("increase assertions work", () => {
            const obj = { count: 0 }
            ${namespace}.expect(() => { obj.count++ }).to.increase(obj, 'count')
            ${namespace}.expect(() => { obj.count += 5 }).to.increase(obj, 'count')
            ${namespace}.expect(() => { obj.count-- }).to.not.increase(obj, 'count')
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "increase assertions work",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should detect increases by specific amount using `.by()`", () => {
        return expect(
          runTest(`
          ${namespace}.test("increase by amount works", () => {
            const obj = { count: 0 }
            ${namespace}.expect(() => { obj.count += 3 }).to.increase(obj, 'count').by(3)
            ${namespace}.expect(() => { obj.count += 7 }).to.increase(obj, 'count').by(7)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "increase by amount works",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })
    })

    describe("`.decrease()` with object and property", () => {
      test("should detect property decreases", () => {
        return expect(
          runTest(`
          ${namespace}.test("decrease assertions work", () => {
            const obj = { count: 10 }
            ${namespace}.expect(() => { obj.count-- }).to.decrease(obj, 'count')
            ${namespace}.expect(() => { obj.count -= 3 }).to.decrease(obj, 'count')
            ${namespace}.expect(() => { obj.count++ }).to.not.decrease(obj, 'count')
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "decrease assertions work",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should detect decreases by specific amount using `.by()`", () => {
        return expect(
          runTest(`
          ${namespace}.test("decrease by amount works", () => {
            const obj = { count: 10 }
            ${namespace}.expect(() => { obj.count -= 2 }).to.decrease(obj, 'count').by(2)
            ${namespace}.expect(() => { obj.count -= 4 }).to.decrease(obj, 'count').by(4)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "decrease by amount works",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })
    })
  }
)

describe.each(NAMESPACES)(
  "%s.expect() - Side Effect Assertions (Getter Function Pattern)",
  (namespace) => {
    describe("`.change()` with getter function", () => {
      test("should detect when getter value changes", () => {
        return expect(
          runTest(`
          ${namespace}.test("change with getter function", () => {
            let value = 0
            const changeFn = () => { value = 1 }
            ${namespace}.expect(changeFn).to.change(() => value)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "change with getter function",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should pass with negation when value does not change", () => {
        return expect(
          runTest(`
          ${namespace}.test("change negated when no change", () => {
            let value = 0
            const noChangeFn = () => { value = 0 }
            ${namespace}.expect(noChangeFn).to.not.change(() => value)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "change negated when no change",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should support `.by()` chaining with getter", () => {
        return expect(
          runTest(`
          ${namespace}.test("change by with getter function", () => {
            let value = 5
            const addFive = () => { value += 5 }
            ${namespace}.expect(addFive).to.change(() => value).by(5)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "change by with getter function",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })
    })

    describe("`.increase()` with getter function", () => {
      test("should detect when getter value increases", () => {
        return expect(
          runTest(`
          ${namespace}.test("increase with getter function", () => {
            let counter = 0
            const incrementFn = () => { counter++ }
            ${namespace}.expect(incrementFn).to.increase(() => counter)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "increase with getter function",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should pass with negation when value does not increase", () => {
        return expect(
          runTest(`
          ${namespace}.test("increase negated when no increase", () => {
            let counter = 5
            const noIncreaseFn = () => { counter-- }
            ${namespace}.expect(noIncreaseFn).to.not.increase(() => counter)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "increase negated when no increase",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should support `.by()` chaining with getter", () => {
        return expect(
          runTest(`
          ${namespace}.test("increase by with getter function", () => {
            let value = 5
            const addFive = () => { value += 5 }
            ${namespace}.expect(addFive).to.increase(() => value).by(5)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "increase by with getter function",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })
    })

    describe("`.decrease()` with getter function", () => {
      test("should detect when getter value decreases", () => {
        return expect(
          runTest(`
          ${namespace}.test("decrease with getter function", () => {
            let counter = 10
            const decrementFn = () => { counter-- }
            ${namespace}.expect(decrementFn).to.decrease(() => counter)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "decrease with getter function",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should pass with negation when value does not decrease", () => {
        return expect(
          runTest(`
          ${namespace}.test("decrease negated when no decrease", () => {
            let counter = 5
            const noDecreaseFn = () => { counter++ }
            ${namespace}.expect(noDecreaseFn).to.not.decrease(() => counter)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "decrease negated when no decrease",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })

      test("should support `.by()` chaining with getter", () => {
        return expect(
          runTest(`
          ${namespace}.test("decrease by with getter function", () => {
            let value = 10
            const subtractThree = () => { value -= 3 }
            ${namespace}.expect(subtractThree).to.decrease(() => value).by(3)
          })
        `)()
        ).resolves.toEqualRight([
          expect.objectContaining({
            descriptor: "root",
            children: [
              expect.objectContaining({
                descriptor: "decrease by with getter function",
                expectResults: expect.arrayContaining([
                  expect.objectContaining({ status: "pass" }),
                ]),
              }),
            ],
          }),
        ])
      })
    })
  }
)
