import { Extension } from "@codemirror/state"
import { foldGutter } from "@codemirror/fold"

export const baseThemeFoldStyle = foldGutter({
  openText: "▾",
  closedText: "▸",
})

export const baseTheme: Extension = [baseThemeFoldStyle]
