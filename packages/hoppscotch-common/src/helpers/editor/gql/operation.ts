import { EditorState, Range } from "@codemirror/state"
import { Decoration, ViewPlugin } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"

function getOperationDefsPosInEditor(state: EditorState) {
  const tree = syntaxTree(state)

  const defs: Array<{ from: number; to: number }> = []

  tree.iterate({
    enter({ name, from, to }) {
      if (name === "OperationDefinition") {
        defs.push({ from, to })
      }
    },
  })

  return defs
}

function generateSelectedOpDecors(state: EditorState) {
  const selectedPos = state.selection.main.head // Cursor Pos

  const defsPositions = getOperationDefsPosInEditor(state)

  if (defsPositions.length === 1) return Decoration.none

  const decors = defsPositions
    .map(({ from, to }) => ({
      selected: selectedPos >= from && selectedPos <= to,
      from,
      to,
    }))
    .map((info) => ({
      ...info,
      decor: Decoration.mark({
        class: info.selected
          ? "gql-operation-highlight"
          : "gql-operation-not-highlight",
        inclusive: true,
      }),
    }))
    .map(({ from, to, decor }) => <Range<Decoration>>{ from, to, value: decor }) // Convert to Range<Decoration> (Range from "@codemirror/view")

  return Decoration.set(decors)
}

export const selectedGQLOpHighlight = ViewPlugin.define(
  (view) => ({
    decorations: generateSelectedOpDecors(view.state),
    update(u) {
      this.decorations = generateSelectedOpDecors(u.state)
    },
  }),
  {
    decorations: (v) => v.decorations,
  }
)
