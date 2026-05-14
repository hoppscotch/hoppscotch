import type { DesktopSettings } from "~/platform/desktop-settings"

/**
 * Web-safe holder for the keyboard layout strategy.
 *
 * The desktop settings composable is the only writer: it calls
 * `setKeyboardLayoutStrategy` after the initial settings load and from
 * its store-watch callback when the user changes the radio. Keeping
 * the holder out of the composable lets `keybindings.ts` read the
 * strategy without pulling in Tauri-only imports, so the same
 * `getPressedKey` works on web builds where Tauri isn't available.
 *
 * The default `"hybrid"` matches the schema default, so a keypress
 * before the composable finishes loading still resolves through the
 * recommended strategy.
 */

export type KeyboardLayoutStrategy = DesktopSettings["keyboardLayoutStrategy"]

let currentStrategy: KeyboardLayoutStrategy = "hybrid"

export function getKeyboardLayoutStrategy(): KeyboardLayoutStrategy {
  return currentStrategy
}

export function setKeyboardLayoutStrategy(
  strategy: KeyboardLayoutStrategy
): void {
  currentStrategy = strategy
}
