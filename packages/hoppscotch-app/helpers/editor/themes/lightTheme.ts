import { EditorView } from "@codemirror/view"
import { Extension } from "@codemirror/state"
import { HighlightStyle, tags as t } from "@codemirror/highlight"

const chalky = "#e5c07b"
const coral = "#e06c75"
const cyan = "#56b6c2"
const invalid = "#ffffff"
const ivory = "#abb2bf"
const stone = "#7d8799"
const malibu = "#61afef"
const sage = "#98c379"
const whiskey = "#d19a66"
const violet = "#c678dd"

export const lightTheme = EditorView.theme(
  {
    "&": {
      fontSize: "var(--body-font-size)",
    },
    ".cm-content": {
      caretColor: "var(--secondary-light-color)",
      fontFamily: "var(--font-mono)",
      backgroundColor: "var(--primary-color)",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--secondary-light-color)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "var(--primary-light-color)" },
    ".cm-panels": {
      backgroundColor: "var(--primary-dark-color)",
      color: "var(--secondary-light-color)",
    },
    ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
    ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },

    ".cm-activeLine": { backgroundColor: "var(--primary-light-color)" },
    ".cm-searchMatch": {
      backgroundColor: "#72a1ff59",
      outline: "1px solid #457dff",
    },
    ".cm-selectionMatch": { backgroundColor: "#aafe661a" },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#bad0f847",
      outline: "1px solid #515a6b",
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
  },
  { dark: false }
)

export const lightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: violet },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: coral,
  },
  { tag: [t.function(t.variableName), t.labelName], color: malibu },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey },
  { tag: [t.definition(t.name), t.separator], color: ivory },
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
    color: chalky,
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
    color: cyan,
  },
  { tag: [t.meta, t.comment], color: stone },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: stone, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: coral },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: whiskey },
  { tag: [t.processingInstruction, t.string, t.inserted], color: sage },
  { tag: t.invalid, color: invalid },
])

export const lightMode: Extension = [lightHighlightStyle, lightHighlightStyle]
