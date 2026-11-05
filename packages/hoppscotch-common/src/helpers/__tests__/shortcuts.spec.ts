import { describe, expect, test } from "vitest"
import { getShortcuts } from "../shortcuts"

describe("getShortcuts", () => {
  test("ties the protocol-switch entry to its action", () => {
    const entry = getShortcuts((x) => x).find(
      (s) => s.label === "shortcut.tabs.switch_protocol"
    )

    expect(entry?.action).toBe("tab.switch-protocol")
  })
})
