import { EditorView } from "@codemirror/view"
import { HighlightStyle, tags as t } from "@codemirror/highlight"
import { foldGutter } from "@codemirror/fold"

export const baseTheme = EditorView.theme({
  "&": {
    fontSize: "var(--body-font-size)",
  },
  ".cm-content": {
    caretColor: "var(--secondary-light-color)",
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--primary-color)",
  },
  ".cm-focused .cm-cursor": {
    borderLeftColor: "var(--secondary-light-color)",
  },
  ".cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content::selection, .cm-line::selection":
    {
      backgroundColor: "var(--accent-dark-color)!important",
      color: "var(--secondary-dark-color)",
    },
  ".cm-panels": {
    backgroundColor: "var(--primary-light-color)",
    color: "var(--secondary-light-color)",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid var(--divider-light-color)",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid var(--divider-light-color)",
  },
  ".cm-textfield": {
    backgroundColor: "var(--primary-dark-color)",
    color: "var(--secondary-light-color)",
  },
  ".cm-button": {
    backgroundColor: "var(--primary-dark-color)",
    color: "var(--secondary-light-color)",
    backgroundImage: "none",
    border: "none",
  },
  ".cm-activeLine": { backgroundColor: "var(--primary-light-color)" },
  ".cm-searchMatch": {
    backgroundColor: "var(--accent-light-color)",
    outline: "1px solid var(--accent-dark-color)",
  },
  ".cm-selectionMatch": { backgroundColor: "var(--accent-color)" },
  ".cm-focused .cm-matchingBracket, .cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "var(--accent-dark-color)",
    outline: "1px solid var(--accent-dark-color)",
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
    paddingLeft: "0.5em",
    paddingRight: "0.5em",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--primary-dark-color)",
  },
  ".cm-scroller::-webkit-scrollbar": {
    display: "none",
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
  { tag: [t.meta, t.comment], color: editorMetaColor },
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

export const baseFoldStyle = foldGutter({
  openText: "▾",
  closedText: "▸",
})
