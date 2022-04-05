import { EditorView } from "@codemirror/view"

const WrappedLineIndenter = EditorView.updateListener.of((update) => {
  const view = update.view
  const charWidth = view.defaultCharacterWidth
  const lineHeight = view.defaultLineHeight
  const basePadding = 10

  view.viewportLines((line) => {
    const domAtPos = view.domAtPos(line.from)

    const lineCount = (line.bottom - line.top) / lineHeight

    if (lineCount <= 1) return

    const belowPadding = basePadding * charWidth

    const node = domAtPos.node as HTMLElement
    node.style.textIndent = `-${belowPadding - charWidth + 1}px`
    node.style.paddingLeft = `${belowPadding}px`
  })
})

export const IndentedLineWrapPlugin = [
  EditorView.lineWrapping,
  WrappedLineIndenter,
]
