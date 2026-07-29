import { describe, it, expect, vi } from "vitest"

// Mock all external imports so the module can be loaded in a plain Node/JSDOM
// environment without a full Hoppscotch runtime.
vi.mock("vue", () => ({
  onMounted: vi.fn(),
  onBeforeUnmount: vi.fn(),
}))

vi.mock("../actions", () => ({
  invokeAction: vi.fn(),
}))

vi.mock("../keyboard-strategy", () => ({
  getKeyboardLayoutStrategy: vi.fn(() => "key"),
}))

vi.mock("../platformutils", () => ({
  isAppleDevice: vi.fn(() => false),
}))

vi.mock("../utils/dom", () => ({
  isCodeMirrorEditor: vi.fn(() => false),
  isDOMElement: vi.fn(() => false),
  isInShortcutsFlyout: vi.fn(() => false),
  isMonacoEditor: vi.fn(() => false),
  isTypableElement: vi.fn(() => false),
}))

vi.mock("@hoppscotch/kernel", () => ({
  getKernelMode: vi.fn(() => "web"),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}))

import { areKeybindingsEnabled, useKeybindingDisabler } from "../keybindings"

describe("useKeybindingDisabler – reference counter", () => {
  /**
   * Each test must leave keybindingDisabledCount at 0 on exit so
   * subsequent tests start from a clean state (module state is shared
   * across tests in the same file).
   */

  it("keybindings are enabled by default", () => {
    expect(areKeybindingsEnabled()).toBe(true)
  })

  it("disabling once suppresses keybindings", () => {
    const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

    disableKeybindings()
    expect(areKeybindingsEnabled()).toBe(false)

    enableKeybindings() // cleanup
  })

  it("enabling after the sole disable restores keybindings", () => {
    const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

    disableKeybindings()
    enableKeybindings()

    expect(areKeybindingsEnabled()).toBe(true)
  })

  it("two callers: closing one modal does not re-enable keybindings while the other is still open", () => {
    const modal1 = useKeybindingDisabler()
    const modal2 = useKeybindingDisabler()

    modal1.disableKeybindings()
    modal2.disableKeybindings()

    // Modal 1 closes — Modal 2 is still open
    modal1.enableKeybindings()
    expect(areKeybindingsEnabled()).toBe(false) // must still be suppressed

    // Modal 2 closes — both are gone now
    modal2.enableKeybindings()
    expect(areKeybindingsEnabled()).toBe(true)
  })

  it("spurious enableKeybindings does not underflow the counter", () => {
    const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

    disableKeybindings()
    enableKeybindings()
    enableKeybindings() // extra call — counter must not go below zero

    expect(areKeybindingsEnabled()).toBe(true)
  })
})
