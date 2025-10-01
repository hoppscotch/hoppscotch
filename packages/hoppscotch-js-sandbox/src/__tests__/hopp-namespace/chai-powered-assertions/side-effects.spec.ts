/**
 * Side Effect Assertions Test Suite
 *
 * This test suite validates Chai.js side-effect assertions that monitor
 * property changes during function execution:
 * - `.change()` - detects any property value change
 * - `.increase()` - detects numerical property increases
 * - `.decrease()` - detects numerical property decreases
 * - `.by()` - chains with change/increase/decrease to assert specific delta
 *
 * These assertions are critical for testing mutations and state changes.
 *
 * @see RFC: Enhanced Scripting - Chai.js Integration
 * @see https://github.com/hoppscotch/hoppscotch/discussions/5221
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`hopp.expect` - Side Effect Assertions", () => {
  describe("`.change()` Assertions", () => {
    test("should detect property changes", () => {
      return expect(
        runTest(`
          hopp.test("change assertions work", () => {
            const obj = { val: 0 }
            hopp.expect(() => { obj.val = 5 }).to.change(obj, 'val')
            hopp.expect(() => { obj.val = 5 }).to.not.change(obj, 'val')
            hopp.expect(() => {}).to.not.change(obj, 'val')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "change assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to change {}.'val'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to not change {}.'val'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to not change {}.'val'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should detect changes by specific delta using `.by()`", () => {
      return expect(
        runTest(`
          hopp.test("change by delta works", () => {
            const obj = { val: 0 }
            hopp.expect(() => { obj.val += 5 }).to.change(obj, 'val').by(5)
            hopp.expect(() => { obj.val -= 3 }).to.change(obj, 'val').by(3)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "change by delta works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to change {}.'val' by 5",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to change {}.'val' by 3",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("`.increase()` Assertions", () => {
    test("should detect property increases", () => {
      return expect(
        runTest(`
          hopp.test("increase assertions work", () => {
            const obj = { count: 0 }
            hopp.expect(() => { obj.count++ }).to.increase(obj, 'count')
            hopp.expect(() => { obj.count += 5 }).to.increase(obj, 'count')
            hopp.expect(() => { obj.count-- }).to.not.increase(obj, 'count')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "increase assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to increase {}.'count'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to increase {}.'count'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to not increase {}.'count'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should detect increases by specific amount using `.by()`", () => {
      return expect(
        runTest(`
          hopp.test("increase by amount works", () => {
            const obj = { count: 0 }
            hopp.expect(() => { obj.count += 3 }).to.increase(obj, 'count').by(3)
            hopp.expect(() => { obj.count += 7 }).to.increase(obj, 'count').by(7)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "increase by amount works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to increase {}.'count' by 3",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to increase {}.'count' by 7",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })

  describe("`.decrease()` Assertions", () => {
    test("should detect property decreases", () => {
      return expect(
        runTest(`
          hopp.test("decrease assertions work", () => {
            const obj = { count: 10 }
            hopp.expect(() => { obj.count-- }).to.decrease(obj, 'count')
            hopp.expect(() => { obj.count -= 3 }).to.decrease(obj, 'count')
            hopp.expect(() => { obj.count++ }).to.not.decrease(obj, 'count')
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "decrease assertions work",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to decrease {}.'count'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to decrease {}.'count'",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to not decrease {}.'count'",
                },
              ],
            }),
          ],
        }),
      ])
    })

    test("should detect decreases by specific amount using `.by()`", () => {
      return expect(
        runTest(`
          hopp.test("decrease by amount works", () => {
            const obj = { count: 10 }
            hopp.expect(() => { obj.count -= 2 }).to.decrease(obj, 'count').by(2)
            hopp.expect(() => { obj.count -= 4 }).to.decrease(obj, 'count').by(4)
          })
        `)()
      ).resolves.toEqualRight([
        expect.objectContaining({
          descriptor: "root",
          children: [
            expect.objectContaining({
              descriptor: "decrease by amount works",
              expectResults: [
                {
                  status: "pass",
                  message: "Expected [Function] to decrease {}.'count' by 2",
                },
                {
                  status: "pass",
                  message: "Expected [Function] to decrease {}.'count' by 4",
                },
              ],
            }),
          ],
        }),
      ])
    })
  })
})
