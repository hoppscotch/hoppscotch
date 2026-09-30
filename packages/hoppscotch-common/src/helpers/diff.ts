export interface DiffLine {
  lineNum?: number
  text: string
  type: "added" | "removed" | "unchanged" | "empty"
}

/**
 * Computes an aligned side-by-side line diff between textALines and textBLines
 * using an LCS dynamic programming algorithm.
 */
export function computeLineDiff(textALines: string[], textBLines: string[]) {
  const n = textALines.length
  const m = textBLines.length

  if (n === m && textALines.every((line, idx) => line === textBLines[idx])) {
    const leftLines: DiffLine[] = textALines.map((line, idx) => ({
      lineNum: idx + 1,
      text: line,
      type: "unchanged",
    }))
    const rightLines: DiffLine[] = textBLines.map((line, idx) => ({
      lineNum: idx + 1,
      text: line,
      type: "unchanged",
    }))
    return { leftLines, rightLines }
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  )

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (textALines[i] === textBLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j])
      }
    }
  }

  let i = n
  let j = m
  type Edit =
    | { type: "unchanged"; lineA: number; lineB: number; text: string }
    | { type: "removed"; lineA: number; text: string }
    | { type: "added"; lineB: number; text: string }

  const rawEdits: Edit[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && textALines[i - 1] === textBLines[j - 1]) {
      rawEdits.push({
        type: "unchanged",
        lineA: i,
        lineB: j,
        text: textALines[i - 1],
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawEdits.push({ type: "added", lineB: j, text: textBLines[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawEdits.push({ type: "removed", lineA: i, text: textALines[i - 1] })
      i--
    }
  }
  rawEdits.reverse()

  const leftLines: DiffLine[] = []
  const rightLines: DiffLine[] = []

  let idx = 0
  while (idx < rawEdits.length) {
    const edit = rawEdits[idx]
    if (edit.type === "unchanged") {
      leftLines.push({
        lineNum: edit.lineA,
        text: edit.text,
        type: "unchanged",
      })
      rightLines.push({
        lineNum: edit.lineB,
        text: edit.text,
        type: "unchanged",
      })
      idx++
    } else {
      const removedBlock: { lineA: number; text: string }[] = []
      const addedBlock: { lineB: number; text: string }[] = []
      while (idx < rawEdits.length && rawEdits[idx].type !== "unchanged") {
        if (rawEdits[idx].type === "removed") {
          const e = rawEdits[idx] as {
            type: "removed"
            lineA: number
            text: string
          }
          removedBlock.push(e)
        } else if (rawEdits[idx].type === "added") {
          const e = rawEdits[idx] as {
            type: "added"
            lineB: number
            text: string
          }
          addedBlock.push(e)
        }
        idx++
      }
      const blockMax = Math.max(removedBlock.length, addedBlock.length)
      for (let b = 0; b < blockMax; b++) {
        if (b < removedBlock.length) {
          leftLines.push({
            lineNum: removedBlock[b].lineA,
            text: removedBlock[b].text,
            type: "removed",
          })
        } else {
          leftLines.push({ text: "", type: "empty" })
        }
        if (b < addedBlock.length) {
          rightLines.push({
            lineNum: addedBlock[b].lineB,
            text: addedBlock[b].text,
            type: "added",
          })
        } else {
          rightLines.push({ text: "", type: "empty" })
        }
      }
    }
  }

  return { leftLines, rightLines }
}

/**
 * Accurately measures UTF-8 byte length for any string, handling non-ASCII text.
 */
export function getUtf8ByteSize(str: string): number {
  return new TextEncoder().encode(str).length
}
