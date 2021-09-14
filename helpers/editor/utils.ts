export function convertIndexToLineCh(
  text: string,
  i: number
): { line: number; ch: number } {
  const lines = text.split("\n")

  let line = 0
  let counter = 0

  while (line < lines.length) {
    if (i > lines[line].length + counter) {
      counter += lines[line].length + 1
      line++
    } else {
      return {
        line: line + 1,
        ch: i - counter + 1,
      }
    }
  }

  throw new Error("Invalid input")
}

export function convertLineChToIndex(
  text: string,
  lineCh: { line: number; ch: number }
): number {
  const textSplit = text.split("\n")

  if (textSplit.length < lineCh.line) throw new Error("Invalid position")

  const tillLineIndex = textSplit
    .slice(0, lineCh.line)
    .reduce((acc, line) => acc + line.length + 1, 0)

  return tillLineIndex + lineCh.ch
}
