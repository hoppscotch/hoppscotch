import { Compartment } from "@codemirror/state"
import { Decoration, MatchDecorator, ViewPlugin } from "@codemirror/view"

const singleAndMultiLineCommentPattern = /\/\/.*$|\/\*[\s\S]*?\*\//gm

const checkComment = () => {
  return Decoration.mark({
    class: "cm-comment",
  })
}

const getMatchDecorator = () => {
  return new MatchDecorator({
    regexp: singleAndMultiLineCommentPattern,
    decoration: () => checkComment(),
  })
}

export const commentHighlightStyle = () => {
  const decorator = getMatchDecorator()
  return ViewPlugin.define(
    (view) => ({
      decorations: decorator.createDeco(view),
      update(u) {
        this.decorations = decorator.updateDeco(u, this.decorations)
      },
    }),
    {
      decorations: (v) => v.decorations,
    }
  )
}

export class HoppCommentPlugin {
  private compartment = new Compartment()

  get extension() {
    return this.compartment.of([commentHighlightStyle()])
  }
}
