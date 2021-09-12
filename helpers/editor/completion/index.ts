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
) => Promise<CompleterResult | null>
