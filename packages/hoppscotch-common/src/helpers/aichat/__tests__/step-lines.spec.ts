import { describe, expect, it } from "vitest"
import { parseStepLines } from "../step-lines"

describe("parseStepLines", () => {
  it("maps each leading glyph to its kind and tone", () => {
    const steps = parseStepLines(
      [
        "✓ Set the method to `POST`.",
        "✅ Response: **200** · 12 ms · 1.2 KB",
        "⚠️ Collection **x** has no requests to run.",
        "❌ Network error — couldn't reach the server.",
        "▶ Running the request…",
        "⏱️ Still running — check the response panel for the result.",
        "■ Request cancelled.",
        "🌐 Switched the active environment to **prod**.",
        "📁 Created collection **fakestore**.",
        "🗂️ Opened a new tab.",
        "🗙 Closed the tab.",
        "💾 Saved the request.",
        "👥 Created team **acme** and switched to it.",
        "🏠 Switched to your personal workspace.",
        "✏️ Renamed team **a** to **b**.",
        "📝 Documented **Get products**.",
        "📖 Published the documentation for **fakestore**.",
        "🧪 Created mock server **fakestore-mock**.",
        "🔀 Switched the tab to **GraphQL**.",
        "🔌 Switched the interceptor to **Browser**.",
        "🔎 Loaded tools for documentation.",
        "📚 Shared the GraphQL schema with the assistant.",
      ].join("\n")
    )

    expect(steps.map((s) => [s.kind, s.tone])).toEqual([
      ["done", "accent"],
      ["verified", "success"],
      ["warn", "warning"],
      ["error", "error"],
      ["running", "pending"],
      ["waiting", "muted"],
      ["cancelled", "muted"],
      ["environment", "neutral"],
      ["collection", "neutral"],
      ["tab", "neutral"],
      ["closed", "neutral"],
      ["saved", "neutral"],
      ["team", "neutral"],
      ["personal", "neutral"],
      ["renamed", "neutral"],
      ["documented", "neutral"],
      ["published", "neutral"],
      ["mock", "neutral"],
      ["protocol", "neutral"],
      ["interceptor", "neutral"],
      ["tools", "muted"],
      ["context", "muted"],
    ])
    expect(steps[0].text).toBe("Set the method to `POST`.")
    expect(steps[4].text).toBe("Running the request…")
  })

  it("keeps continuation lines with the step that opened them", () => {
    const steps = parseStepLines(
      "✓ Updated 2 headers:\n- `a`: 1\n- `b`: 2\n📖 Published the docs.\n⚠️ Environment **prod** is attached."
    )
    expect(steps).toHaveLength(3)
    expect(steps[0].text).toBe("Updated 2 headers:\n- `a`: 1\n- `b`: 2")
    expect(steps[1].kind).toBe("published")
    expect(steps[2].kind).toBe("warn")
  })

  it("matches glyphs whether or not the presentation selector is present", () => {
    expect(parseStepLines("⚠ Plain warning")[0].kind).toBe("warn")
    expect(parseStepLines("⚠️ Selector warning")[0].kind).toBe("warn")
    expect(parseStepLines("🗂 Opened a new tab.")[0].kind).toBe("tab")
  })

  it("tells collection-property updates apart from tab actions", () => {
    expect(parseStepLines("🗂️ Updated **shop**: auth, headers.")[0].kind).toBe(
      "properties"
    )
    expect(parseStepLines("🗂️ Duplicated the current tab.")[0].kind).toBe("tab")
  })

  it("consumes only the leading glyph, leaving later emoji intact", () => {
    expect(
      parseStepLines("\u{1F4DD} Documented the \u26A0\uFE0F warning section")[0]
        .text
    ).toBe("Documented the \u26A0\uFE0F warning section")
  })

  it("does not split a fenced block whose inner line starts with a glyph", () => {
    const steps = parseStepLines("\u2713 Set the body:\n```\n\u2705 ok\n```")
    expect(steps).toHaveLength(1)
    expect(steps[0].text).toBe("Set the body:\n```\n\u2705 ok\n```")
  })

  it("handles a bare glyph and CRLF line endings", () => {
    expect(parseStepLines("\u26A0\uFE0F")).toEqual([
      { kind: "warn", tone: "warning", text: "" },
    ])
    const steps = parseStepLines("\u2713 One\r\n\u{1F4C1} Two")
    expect(steps.map((s) => s.kind)).toEqual(["done", "collection"])
    expect(steps[0].text).toBe("One")
  })

  it("gives a glyph-less reply its own step instead of the previous icon", () => {
    // executeToolCalls joins each tool reply with a blank line between them.
    const steps = parseStepLines(
      "\u2713 Set the URL to `x`.\n\nOpen a request tab first so I can run it."
    )
    expect(steps.map((s) => s.kind)).toEqual(["done", "note"])
    expect(steps[1].text).toBe("Open a request tab first so I can run it.")
  })

  it("still keeps a single reply's own continuation lines together", () => {
    const steps = parseStepLines(
      "\u2713 Updated 2 headers:\n- `a`: 1\n- `b`: 2\n\n\u{1F4C2} Opened **Get users** in a tab."
    )
    expect(steps.map((s) => s.kind)).toEqual(["done", "tab"])
    expect(steps[0].text).toBe("Updated 2 headers:\n- `a`: 1\n- `b`: 2")
  })

  it("maps the open-folder glyph that open_request emits", () => {
    const [step] = parseStepLines("\u{1F4C2} Opened **Get users** in a tab.")
    expect(step.kind).toBe("tab")
    expect(step.text).toBe("Opened **Get users** in a tab.")
  })

  it("keeps blank lines inside a fenced block as code", () => {
    const steps = parseStepLines("\u2713 Body:\n```\na\n\nb\n```")
    expect(steps).toHaveLength(1)
    expect(steps[0].text).toBe("Body:\n```\na\n\nb\n```")
  })

  it("only treats a glyph as a marker at the start of a line", () => {
    const steps = parseStepLines("Created it \u2713 already")
    expect(steps).toHaveLength(1)
    expect(steps[0].kind).toBe("note")
  })

  it("treats unmarked text as a note and drops leading blank lines", () => {
    const steps = parseStepLines(
      "\nRun isn't available on this page — open the REST workspace first."
    )
    expect(steps).toEqual([
      {
        kind: "note",
        tone: "muted",
        text: "Run isn't available on this page — open the REST workspace first.",
      },
    ])
    expect(parseStepLines("")).toEqual([])
  })
})
