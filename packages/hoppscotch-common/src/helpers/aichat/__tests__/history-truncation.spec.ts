import { describe, expect, it } from "vitest"
import { truncateForHistory } from "../history-truncation"

const OMITTED = (n: number) =>
  `\n[… ${n} more characters from this earlier message were omitted — ask the user to re-send them if needed]`

describe("truncateForHistory", () => {
  it("keeps the full cut when ordinary << and >> appear far apart", () => {
    const text = `const mask = 1 << 4;${"x".repeat(4_000)} >> end`
    const out = truncateForHistory(text, 4_000)

    expect(out.startsWith(text.slice(0, 4_000))).toBe(true)
    expect(out).toBe(`${text.slice(0, 4_000)}${OMITTED(text.length - 4_000)}`)
  })

  it("does not split a local reference token at the cut", () => {
    const token = "<<local-ref:abcd>>"
    const text = `${"a".repeat(3_990)}${token}${"b".repeat(100)}`
    const out = truncateForHistory(text, 4_000)

    expect(out.startsWith(text.slice(0, 3_990))).toBe(true)
    expect(out).not.toContain("<<local-ref:abc")
  })

  it("keeps a token that ends exactly at the cut", () => {
    const token = "<<local-ref:abcd>>"
    const text = `${"a".repeat(4_000 - token.length)}${token}${"b".repeat(100)}`
    const out = truncateForHistory(text, 4_000)

    expect(out.startsWith(text.slice(0, 4_000))).toBe(true)
  })

  it("returns text that already fits unchanged", () => {
    expect(truncateForHistory("short <<local-ref:abcd>> text", 4_000)).toBe(
      "short <<local-ref:abcd>> text"
    )
  })
})
