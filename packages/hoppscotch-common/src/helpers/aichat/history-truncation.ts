/**
 * Placement of a history cut inside a longer message: keep the budget, but
 * never split a surrogate pair or a `<<local-ref:…>>`-style placeholder.
 */

/**
 * Reference placeholders: `<<name>>`, `<<$fn>>`, `<<local-ref:id>>` — the same
 * shapes the redaction layer treats as opaque to the model.
 */
const REFERENCE_TOKEN =
  /<<(?:local-ref:[A-Za-z0-9_-]+|\$?[A-Za-z][A-Za-z0-9_.-]*|_[A-Za-z0-9_.-]*)>>/g

/**
 * Moves a cut index off the middle of a surrogate pair: a lone surrogate makes
 * the provider reject the whole request body.
 */
const surrogateSafeCut = (text: string, cut: number): number => {
  const code = text.charCodeAt(cut - 1)
  return code >= 0xd800 && code <= 0xdbff ? cut - 1 : cut
}

/** A cut at or before `max` that splits no reference placeholder. */
const refSafeCut = (text: string, max: number): number => {
  let cut = max
  // `<<` / `>>` as ordinary text (a bitshift, a heredoc) is not a placeholder:
  // only a real token that straddles the cut moves it.
  for (const match of text.matchAll(REFERENCE_TOKEN)) {
    const start = match.index ?? 0
    if (start >= cut) break
    if (start + match[0].length > cut) {
      cut = start
      break
    }
  }
  return surrogateSafeCut(text, cut)
}

/** Cuts `text` at `max` without splitting a reference placeholder. */
export const truncateForHistory = (text: string, max: number): string => {
  if (text.length <= max) return text
  const cut = refSafeCut(text, max)
  return `${text.slice(0, cut)}\n[… ${text.length - cut} more characters from this earlier message were omitted — ask the user to re-send them if needed]`
}
