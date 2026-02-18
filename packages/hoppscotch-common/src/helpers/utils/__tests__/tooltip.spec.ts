import { describe, expect, test, beforeEach, afterEach } from "vitest"
import {
  truncateText,
  formatTooltipValue,
  calculateTooltipDimensions,
  applyTooltipOverflowStyles,
  createTooltipValueRow,
  constrainTooltipToViewport,
  TOOLTIP_MAX_VALUE_LENGTH,
  TOOLTIP_MAX_HEIGHT_PX,
  TOOLTIP_MAX_WIDTH_PX,
  TOOLTIP_MIN_WIDTH_PX,
  TOOLTIP_VIEWPORT_MARGIN_PX,
} from "../tooltip"

// ─── truncateText ────────────────────────────────────────────────

describe("truncateText", () => {
  test("returns original string when within default max length", () => {
    const short = "hello world"
    expect(truncateText(short)).toBe(short)
  })

  test("returns original string when exactly at max length", () => {
    const exact = "a".repeat(TOOLTIP_MAX_VALUE_LENGTH)
    expect(truncateText(exact)).toBe(exact)
  })

  test("truncates string exceeding default max length and appends char count", () => {
    const long = "x".repeat(TOOLTIP_MAX_VALUE_LENGTH + 50)
    const result = truncateText(long)
    expect(result.length).toBeLessThan(long.length)
    expect(result).toContain("\u2026")
    expect(result).toContain(`${long.length} chars)`)
  })

  test("truncates string with custom max length", () => {
    const text = "abcdefghij"
    const result = truncateText(text, 5)
    expect(result).toBe("abcde\u2026 (truncated, 10 chars)")
  })

  test("returns empty string for null input", () => {
    expect(truncateText(null as unknown as string)).toBe("")
  })

  test("returns empty string for undefined input", () => {
    expect(truncateText(undefined as unknown as string)).toBe("")
  })

  test("returns empty string for empty string input", () => {
    expect(truncateText("")).toBe("")
  })

  test("handles maxLength of 0 by truncating everything", () => {
    const result = truncateText("abc", 0)
    expect(result).toContain("\u2026")
    expect(result).toContain("3 chars)")
  })

  test("handles maxLength of 1", () => {
    const result = truncateText("abc", 1)
    expect(result).toBe("a\u2026 (truncated, 3 chars)")
  })

  test("preserves unicode characters during truncation", () => {
    const emoji = "\u{1F600}".repeat(10)
    const result = truncateText(emoji, 3)
    expect(result).toContain("\u2026")
  })

  test("handles very long strings (10000+ chars) without error", () => {
    const veryLong = "z".repeat(10000)
    const result = truncateText(veryLong, 100)
    expect(result.startsWith("z".repeat(100))).toBe(true)
    expect(result).toContain("10000 chars)")
  })
})

// ─── formatTooltipValue ──────────────────────────────────────────

describe("formatTooltipValue", () => {
  test("returns empty string for undefined", () => {
    expect(formatTooltipValue(undefined)).toBe("")
  })

  test("returns empty string for null", () => {
    expect(formatTooltipValue(null)).toBe("")
  })

  test("returns 'Empty' for empty string", () => {
    expect(formatTooltipValue("")).toBe("Empty")
  })

  test("returns original value for short strings", () => {
    expect(formatTooltipValue("my-value")).toBe("my-value")
  })

  test("truncates long values", () => {
    const longValue = "v".repeat(600)
    const result = formatTooltipValue(longValue)
    expect(result).toContain("\u2026")
    expect(result).toContain("600 chars)")
  })

  test("respects custom maxLength parameter", () => {
    const result = formatTooltipValue("abcdef", 3)
    expect(result).toBe("abc\u2026 (truncated, 6 chars)")
  })

  test("does not truncate when value equals maxLength", () => {
    const result = formatTooltipValue("abc", 3)
    expect(result).toBe("abc")
  })
})

// ─── calculateTooltipDimensions ──────────────────────────────────

describe("calculateTooltipDimensions", () => {
  test("returns max width capped at TOOLTIP_MAX_WIDTH_PX for large viewports", () => {
    const { maxWidth } = calculateTooltipDimensions(1920, 1080)
    expect(maxWidth).toBe(TOOLTIP_MAX_WIDTH_PX)
  })

  test("returns viewport-based width for small viewports", () => {
    const viewportWidth = 300
    const margin = TOOLTIP_VIEWPORT_MARGIN_PX
    const { maxWidth } = calculateTooltipDimensions(viewportWidth, 600)
    // effectiveWidth = 300 - 16*2 = 268, which is between MIN and MAX
    expect(maxWidth).toBe(viewportWidth - margin * 2)
  })

  test("ensures minimum width for very small viewports", () => {
    const { maxWidth } = calculateTooltipDimensions(100, 100)
    expect(maxWidth).toBe(68)
  })

  test("respects custom margin", () => {
    const customMargin = 50
    const { maxWidth } = calculateTooltipDimensions(400, 600, customMargin)
    // effectiveWidth = 400 - 100 = 300
    expect(maxWidth).toBe(300)
  })

  test("caps maxHeight at TOOLTIP_MAX_HEIGHT_PX", () => {
    const { maxHeight } = calculateTooltipDimensions(1920, 1080)
    expect(maxHeight).toBe(TOOLTIP_MAX_HEIGHT_PX)
  })

  test("uses available height when viewport is small", () => {
    const { maxHeight } = calculateTooltipDimensions(1920, 200)
    // effectiveHeight = 200 - 32 = 168
    expect(maxHeight).toBe(168)
  })

  test("handles zero dimensions gracefully", () => {
    const dims = calculateTooltipDimensions(0, 0)
    expect(dims.maxWidth).toBe(0)
    expect(dims.maxHeight).toBeLessThanOrEqual(300)
  })
})

// ─── applyTooltipOverflowStyles ──────────────────────────────────

describe("applyTooltipOverflowStyles", () => {
  let element: HTMLElement

  beforeEach(() => {
    element = document.createElement("div")
  })

  test("sets maxWidth to default TOOLTIP_MAX_WIDTH_PX when not specified", () => {
    applyTooltipOverflowStyles(element)
    expect(element.style.maxWidth).toBe(`${TOOLTIP_MAX_WIDTH_PX}px`)
  })

  test("sets maxWidth to custom value", () => {
    applyTooltipOverflowStyles(element, 300)
    expect(element.style.maxWidth).toBe("300px")
  })

  test("sets minWidth to TOOLTIP_MIN_WIDTH_PX when maxWidth allows", () => {
    applyTooltipOverflowStyles(element)
    expect(element.style.minWidth).toBe(`${TOOLTIP_MIN_WIDTH_PX}px`)
  })

  test("clamps minWidth to maxWidth on narrow viewports", () => {
    applyTooltipOverflowStyles(element, 68)
    expect(element.style.minWidth).toBe("68px")
  })

  test("sets boxSizing to border-box", () => {
    applyTooltipOverflowStyles(element)
    expect(element.style.boxSizing).toBe("border-box")
  })

  test("sets maxHeight when provided", () => {
    applyTooltipOverflowStyles(element, undefined, 250)
    expect(element.style.maxHeight).toBe("250px")
  })

  test("does not set maxHeight when undefined", () => {
    applyTooltipOverflowStyles(element)
    expect(element.style.maxHeight).toBe("")
  })
})

// ─── createTooltipValueRow ───────────────────────────────────────

describe("createTooltipValueRow", () => {
  test("creates a div element", () => {
    const row = createTooltipValueRow("Initial", "test-value")
    expect(row.tagName).toBe("DIV")
  })

  test("contains a label element with correct text", () => {
    const row = createTooltipValueRow("Initial", "test-value")
    const label = row.querySelector("div")
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe("Initial")
  })

  test("contains a value element with correct text", () => {
    const row = createTooltipValueRow("Current", "my-value")
    const value = row.querySelector("span")
    expect(value).not.toBeNull()
    expect(value!.textContent).toBe("my-value")
  })

  test("truncates long values", () => {
    const longValue = "a".repeat(600)
    const row = createTooltipValueRow("Initial", longValue)
    const value = row.querySelector("span")
    expect(value!.textContent).toContain("\u2026")
    expect(value!.textContent).toContain("600 chars)")
  })

  test("shows 'Empty' for empty string value", () => {
    const row = createTooltipValueRow("Current", "")
    const value = row.querySelector("span")
    expect(value!.textContent).toBe("Empty")
  })

  test("shows empty string for undefined value", () => {
    const row = createTooltipValueRow("Initial", undefined)
    const value = row.querySelector("span")
    expect(value!.textContent).toBe("")
  })

  test("shows empty string for null value", () => {
    const row = createTooltipValueRow("Current", null)
    const value = row.querySelector("span")
    expect(value!.textContent).toBe("")
  })

  test("applies env-tooltip-value class to the value element", () => {
    const row = createTooltipValueRow("Initial", "test")
    const value = row.querySelector(".env-tooltip-value")
    expect(value).not.toBeNull()
  })

  test("sets title attribute when value is truncated", () => {
    const longValue = "b".repeat(600)
    const row = createTooltipValueRow("Initial", longValue, 100)
    const value = row.querySelector("span")
    expect(value!.title).toContain("600 characters")
  })

  test("does not set title attribute when value is not truncated", () => {
    const row = createTooltipValueRow("Initial", "short")
    const value = row.querySelector("span")
    expect(value!.title).toBe("")
  })

  test("label has flexShrink 0 so it does not compress", () => {
    const row = createTooltipValueRow("Initial", "value")
    const label = row.querySelector("div")
    expect(label!.style.flexShrink).toBe("0")
  })

  test("row has width 100%", () => {
    const row = createTooltipValueRow("Current", "value")
    expect(row.style.width).toBe("100%")
  })

  test("respects custom maxValueLength parameter", () => {
    const result = createTooltipValueRow("Initial", "abcdefghij", 5)
    const value = result.querySelector("span")
    expect(value!.textContent).toContain("\u2026")
  })

  test("applies env-tooltip-value class for overflow styles", () => {
    const row = createTooltipValueRow("Initial", "test")
    const value = row.querySelector("span")
    expect(value!.classList.contains("env-tooltip-value")).toBe(true)
  })
})

// ─── constrainTooltipToViewport ──────────────────────────────────

describe("constrainTooltipToViewport", () => {
  let tooltipBox: HTMLElement
  let tooltipContent: HTMLElement
  let originalInnerWidth: number
  let originalInnerHeight: number

  beforeEach(() => {
    tooltipBox = document.createElement("div")
    tooltipContent = document.createElement("div")

    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight

    // jsdom has window.innerWidth and innerHeight set to 0 by default
    // We mock them for consistent test results
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
  })

  test("sets maxWidth on tooltipBox", () => {
    constrainTooltipToViewport(tooltipBox, tooltipContent)
    expect(tooltipBox.style.maxWidth).not.toBe("")
  })

  test("sets minWidth on tooltipBox", () => {
    constrainTooltipToViewport(tooltipBox, tooltipContent)
    expect(tooltipBox.style.minWidth).toBe(`${TOOLTIP_MIN_WIDTH_PX}px`)
  })

  test("sets maxWidth 100% on tooltipContent", () => {
    constrainTooltipToViewport(tooltipBox, tooltipContent)
    expect(tooltipContent.style.maxWidth).toBe("100%")
  })

  test("sets overflow hidden on tooltipContent", () => {
    constrainTooltipToViewport(tooltipBox, tooltipContent)
    expect(tooltipContent.style.overflow).toBe("hidden")
  })

  test("sets boxSizing on tooltipContent", () => {
    constrainTooltipToViewport(tooltipBox, tooltipContent)
    expect(tooltipContent.style.boxSizing).toBe("border-box")
  })

  test("works with small viewport", () => {
    Object.defineProperty(window, "innerWidth", { value: 250 })
    Object.defineProperty(window, "innerHeight", { value: 200 })
    constrainTooltipToViewport(tooltipBox, tooltipContent)
    // Should use minimum width since viewport is too small
    expect(parseInt(tooltipBox.style.maxWidth)).toBeLessThanOrEqual(
      TOOLTIP_MAX_WIDTH_PX
    )
  })
})

// ─── Constants ───────────────────────────────────────────────────

describe("Tooltip Constants", () => {
  test("TOOLTIP_MAX_VALUE_LENGTH is a positive number", () => {
    expect(TOOLTIP_MAX_VALUE_LENGTH).toBeGreaterThan(0)
  })

  test("TOOLTIP_MAX_WIDTH_PX is a positive number", () => {
    expect(TOOLTIP_MAX_WIDTH_PX).toBeGreaterThan(0)
  })

  test("TOOLTIP_MIN_WIDTH_PX is less than TOOLTIP_MAX_WIDTH_PX", () => {
    expect(TOOLTIP_MIN_WIDTH_PX).toBeLessThan(TOOLTIP_MAX_WIDTH_PX)
  })

  test("TOOLTIP_MIN_WIDTH_PX is a positive number", () => {
    expect(TOOLTIP_MIN_WIDTH_PX).toBeGreaterThan(0)
  })

  test("TOOLTIP_VIEWPORT_MARGIN_PX is a positive number", () => {
    expect(TOOLTIP_VIEWPORT_MARGIN_PX).toBeGreaterThan(0)
  })
})
