import { onBeforeUnmount, onMounted } from "vue"
import { HoppActionWithNoArgs, invokeAction } from "./actions"
import { isAppleDevice } from "./platformutils"
import { isDOMElement, isTypableElement } from "./utils/dom"

/**
 * This variable keeps track whether keybindings are being accepted
 * true -> Keybindings are checked
 * false -> Key presses are ignored (Keybindings are not checked)
 */
let keybindingsEnabled = true

/**
 * Alt is also regarded as macOS OPTION (⌥) key
 * Ctrl is also regarded as macOS COMMAND (⌘) key (NOTE: this differs from HTML Keyboard spec where COMMAND is Meta key!)
 */
type ModifierKeys =
  | "ctrl"
  | "alt"
  | "ctrl-shift"
  | "alt-shift"
  | "ctrl-alt"
  | "ctrl-alt-shift"

/* eslint-disable prettier/prettier */
// prettier-ignore
type Key =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j"
  | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t"
  | "u" | "v" | "w" | "x" | "y" | "z" | "0" | "1" | "2" | "3"
  | "4" | "5" | "6" | "7" | "8" | "9" | "up" | "down" | "left"
  | "right" | "/" | "?" | "." | "enter"
/* eslint-enable */

type ModifierBasedShortcutKey = `${ModifierKeys}-${Key}`
// Singular keybindings (these will be disabled when an input-ish area has been focused)
type SingleCharacterShortcutKey = `${Key}`

type ShortcutKey = ModifierBasedShortcutKey | SingleCharacterShortcutKey

export const bindings: {
  // eslint-disable-next-line no-unused-vars
  [_ in ShortcutKey]?: HoppActionWithNoArgs
} = {
  "ctrl-enter": "request.send-cancel",
  "ctrl-i": "request.reset",
  "ctrl-u": "request.copy-link",
  "ctrl-s": "request.save",
  "ctrl-shift-s": "request.save-as",
  "alt-up": "request.method.next",
  "alt-down": "request.method.prev",
  "alt-g": "request.method.get",
  "alt-h": "request.method.head",
  "alt-p": "request.method.post",
  "alt-u": "request.method.put",
  "alt-x": "request.method.delete",
  "ctrl-k": "flyouts.keybinds.toggle",
  "/": "modals.search.toggle",
  "?": "modals.support.toggle",
  "ctrl-m": "modals.share.toggle",
  "alt-r": "navigation.jump.rest",
  "alt-q": "navigation.jump.graphql",
  "alt-w": "navigation.jump.realtime",
  "alt-d": "navigation.jump.documentation",
  "alt-s": "navigation.jump.settings",
  "alt-m": "navigation.jump.profile",
  "ctrl-shift-p": "response.preview.toggle",
  "ctrl-j": "response.file.download",
  "ctrl-.": "response.copy",
}

/**
 * A composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function hookKeybindingsListener() {
  onMounted(() => {
    document.addEventListener("keydown", handleKeyDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleKeyDown)
  })
}

function handleKeyDown(ev: KeyboardEvent) {
  // Do not check keybinds if the mode is disabled
  if (!keybindingsEnabled) return

  const binding = generateKeybindingString(ev)
  if (!binding) return

  const boundAction = bindings[binding]
  if (!boundAction) return

  ev.preventDefault()
  invokeAction(boundAction)
}

function generateKeybindingString(ev: KeyboardEvent): ShortcutKey | null {
  // We may or may not have a modifier key
  const modifierKey = getActiveModifier(ev)

  // We will always have a non-modifier key
  const key = getPressedKey(ev)
  if (!key) return null

  // All key combos backed by modifiers are valid shortcuts (whether currently typing or not)
  if (modifierKey) return `${modifierKey}-${key}`

  const target = ev.target

  // no modifier key here then we do not do anything while on input
  if (isDOMElement(target) && isTypableElement(target)) return null

  // single key while not input
  return `${key}`
}

function getPressedKey(ev: KeyboardEvent): Key | null {
  const val = ev.key.toLowerCase()
  // Check arrow keys
  if (val === "arrowup") return "up"
  else if (val === "arrowdown") return "down"
  else if (val === "arrowleft") return "left"
  else if (val === "arrowright") return "right"

  // Check letter keys
  const isLetter = ev.code.toLowerCase().startsWith("key")
  if (isLetter) return ev.code.toLowerCase().substring(3) as Key

  // Check if number keys
  if (val.length === 1 && !isNaN(val as any)) return val as Key

  // Check if question mark
  if (val === "?") return "?"

  // Check if question mark
  if (val === "/") return "/"

  // Check if period
  if (val === ".") return "."

  if (val === "enter") return "enter"

  // If no other cases match, this is not a valid key
  return null
}

function getActiveModifier(ev: KeyboardEvent): ModifierKeys | null {
  const modifierKeys = {
    ctrl: isAppleDevice() ? ev.metaKey : ev.ctrlKey,
    alt: ev.altKey,
    shift: ev.shiftKey,
  }

  // active modifier: ctrl | alt | ctrl-alt | ctrl-shift | ctrl-alt-shift | alt-shift
  // modiferKeys object's keys are sorted to match the above order
  const activeModifier = Object.keys(modifierKeys)
    .filter((key) => modifierKeys[key as keyof typeof modifierKeys])
    .join("-")

  return activeModifier === "" ? null : (activeModifier as ModifierKeys)
}

/**
 * This composable allows for the UI component to be disabled if the component in question is mounted
 */
export function useKeybindingDisabler() {
  // TODO: Move to a lock based system that keeps the bindings disabled until all locks are lifted
  const disableKeybindings = () => {
    keybindingsEnabled = false
  }

  const enableKeybindings = () => {
    keybindingsEnabled = true
  }

  return {
    disableKeybindings,
    enableKeybindings,
  }
}
