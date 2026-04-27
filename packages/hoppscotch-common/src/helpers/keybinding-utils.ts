export type SupportedShortcutKey =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "up"
  | "down"
  | "left"
  | "right"
  | "/"
  | "."
  | "enter"
  | "tab"
  | "delete"
  | "backspace"
  | "["
  | "]"

type KeyboardEventLike = Pick<KeyboardEvent, "key" | "code">

export function getPressedShortcutKey(
  ev: KeyboardEventLike
): SupportedShortcutKey | null {
  const key = (ev.key ?? "").toLowerCase()
  const code = ev.code ?? ""

  // Prefer the actual Latin character so layouts like AZERTY and Dvorak
  // keep their expected Ctrl+A/Ctrl+Q behavior. When the active layout
  // produces a non-Latin glyph, fall back to the physical key code so
  // shortcuts still work on layouts like Cyrillic.
  if (key.length === 1 && key >= "a" && key <= "z") {
    return key as SupportedShortcutKey
  }

  if (code.startsWith("Key") && code.length === 4) {
    return code[3].toLowerCase() as SupportedShortcutKey
  }

  if (key.startsWith("arrow")) {
    return key.slice(5) as SupportedShortcutKey
  }

  if (key === "tab") return "tab"
  if (key === "delete") return "delete"
  if (key === "backspace") return "backspace"

  if (key === "?") return "/"

  if (key === "/" || key === "." || key === "enter") {
    return key as SupportedShortcutKey
  }

  if (key === "[" || key === "]") return key as SupportedShortcutKey
  if (code === "BracketLeft") return "["
  if (code === "BracketRight") return "]"

  // Digit keys: prefer event.key when it is already a digit. On layouts
  // like AZERTY the digit row produces symbols by default (e.g. "&", "é"),
  // so fall back to event.code (Digit0–Digit9) to keep numeric shortcuts
  // working. This also covers Numpad digits since NumLock-ON numpad keys
  // produce "0"–"9" in event.key.
  if (key.length === 1 && key >= "0" && key <= "9") {
    return key as SupportedShortcutKey
  }

  if (code.startsWith("Digit") && code.length === 6) {
    return code[5] as SupportedShortcutKey
  }

  return null
}
