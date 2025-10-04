import {
  EditorView,
  keymap,
  highlightSpecialChars,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  lineNumbers,
  highlightActiveLineGutter,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view"
import {
  HighlightStyle,
  defaultHighlightStyle,
  foldKeymap,
  foldGutter,
  codeFolding,
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
} from "@codemirror/language"
import { tags as t } from "@lezer/highlight"
import { Extension, EditorState } from "@codemirror/state"
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands"

import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete"
import {
  searchKeymap,
  highlightSelectionMatches,
  search,
} from "@codemirror/search"
import { lintKeymap } from "@codemirror/lint"

export const baseTheme = EditorView.theme({
  "&": {
    fontSize: "var(--font-size-body)",
    height: "100%",
    width: "100%",
    flex: "1",
  },
  ".cm-content": {
    caretColor: "var(--secondary-dark-color)",
    fontFamily: "var(--font-mono)",
    color: "var(--secondary-dark-color)",
    backgroundColor: "transparent",
    height: "100%",
  },
  ".cm-cursor": {
    borderColor: "var(--secondary-color)",
  },
  ".cm-widgetBuffer": {
    position: "absolute",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--accent-dark-color)",
    color: "var(--accent-contrast-color)",
    borderRadius: "2px",
    opacity: "0.4",
  },
  ".cm-panels": {
    backgroundColor: "var(--primary-light-color)",
    color: "var(--secondary-light-color)",
    zIndex: "1",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid var(--divider-light-color)",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid var(--divider-light-color)",
  },
  ".cm-search": {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    flexShrink: "0",
    overflow: "auto",
    padding: "0.25rem 0.5rem !important",
  },
  ".cm-search label": {
    display: "inline-flex",
    alignItems: "center",
  },
  ".cm-textfield": {
    backgroundColor: "var(--primary-color)",
    color: "var(--secondary-dark-color)",
    borderColor: "var(--divider-light-color)",
    borderRadius: "4px",
    fontSize: "var(--font-size-tiny)",
    fontWeight: "600",
    flexShrink: "0",
    border: "1px solid var(--divider-color)",
  },
  ".cm-button": {
    backgroundColor: "var(--primary-color)",
    color: "var(--secondary-light-color)",
    backgroundImage: "none",
    borderRadius: "4px",
    fontSize: "var(--font-size-tiny)",
    fontWeight: "600",
    textTransform: "capitalize",
    flexShrink: "0",
    border: "1px solid var(--divider-color)",
  },
  ".cm-completionLabel": {
    color: "var(--secondary-color)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--primary-dark-color)",
    color: "var(--secondary-light-color)",
    border: "none",
    borderRadius: "4px",
  },
  ".cm-tooltip-arrow": {
    color: "var(--tooltip-color)",
  },
  ".cm-tooltip-arrow:after": {
    borderTopColor: "currentColor !important",
  },
  ".cm-tooltip-arrow:before": {
    borderTopColor: "currentColor !important",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "var(--font-mono)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent-dark-color)",
    color: "var(--accent-contrast-color)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected] .cm-completionLabel": {
    color: "var(--accent-contrast-color)",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-searchMatch": {
    outline: "1px solid var(--accent-dark-color)",
    backgroundColor: "var(--divider-dark-color)",
    borderRadius: "2px",
  },
  ".cm-selectionMatch": {
    outline: "1px solid var(--accent-dark-color)",
    backgroundColor: "var(--divider-light-color)",
    borderRadius: "2px",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "var(--divider-color)",
    outline: "1px solid var(--accent-dark-color)",
    borderRadius: "2px",
  },
  ".cm-gutters": {
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--primary-color)",
    borderColor: "var(--divider-light-color)",
  },
  ".cm-lineNumbers": {
    minWidth: "3em",
    color: "var(--secondary-light-color)",
  },
  ".cm-foldGutter": {
    minWidth: "2em",
    color: "var(--secondary-light-color)",
  },
  ".cm-foldGutter .cm-gutterElement": {
    textAlign: "center",
  },
  ".cm-line": {
    paddingLeft: "0.5rem",
    paddingRight: "0.5rem",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--divider-light-color)",
    color: "var(--secondary-dark-color)",
    borderColor: "var(--divider-dark-color)",
  },
})

export const inputTheme = EditorView.theme({
  "&": {
    fontSize: "var(--font-size-body)",
    height: "100%",
    width: "100%",
    flex: "1",
  },
  ".cm-content": {
    caretColor: "var(--secondary-dark-color)",
    fontFamily: "var(--font-sans)",
    color: "var(--secondary-dark-color)",
    backgroundColor: "transparent",
    height: "100%",
  },
  ".cm-cursor": {
    borderColor: "var(--secondary-color)",
  },
  ".cm-widgetBuffer": {
    position: "absolute",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--accent-dark-color)",
    color: "var(--accent-contrast-color)",
    borderRadius: "2px",
  },
  ".cm-panels": {
    backgroundColor: "var(--primary-light-color)",
    color: "var(--secondary-light-color)",
    zIndex: "1",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid var(--divider-light-color)",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid var(--divider-light-color)",
  },
  ".cm-search": {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    flexShrink: "0",
    overflow: "auto",
    padding: "0.25rem 0.5rem !important",
  },
  ".cm-search label": {
    display: "inline-flex",
    alignItems: "center",
  },
  ".cm-textfield": {
    backgroundColor: "var(--primary-color)",
    color: "var(--secondary-dark-color)",
    borderColor: "var(--divider-light-color)",
    borderRadius: "4px",
    fontSize: "var(--font-size-tiny)",
    fontWeight: "600",
    flexShrink: "0",
    border: "1px solid var(--divider-color)",
  },
  ".cm-button": {
    backgroundColor: "var(--primary-color)",
    color: "var(--secondary-light-color)",
    backgroundImage: "none",
    borderRadius: "4px",
    fontSize: "var(--font-size-tiny)",
    fontWeight: "600",
    textTransform: "capitalize",
    flexShrink: "0",
    border: "1px solid var(--divider-color)",
  },
  ".cm-completionLabel": {
    color: "var(--secondary-color)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--primary-dark-color)",
    color: "var(--secondary-light-color)",
    border: "none",
    borderRadius: "4px",
  },
  ".cm-tooltip-arrow": {
    color: "var(--tooltip-color)",
  },
  ".cm-tooltip-arrow:after": {
    borderTopColor: "currentColor !important",
  },
  ".cm-tooltip-arrow:before": {
    borderTopColor: "currentColor !important",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "var(--font-mono)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent-dark-color)",
    color: "var(--accent-contrast-color)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected] .cm-completionLabel": {
    color: "var(--accent-contrast-color)",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-searchMatch": {
    outline: "1px solid var(--accent-dark-color)",
    backgroundColor: "var(--divider-dark-color)",
    borderRadius: "2px",
  },
  ".cm-selectionMatch": {
    outline: "1px solid var(--accent-dark-color)",
    backgroundColor: "var(--divider-light-color)",
    borderRadius: "2px",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "var(--divider-color)",
    outline: "1px solid var(--accent-dark-color)",
    borderRadius: "2px",
  },
  ".cm-gutters": {
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--primary-color)",
    borderColor: "var(--divider-light-color)",
  },
  ".cm-lineNumbers": {
    minWidth: "3em",
    color: "var(--secondary-light-color)",
  },
  ".cm-foldGutter": {
    minWidth: "2em",
    color: "var(--secondary-light-color)",
  },
  ".cm-foldGutter .cm-gutterElement": {
    textAlign: "center",
  },
  ".cm-line": {
    lineHeight: "1rem",
    paddingLeft: "1rem",
    paddingRight: "1rem",
    paddingTop: "0.25rem",
    paddingBottom: "0.25rem",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--divider-light-color)",
    color: "var(--secondary-dark-color)",
    borderColor: "var(--divider-dark-color)",
  },
  ".cm-jsonFoldSummary": {
    opacity: "0.7",
    fontStyle: "italic",
    background: "var(--divider-dark-color)",
  },
})

const editorTypeColor = "var(--editor-type-color)"
const editorNameColor = "var(--editor-name-color)"
const editorOperatorColor = "var(--editor-operator-color)"
const editorInvalidColor = "var(--editor-invalid-color)"
const editorSeparatorColor = "var(--editor-separator-color)"
const editorMetaColor = "var(--editor-meta-color)"
const editorVariableColor = "var(--editor-variable-color)"
const editorLinkColor = "var(--editor-link-color)"
const editorProcessColor = "var(--editor-process-color)"
const editorConstantColor = "var(--editor-constant-color)"
const editorKeywordColor = "var(--editor-keyword-color)"

export const baseHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: editorKeywordColor },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: editorNameColor,
  },
  {
    tag: [t.function(t.variableName), t.labelName],
    color: editorVariableColor,
  },
  {
    tag: [t.color, t.constant(t.name), t.standard(t.name)],
    color: editorConstantColor,
  },
  { tag: [t.definition(t.name), t.separator], color: editorSeparatorColor },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace,
    ],
    color: editorTypeColor,
  },
  {
    tag: [
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string),
    ],
    color: editorOperatorColor,
  },
  {
    tag: [t.meta, t.comment],
    color: editorMetaColor,
  },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: editorLinkColor, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: editorNameColor },
  {
    tag: [t.atom, t.bool, t.special(t.variableName)],
    color: editorConstantColor,
  },
  {
    tag: [t.processingInstruction, t.string, t.inserted],
    color: editorProcessColor,
  },
  { tag: t.invalid, color: editorInvalidColor },
])

/**
 * Generic body counter (array or object).
 *
 * @param body - String content inside `[...]` or `{...}`.
 * @param trigger - The character that indicates a top-level separator (`,` or `:`).
 * @param finalize - Function to adjust the final count (e.g., add +1 for arrays).
 */
function countBodyUnits(
  body: string,
  trigger: string,
  finalize: (count: number, sawContent: boolean) => number
): number {
  let inString = false
  let escape = false
  let bracketDepth = 0
  let braceDepth = 0
  let count = 0
  let sawContent = false

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]

    if (escape) {
      escape = false
      continue
    }
    if (ch === "\\") {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === "[") bracketDepth++
    else if (ch === "]") bracketDepth--
    else if (ch === "{") braceDepth++
    else if (ch === "}") braceDepth--

    if (!sawContent && !/\s/.test(ch)) sawContent = true

    if (ch === trigger && bracketDepth === 0 && braceDepth === 0) {
      count++
    }
  }

  return finalize(count, sawContent)
}

/**
 * Count the number of top-level items in an array body string.
 */
function countArrayItemsInBody(body: string): number {
  return countBodyUnits(body, ",", (count, sawContent) =>
    !sawContent ? 0 : count + 1
  )
}

/**
 * Count the number of top-level fields in an object body string.
 */
function countObjectFieldsInBody(body: string): number {
  return countBodyUnits(body, ":", (count) => count)
}

/**
 * Compute a fold summary string for a JSON range.
 *
 * @param state - Current editor state
 * @param from - Start position of the fold
 * @param to - End position of the fold
 */
function computeJsonSummary(
  state: EditorState,
  from: number,
  to: number
): string {
  const docLength = state.doc.length
  const sliceFrom = Math.max(0, from - 1)
  const sliceTo = Math.min(docLength, to + 1)
  const slice = state.sliceDoc(sliceFrom, sliceTo)

  // Indices relative to slice
  const textStart = from - sliceFrom
  const textEnd = textStart + (to - from)

  const text = slice.substring(textStart, textEnd).trim()
  const prevChar = from > 0 ? slice.charAt(textStart - 1) : ""
  const nextChar = textEnd < slice.length ? slice.charAt(textEnd) : ""

  // Try full JSON parse first (works if selection is a valid value)
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return `[ … ] (${parsed.length} items)`
    }
    if (parsed && typeof parsed === "object") {
      return `{ … } (${Object.keys(parsed).length} fields)`
    }
  } catch {
    // Not standalone JSON → fallback to counting
  }

  // Infer container type by surrounding characters
  if (prevChar === "[" || nextChar === "]") {
    return `[ … ] (${countArrayItemsInBody(text)} items)`
  }
  if (prevChar === "{" || nextChar === "}" || text.includes(":")) {
    return `{ … } (${countObjectFieldsInBody(text)} fields)`
  }

  return "…"
}

/**
 * Extension: JSON folding with informative summaries.
 */
export const jsonFoldSummary: Extension = codeFolding({
  preparePlaceholder: (state, range) =>
    computeJsonSummary(state, range.from, range.to),
  placeholderDOM: (view, onclick, prepared) => {
    const span = document.createElement("span")
    span.className = "cm-foldPlaceholder cm-jsonFoldSummary"
    span.textContent = typeof prepared === "string" ? prepared : "…"
    span.addEventListener("click", onclick)
    return span
  },
})

export const basicSetup: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter({
    openText: "▾",
    closedText: "▸",
  }),
  jsonFoldSummary,
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(baseHighlightStyle),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
  search({
    top: true,
  }),
]
