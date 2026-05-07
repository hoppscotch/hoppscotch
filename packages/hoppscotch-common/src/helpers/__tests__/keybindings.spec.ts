import { describe, expect, test } from "vitest"
import { resolvePressedKey } from "../keybindings"

// Fixture builder to keep individual cases readable. Layout name in the
// describe block is the conceptual layout; `key` and `code` are what the
// browser actually emits when the user presses a given physical key on
// that layout.
const ev = (key: string, code: string) => ({ key, code })

describe("resolvePressedKey: letter dispatch", () => {
  describe("strategy: 'key' (typed letter)", () => {
    test("US-QWERTY Q resolves to q", () => {
      expect(resolvePressedKey(ev("q", "KeyQ"), "key")).toBe("q")
    })

    test("AZERTY 'A' keycap (physical Q position) resolves to a", () => {
      // On AZERTY the physical KeyQ position types "a"; the user pressing
      // the keycap labelled A expects Ctrl+A behaviour.
      expect(resolvePressedKey(ev("a", "KeyQ"), "key")).toBe("a")
    })

    test("QWERTZ 'Z' keycap (physical Y position) resolves to z", () => {
      expect(resolvePressedKey(ev("z", "KeyY"), "key")).toBe("z")
    })

    test("Cyrillic Q (typed 'й') falls through to non-letter handling", () => {
      // 'й' is not a-z so the letter branch returns null and the rest
      // of the resolver doesn't recognise it either.
      expect(resolvePressedKey(ev("й", "KeyQ"), "key")).toBeNull()
    })

    test("Mac Option+Q (typed 'œ') falls through", () => {
      expect(resolvePressedKey(ev("œ", "KeyQ"), "key")).toBeNull()
    })
  })

  describe("strategy: 'code' (physical position)", () => {
    test("US-QWERTY Q resolves to q", () => {
      expect(resolvePressedKey(ev("q", "KeyQ"), "code")).toBe("q")
    })

    test("AZERTY 'A' keycap (physical Q position) resolves to q", () => {
      // Pure physical strategy; whatever the user typed is ignored.
      expect(resolvePressedKey(ev("a", "KeyQ"), "code")).toBe("q")
    })

    test("Cyrillic physical Q (typed 'й') resolves to q", () => {
      expect(resolvePressedKey(ev("й", "KeyQ"), "code")).toBe("q")
    })

    test("Mac Option+Q (typed 'œ') resolves to q", () => {
      expect(resolvePressedKey(ev("œ", "KeyQ"), "code")).toBe("q")
    })
  })

  describe("strategy: 'hybrid' (key first, code fallback)", () => {
    test("US-QWERTY Q resolves to q", () => {
      expect(resolvePressedKey(ev("q", "KeyQ"), "hybrid")).toBe("q")
    })

    test("AZERTY 'A' keycap (physical Q position) resolves to a", () => {
      // Latin glyph available, so use it.
      expect(resolvePressedKey(ev("a", "KeyQ"), "hybrid")).toBe("a")
    })

    test("Cyrillic physical Q (typed 'й') falls back to code → q", () => {
      // Non-Latin glyph, fall back to physical position.
      expect(resolvePressedKey(ev("й", "KeyQ"), "hybrid")).toBe("q")
    })

    test("Mac Option+Q (typed 'œ') falls back to code → q", () => {
      // 'œ' is not in [a-z] so hybrid falls through to code.
      expect(resolvePressedKey(ev("œ", "KeyQ"), "hybrid")).toBe("q")
    })

    test("Dvorak 'Q' keycap typing 'q' resolves to q", () => {
      // Dvorak users with Dvorak software remapping see the typed
      // letter match the keycap; hybrid uses event.key directly.
      expect(resolvePressedKey(ev("q", "KeyX"), "hybrid")).toBe("q")
    })
  })
})

describe("resolvePressedKey: digit dispatch", () => {
  test("'key' uses event.key for digits", () => {
    expect(resolvePressedKey(ev("1", "Digit1"), "key")).toBe("1")
  })

  test("'code' uses event.code for digits", () => {
    expect(resolvePressedKey(ev("1", "Digit1"), "code")).toBe("1")
  })

  test("AZERTY digit row (typed '&', code Digit1) resolves to 1 under hybrid", () => {
    expect(resolvePressedKey(ev("&", "Digit1"), "hybrid")).toBe("1")
  })

  test("AZERTY digit row resolves to 1 under code", () => {
    expect(resolvePressedKey(ev("&", "Digit1"), "code")).toBe("1")
  })

  test("AZERTY digit row falls through under key (no Latin digit typed)", () => {
    expect(resolvePressedKey(ev("&", "Digit1"), "key")).toBeNull()
  })
})

describe("resolvePressedKey: layout-stable keys", () => {
  // These keys produce the same event.key regardless of layout, so
  // every strategy resolves them identically.
  const strategies = ["key", "code", "hybrid"] as const

  for (const strategy of strategies) {
    describe(`strategy: '${strategy}'`, () => {
      test("ArrowUp resolves to up", () => {
        expect(resolvePressedKey(ev("ArrowUp", "ArrowUp"), strategy)).toBe("up")
      })

      test("Tab resolves to tab", () => {
        expect(resolvePressedKey(ev("Tab", "Tab"), strategy)).toBe("tab")
      })

      test("Enter resolves to enter", () => {
        expect(resolvePressedKey(ev("Enter", "Enter"), strategy)).toBe("enter")
      })

      test("Shift+/ (typed '?') maps to /", () => {
        expect(resolvePressedKey(ev("?", "Slash"), strategy)).toBe("/")
      })

      test("[ resolves to [", () => {
        expect(resolvePressedKey(ev("[", "BracketLeft"), strategy)).toBe("[")
      })

      test("Cyrillic physical [ key (typed 'х') falls back to [", () => {
        // On Russian Cyrillic the physical KeyBracketLeft position
        // types "х"; the resolver falls back to the bracket code so
        // the shortcut still fires.
        expect(resolvePressedKey(ev("х", "BracketLeft"), strategy)).toBe("[")
      })

      test("Cyrillic physical ] key (typed 'ъ') falls back to ]", () => {
        expect(resolvePressedKey(ev("ъ", "BracketRight"), strategy)).toBe("]")
      })
    })
  }
})

describe("resolvePressedKey: synthetic-event fallback", () => {
  // Synthetic events (programmatic dispatch, certain older environments)
  // can arrive without `event.code` set. The resolver falls back to
  // `event.key` for ASCII letters under every strategy so the shortcut
  // still resolves rather than being silently dropped.
  test("'code' strategy falls back to event.key when code is empty", () => {
    expect(resolvePressedKey(ev("a", ""), "code")).toBe("a")
  })

  test("'key' strategy resolves Latin letter without needing code", () => {
    expect(resolvePressedKey(ev("a", ""), "key")).toBe("a")
  })

  test("'hybrid' strategy resolves Latin letter without needing code", () => {
    expect(resolvePressedKey(ev("a", ""), "hybrid")).toBe("a")
  })
})

describe("resolvePressedKey: edge cases", () => {
  test("empty event returns null", () => {
    expect(resolvePressedKey(ev("", ""), "hybrid")).toBeNull()
  })

  test("uppercase letter is normalised to lowercase under 'key'", () => {
    expect(resolvePressedKey(ev("Q", "KeyQ"), "key")).toBe("q")
  })

  test("numpad branch resolves under 'code' strategy when NumLock is on", () => {
    // The digit branch normally picks up key="1" before the numpad
    // branch sees the event. Strategy "code" suppresses that path
    // (event.code "Numpad1" isn't "Digit1"), so resolution falls to
    // the numpad branch, which gates on NumLock.
    expect(
      resolvePressedKey(
        { key: "1", code: "Numpad1", getModifierState: () => true },
        "code"
      )
    ).toBe("1")
  })

  test("numpad digit returns null without NumLock when key is navigational", () => {
    // Without NumLock, browsers send the navigation function ("End"
    // for Numpad1) in event.key, so neither the digit nor the numpad
    // branch can resolve.
    expect(
      resolvePressedKey(
        { key: "End", code: "Numpad1", getModifierState: () => false },
        "hybrid"
      )
    ).toBeNull()
  })
})
