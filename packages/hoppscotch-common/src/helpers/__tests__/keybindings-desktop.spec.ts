import { describe, expect, test, vi } from "vitest"

vi.mock("@hoppscotch/kernel", () => ({ getKernelMode: () => "desktop" }))

import { bindings } from "../keybindings"
import { getShortcuts } from "../shortcuts"

describe("desktop bindings", () => {
  // The desktop shell sends ctrl-shift-t for Ctrl/Cmd+Shift+T, so the chord
  // needs an action here or the keypress does nothing.
  test("ctrl-shift-t reopens the last closed tab", () => {
    expect(bindings["ctrl-shift-t"]).toBe("tab.reopen-closed")
  })

  test("the shortcuts list shows the reopen chord", () => {
    const labels = getShortcuts((x) => x).map((s) => s.label)
    expect(labels).toContain("shortcut.tabs.reopen_tab")
  })
})
