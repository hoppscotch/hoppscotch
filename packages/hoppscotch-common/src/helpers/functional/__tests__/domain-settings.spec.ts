import { describe, expect, test } from "vitest"
import * as E from "fp-ts/Either"

import { convertDomainSetting } from "../domain-settings"

const securityOf = (
  security: Parameters<typeof convertDomainSetting>[0]["security"]
) => {
  const result = convertDomainSetting({ version: "v1", security })
  if (E.isLeft(result)) throw result.left
  return result.right.security
}

describe("convertDomainSetting security", () => {
  test("verifies host and peer when the entry has no security", () => {
    expect(securityOf(undefined)).toEqual({
      verifyHost: true,
      verifyPeer: true,
    })
  })

  test("verifies the peer when only verifyHost is set", () => {
    expect(securityOf({ verifyHost: false })).toEqual({
      verifyHost: false,
      verifyPeer: true,
    })
  })

  test("verifies the host when only verifyPeer is set", () => {
    expect(securityOf({ verifyPeer: false })).toEqual({
      verifyHost: true,
      verifyPeer: false,
    })
  })

  test("keeps both flags when both are set", () => {
    expect(securityOf({ verifyHost: false, verifyPeer: false })).toEqual({
      verifyHost: false,
      verifyPeer: false,
    })
  })
})
