import { EditorView } from "@codemirror/view"

const baseTheme = EditorView.theme({
  "&": {
    fontSize: "var(--body-font-size)",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--primary-color)",
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
})

export default baseTheme
