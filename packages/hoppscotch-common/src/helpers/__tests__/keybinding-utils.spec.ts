import { describe, expect, test } from "vitest"
import { getPressedShortcutKey } from "../keybinding-utils"

function createKeyboardEventLike({ key, code }: { key: string; code: string }) {
  return { key, code }
}

describe("getPressedShortcutKey", () => {
  test("prefers the typed Latin letter over the physical key code", () => {
    expect(
      getPressedShortcutKey(createKeyboardEventLike({ key: "a", code: "KeyQ" }))
    ).toBe("a")

    expect(
      getPressedShortcutKey(createKeyboardEventLike({ key: "z", code: "KeyW" }))
    ).toBe("z")
  })

  test("falls back to physical letter codes for non-Latin layouts", () => {
    expect(
      getPressedShortcutKey(createKeyboardEventLike({ key: "й", code: "KeyQ" }))
    ).toBe("q")
  })

  test("keeps punctuation-based shortcuts layout aware", () => {
    expect(
      getPressedShortcutKey(
        createKeyboardEventLike({ key: "?", code: "Slash" })
      )
    ).toBe("/")

    expect(
      getPressedShortcutKey(
        createKeyboardEventLike({ key: "[", code: "Digit5" })
      )
    ).toBe("[")
  })

  test("supports digits from the main row and numpad", () => {
    expect(
      getPressedShortcutKey(
        createKeyboardEventLike({ key: "9", code: "Digit9" })
      )
    ).toBe("9")

    // Numpad with NumLock ON produces "0"-"9" in event.key, which
    // the digit check handles without needing a separate Numpad branch.
    expect(
      getPressedShortcutKey(
        createKeyboardEventLike({ key: "9", code: "Numpad9" })
      )
    ).toBe("9")
  })

  test("falls back to physical digit codes for non-digit layouts", () => {
    // AZERTY: physical Digit1 produces "&" in event.key
    expect(
      getPressedShortcutKey(
        createKeyboardEventLike({ key: "&", code: "Digit1" })
      )
    ).toBe("1")

    // AZERTY: physical Digit0 produces "à" in event.key
    expect(
      getPressedShortcutKey(
        createKeyboardEventLike({ key: "à", code: "Digit0" })
      )
    ).toBe("0")
  })

  test("returns null for unrecognised keys", () => {
    expect(
      getPressedShortcutKey(createKeyboardEventLike({ key: "F1", code: "F1" }))
    ).toBeNull()
  })
})
