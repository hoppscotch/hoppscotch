import { onBeforeUnmount, onMounted } from "vue"
import { HoppActionWithOptionalArgs, invokeAction } from "./actions"
import { isAppleDevice } from "./platformutils"
import {
  isCodeMirrorEditor,
  isDOMElement,
  isInShortcutsFlyout,
  isMonacoEditor,
  isTypableElement,
} from "./utils/dom"
import { getKernelMode } from "@hoppscotch/kernel"
import { listen } from "@tauri-apps/api/event"

/**
 * This variable keeps track whether keybindings are being accepted
 * true -> Keybindings are checked
 * false -> Key presses are ignored (Keybindings are not checked)
 */
let keybindingsEnabled = true

/**
 * Unlisten function for Tauri event
 */
let unlistenTauriEvent: (() => void) | null = null

/**
 * Alt is also regarded as macOS OPTION (⌥) key
 * Ctrl is also regarded as macOS COMMAND (⌘) key (NOTE: this differs from HTML Keyboard spec where COMMAND is Meta key!)
 */
type ModifierKeys =
  | "ctrl"
  | "alt"
  | "shift"
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
  | "right" | "/" | "?" | "." | "enter" | "tab" | "delete" | "backspace"
  | "[" | "]"
/* eslint-enable */

type ModifierBasedShortcutKey = `${ModifierKeys}-${Key}`
// Singular keybindings (these will be disabled when an input-ish area has been focused)
type SingleCharacterShortcutKey = `${Key}`

type ShortcutKey = ModifierBasedShortcutKey | SingleCharacterShortcutKey

// Base bindings available on all platforms
const baseBindings: {
  [_ in ShortcutKey]?: HoppActionWithOptionalArgs
} = {
  "ctrl-enter": "request.send-cancel",
  "ctrl-i": "request.reset",
  "ctrl-u": "request.share-request",
  "ctrl-s": "request-response.save",
  "ctrl-shift-s": "request.save-as",
  "alt-up": "request.method.next",
  "alt-down": "request.method.prev",
  "alt-g": "request.method.get",
  "alt-h": "request.method.head",
  "alt-p": "request.method.post",
  "alt-u": "request.method.put",
  "alt-x": "request.method.delete",
  "ctrl-k": "modals.search.toggle",
  "ctrl-/": "editor.comment-toggle",
  "shift-/": "modals.support.toggle",
  "ctrl-shift-/": "flyouts.keybinds.toggle",
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
  "ctrl-e": "response.save-as-example",
  "ctrl-shift-l": "editor.format",
  "ctrl-z": "editor.undo",
  "ctrl-y": "editor.redo",
  "ctrl-delete": "response.erase",
  "ctrl-backspace": "response.erase",
}

// Web-only bindings
const webBindings: {
  [_ in ShortcutKey]?: HoppActionWithOptionalArgs
} = {
  "ctrl-d": "tab.close-current",
}

// Desktop-only bindings
const desktopBindings: {
  [_ in ShortcutKey]?: HoppActionWithOptionalArgs
} = {
  "ctrl-w": "tab.close-current",
  "ctrl-t": "tab.open-new",
  "ctrl-alt-left": "tab.prev",
  "ctrl-alt-right": "tab.next",
  "ctrl-alt-0": "tab.switch-to-last",
  "ctrl-alt-9": "tab.switch-to-first",
  "ctrl-q": "app.quit",
  "ctrl-alt-u": "request.focus-url",
  "ctrl-alt-]": "tab.mru-switch",
  "ctrl-alt-[": "tab.mru-switch-reverse",
}

/**
 * Get bindings based on the current kernel mode
 */
function getActiveBindings(): typeof baseBindings {
  const kernelMode = getKernelMode()

  if (kernelMode === "desktop") {
    return {
      ...baseBindings,
      ...desktopBindings,
    }
  }

  return {
    ...baseBindings,
    ...webBindings,
  }
}

export const bindings = getActiveBindings()

/**
 * A composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function hookKeybindingsListener() {
  onMounted(async () => {
    // Use capture phase to intercept events before browser handles them
    document.addEventListener("keydown", handleKeyDown, true)

    // Listen for Tauri events (desktop only)
    if (getKernelMode() === "desktop") {
      try {
        unlistenTauriEvent = await listen(
          "hoppscotch_desktop_shortcut",
          (ev) => {
            console.info("Tauri shortcut ev", ev)
            handleTauriShortcut(ev.payload as string)
          }
        )
      } catch (error) {
        console.error("Failed to setup Tauri event listener:", error)
      }
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleKeyDown, true)

    if (unlistenTauriEvent) {
      unlistenTauriEvent()
      unlistenTauriEvent = null
    }
  })
}

function handleKeyDown(ev: KeyboardEvent) {
  // Do not check keybinds if the mode is disabled
  if (!keybindingsEnabled) return

  const binding = generateKeybindingString(ev)
  if (!binding) return

  const activeBindings = getActiveBindings()
  const boundAction = activeBindings[binding]

  // Special handling for Ctrl+D (tab close for web browsers)
  if (binding === "ctrl-d" && boundAction) {
    ev.preventDefault()
    ev.stopPropagation()
    ev.stopImmediatePropagation()

    if (boundAction) {
      invokeAction(boundAction, undefined, "keypress")
    }
    return
  }

  // Special handling for undo/redo - let CodeMirror and Monaco handle these in editors
  if (binding === "ctrl-z" || binding === "ctrl-y") {
    const target = ev.target
    if (
      isDOMElement(target) &&
      (isCodeMirrorEditor(target) ||
        isMonacoEditor(target) ||
        isTypableElement(target))
    ) {
      return
    }
  }

  // Special handling for comment toggle - let CodeMirror and Monaco handle this in editors
  if (binding === "ctrl-/") {
    const target = ev.target

    if (!isDOMElement(target)) return

    // Let editors handle it normally
    if (isCodeMirrorEditor(target) || isMonacoEditor(target)) return

    // If inside shortcuts flyout, always toggle it (even if focused on search input)
    // If not in editor or input, fall back to keybinds flyout
    const shouldToggle =
      isInShortcutsFlyout(target) || !isTypableElement(target)

    if (shouldToggle) {
      invokeAction("flyouts.keybinds.toggle", undefined, "keypress")
      ev.preventDefault()
      return
    }

    // If in a normal input field, let browser handle it
    return
  }

  // If no action is bound, do nothing
  if (!boundAction) return

  ev.preventDefault()
  invokeAction(boundAction, undefined, "keypress")
}

function handleTauriShortcut(shortcut: string) {
  console.info("Tauri shortcut:", shortcut)

  // Do not check keybinds if the mode is disabled
  if (!keybindingsEnabled) return

  const activeBindings = getActiveBindings()
  const boundAction = activeBindings[shortcut as ShortcutKey]
  if (!boundAction) return

  invokeAction(boundAction, undefined, "keypress")
}

function generateKeybindingString(ev: KeyboardEvent): ShortcutKey | null {
  const target = ev.target

  // We may or may not have a modifier key
  const modifierKey = getActiveModifier(ev)

  // We will always have a non-modifier key
  const key = getPressedKey(ev)
  if (!key) return null

  // All key combos backed by modifiers are valid shortcuts (whether currently typing or not)
  if (modifierKey) {
    // If the modifier is shift and the target is an input, we ignore
    if (
      modifierKey === "shift" &&
      isDOMElement(target) &&
      isTypableElement(target)
    ) {
      return null
    }

    // Restrict alt+up and alt+down when the target is a CodeMirror or Monaco editor
    if (
      modifierKey === "alt" &&
      (key === "up" || key === "down") &&
      (isCodeMirrorEditor(target) || isMonacoEditor(target))
    ) {
      return null
    }

    return `${modifierKey}-${key}`
  }

  // no modifier key here then we do not do anything while on input
  if (isDOMElement(target) && isTypableElement(target)) return null

  // single key while not input
  return `${key}`
}

function getPressedKey(ev: KeyboardEvent): Key | null {
  // Sometimes the property code is not available on the KeyboardEvent object
  const key = (ev.key ?? "").toLowerCase()

  // Check arrow keys
  if (key.startsWith("arrow")) {
    return key.slice(5) as Key
  }

  // Check for Tab key
  if (key === "tab") return "tab"

  // Check for Delete key
  if (key === "delete") return "delete"

  if (key === "backspace") return "backspace"

  // Check letter keys
  const isLetter = key.length === 1 && key >= "a" && key <= "z"
  if (isLetter) return key as Key

  // Check if number keys
  const isDigit = key.length === 1 && key >= "0" && key <= "9"
  if (isDigit) return key as Key

  // Check if slash, period or enter
  if (key === "/" || key === "." || key === "enter") return key

  if (key === "[" || key === "]") return key

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
