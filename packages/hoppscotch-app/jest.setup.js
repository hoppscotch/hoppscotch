import "@testing-library/jest-dom"
import "@relmify/jest-fp-ts"

import * as E from "fp-ts/Either"
import { toMatchInlineSnapshot } from "jest-snapshot"

const toMatchInlineSnapshotLeft = function (received, ...rest) {
  return E.isLeft(received)
    ? // @ts-ignore
      toMatchInlineSnapshot.call(this, received.left, ...rest)
    : {
        message: () =>
          `Expected Left of an either, Received: ${this.utils.printReceived(
            received
          )}`,
        pass: false,
      }
}

const toMatchInlineSnapshotRight = function (received, ...rest) {
  return E.isRight(received)
    ? toMatchInlineSnapshot.call(
        // @ts-ignore
        this,
        received.right,
        ...rest
      )
    : {
        message: () =>
          `Expected Right of an either, Received: ${this.utils.printReceived(
            received
          )}`,
        pass: false,
      }
}

expect.extend({ toMatchInlineSnapshotLeft, toMatchInlineSnapshotRight })
