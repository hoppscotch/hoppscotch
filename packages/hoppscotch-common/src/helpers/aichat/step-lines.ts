/**
 * Step lines produced by the chat service start with a glyph that says what
 * happened ("✓" edited, "⚠️" warned, "▶" running…). The transcript keeps the
 * glyphs — they survive copy/paste and history — while the UI swaps each one
 * for an icon. This module is the single place that knows that vocabulary.
 */

export type StepKind =
  | "done"
  | "verified"
  | "warn"
  | "error"
  | "running"
  | "waiting"
  | "cancelled"
  | "environment"
  | "collection"
  | "properties"
  | "tab"
  | "closed"
  | "saved"
  | "team"
  | "personal"
  | "renamed"
  | "documented"
  | "published"
  | "mock"
  | "protocol"
  | "interceptor"
  | "tools"
  | "context"
  | "note"

export type StepTone =
  "neutral" | "accent" | "success" | "warning" | "error" | "pending" | "muted"

export interface StepLine {
  kind: StepKind
  tone: StepTone
  /** The line without its glyph; may span several lines (lists, notes). */
  text: string
}

/** Leading glyph → what the line reports. Order matters only for prefixes. */
const GLYPHS: Array<[string, StepKind]> = [
  ["✓", "done"],
  ["✅", "verified"],
  ["⚠️", "warn"],
  ["❌", "error"],
  ["▶", "running"],
  ["⏱️", "waiting"],
  ["■", "cancelled"],
  ["🌐", "environment"],
  ["📁", "collection"],
  ["📂", "tab"],
  ["🗂️", "tab"],
  ["🗙", "closed"],
  ["💾", "saved"],
  ["👥", "team"],
  ["🏠", "personal"],
  ["✏️", "renamed"],
  ["📝", "documented"],
  ["📖", "published"],
  ["🧪", "mock"],
  ["🔀", "protocol"],
  ["🔌", "interceptor"],
  ["🔎", "tools"],
  ["📚", "context"],
]

// Emoji arrive with or without the U+FE0F presentation selector depending on
// where the string was typed — match on the base code points only.
const VARIATION_SELECTOR = /\uFE0F/g
const VARIATION_SELECTOR_CHAR = "\uFE0F"
const stripSelector = (value: string) => value.replace(VARIATION_SELECTOR, "")

const GLYPH_TABLE = GLYPHS.map(
  ([glyph, kind]) => [stripSelector(glyph), kind] as const
)

/** Opens or closes a fenced code block. */
const FENCE = /^\s*(?:```|~~~)/

const TONES: Record<StepKind, StepTone> = {
  done: "accent",
  verified: "success",
  warn: "warning",
  error: "error",
  running: "pending",
  waiting: "muted",
  cancelled: "muted",
  tools: "muted",
  context: "muted",
  note: "muted",
  environment: "neutral",
  collection: "neutral",
  properties: "neutral",
  tab: "neutral",
  closed: "neutral",
  saved: "neutral",
  team: "neutral",
  personal: "neutral",
  renamed: "neutral",
  documented: "neutral",
  published: "neutral",
  mock: "neutral",
  protocol: "neutral",
  interceptor: "neutral",
}

/** Splits a line into its reporting kind and the remaining text. */
const matchGlyph = (line: string): { kind: StepKind; text: string } | null => {
  for (const [glyph, kind] of GLYPH_TABLE) {
    if (!line.startsWith(glyph)) continue
    const rest = line.slice(glyph.length)
    const text = (
      rest.startsWith(VARIATION_SELECTOR_CHAR) ? rest.slice(1) : rest
    ).trimStart()
    // The tab glyph doubles as the collection-properties marker.
    if (kind === "tab" && /^Updated\b/.test(text)) {
      return { kind: "properties", text }
    }
    return { kind, text }
  }
  return null
}

/**
 * Parses one step message into its lines. A line starting with a known glyph
 * opens a new step; every other line (lists, blank spacers, follow-up notes)
 * belongs to the step before it, or opens an unmarked "note" step.
 */
export const parseStepLines = (content: string): StepLine[] => {
  const steps: StepLine[] = []
  let inFence = false
  let open: StepLine | null = null
  for (const raw of content.split("\n")) {
    if (FENCE.test(raw)) inFence = !inFence
    // Inside a fenced block a leading glyph is code, not a new step.
    const matched = inFence ? null : matchGlyph(raw)
    if (matched) {
      open = { ...matched, tone: TONES[matched.kind] }
      steps.push(open)
      continue
    }
    // A blank line separates one tool reply from the next, so it ends the step
    // rather than continuing it. Inside a fence it is just code.
    if (!inFence && !raw.trim()) {
      open = null
      continue
    }
    if (!open) {
      open = { kind: "note", tone: TONES.note, text: raw }
      steps.push(open)
      continue
    }
    open.text += `\n${raw}`
  }
  for (const step of steps) step.text = step.text.trimEnd()
  return steps
}
