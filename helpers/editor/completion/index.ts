export type CompletionEntry = {
  text: string
  meta: string
  score: number
}

export type CompleterResult = {
  /**
   * List of completions to display
   */
  completions: CompletionEntry[]
  /**
   * Start of the completion position
   * (on completion the start..end region is replaced)
   */
  start: { line: number; ch: number }
  /**
   * End of the completion position
   * (on completion the start..end region is replaced)
   */
  end: { line: number; ch: number }
}

export type Completer = (
  /**
   * The contents of the editor
   */
  text: string,
  /**
   * Position where the completer is fired
   */
  completePos: { line: number; ch: number }
) => Promise<CompleterResult>
