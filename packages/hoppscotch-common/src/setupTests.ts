import * as E from "fp-ts/Either"
import { expect } from "vitest"

expect.extend({
  toBeLeft(received, expected) {
    const { isNot } = this

    return {
      pass:
        E.isLeft(received) &&
        this.equals(received.left, expected, undefined, false),
      message: () =>
        `Expected received value ${isNot ? "not " : ""}to be a left`,
    }
  },
  toBeRight(received) {
    const { isNot } = this

    return {
      pass: E.isRight(received),
      message: () =>
        `Expected received value ${isNot ? "not " : ""}to be a right`,
    }
  },
  toEqualLeft(received, expected) {
    const { isNot } = this

    const isLeft = E.isLeft(received)
    const leftEquals = E.isLeft(received)
      ? this.equals(received.left, expected)
      : false

    return {
      pass: isLeft && leftEquals,
      message: () => {
        if (!isLeft) {
          return `Expected received value ${isNot ? "not " : ""}to be a left`
        } else if (!leftEquals) {
          return `Expected received left value ${
            isNot ? "not" : ""
          } to equal expected value`
        }

        throw new Error("Invalid state on `toEqualLeft` matcher")
      },
    }
  },
  toSubsetEqualRight(received, expected) {
    const { isNot } = this

    const isRight = E.isRight(received)
    const rightSubsetEquals = E.isRight(received)
      ? !!this.utils.subsetEquality(received.right, expected)
      : false

    return {
      pass: isRight && rightSubsetEquals,
      message: () => {
        if (!isRight) {
          return `Expected received value ${isNot ? "not " : ""}to be a left`
        } else if (!rightSubsetEquals) {
          return `Expected received left value to ${
            isNot ? "not " : ""
          }equal expected value`
        }

        throw new Error("Invalid state on `toSubsetEqualRight` matcher")
      },
    }
  },
})
