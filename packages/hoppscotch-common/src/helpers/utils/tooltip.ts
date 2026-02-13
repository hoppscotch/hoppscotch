/**
 * Utility functions for tooltip text truncation, formatting, and
 * viewport-constrained positioning. These helpers ensure that long
 * variable values displayed in editor hover tooltips stay within
 * the visible viewport boundaries.
 *
 * @module tooltip
 */

/** Default maximum character length before a tooltip value is truncated. */
export const TOOLTIP_MAX_VALUE_LENGTH = 500

/** Default maximum pixel width for the tooltip container. */
export const TOOLTIP_MAX_WIDTH_PX = 450

/** Minimum pixel width for the tooltip container. */
export const TOOLTIP_MIN_WIDTH_PX = 200

/** Viewport margin in pixels — the tooltip will stay this far from edges. */
export const TOOLTIP_VIEWPORT_MARGIN_PX = 16

/**
 * Truncates a string to a maximum length and appends an ellipsis
 * indicator when the text exceeds the limit.
 *
 * @param text - The input string to potentially truncate
 * @param maxLength - The maximum number of characters to keep
 *                    (defaults to TOOLTIP_MAX_VALUE_LENGTH)
 * @returns The original string if within limits, or a truncated version
 *          with a trailing ellipsis and character-count annotation
 *
 * @example
 * ```ts
 * truncateText("short")           // "short"
 * truncateText("a".repeat(600))   // "aaa...aaa (600 chars)"
 * truncateText("abc", 2)          // "ab... (3 chars)"
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number = TOOLTIP_MAX_VALUE_LENGTH
): string {
  if (!text || text.length <= maxLength) {
    return text ?? ""
  }

  // Show the beginning of the text plus a count so the user knows
  // the full length of the value.
  const truncated = text.slice(0, maxLength)
  return `${truncated}\u2026 (${text.length} chars)`
}

/**
 * Formats a variable value for display inside a tooltip.
 * Handles null/undefined/empty cases and applies truncation.
 *
 * @param value - The raw variable value
 * @param maxLength - Optional max character length
 * @returns A human-readable display string
 */
export function formatTooltipValue(
  value: string | undefined | null,
  maxLength: number = TOOLTIP_MAX_VALUE_LENGTH
): string {
  if (value === undefined || value === null) {
    return ""
  }

  if (value === "") {
    return "Empty"
  }

  return truncateText(value, maxLength)
}

/**
 * Determines whether a string value is considered "long" enough to
 * warrant special overflow handling in the tooltip.
 *
 * @param value - The string to evaluate
 * @param threshold - Character count threshold (defaults to 80)
 * @returns true when the value exceeds the threshold
 */
export function isLongValue(value: string | undefined | null, threshold: number = 80): boolean {
  if (!value) {
    return false
  }
  return value.length > threshold
}

/**
 * Calculates appropriate tooltip dimensions so the tooltip stays
 * within the visible viewport.
 *
 * @param viewportWidth - Current viewport width in pixels
 * @param viewportHeight - Current viewport height in pixels
 * @param margin - Margin from viewport edges (defaults to TOOLTIP_VIEWPORT_MARGIN_PX)
 * @returns An object with maxWidth and maxHeight constraints in pixels
 */
export function calculateTooltipDimensions(
  viewportWidth: number,
  viewportHeight: number,
  margin: number = TOOLTIP_VIEWPORT_MARGIN_PX
): { maxWidth: number; maxHeight: number } {
  const effectiveWidth = viewportWidth - margin * 2
  const effectiveHeight = viewportHeight - margin * 2

  const maxWidth = Math.min(
    Math.max(effectiveWidth, TOOLTIP_MIN_WIDTH_PX),
    TOOLTIP_MAX_WIDTH_PX
  )

  const maxHeight = Math.min(effectiveHeight, 300)

  return { maxWidth, maxHeight }
}

/**
 * Applies overflow-safe styles to a tooltip DOM element so that its
 * content is constrained to the viewport. This mutates the element
 * in-place by setting inline styles.
 *
 * @param element - The tooltip DOM element to constrain
 * @param maxWidth - Maximum width in pixels (or undefined to use default)
 * @param maxHeight - Maximum height in pixels (or undefined to skip)
 */
export function applyTooltipOverflowStyles(
  element: HTMLElement,
  maxWidth?: number,
  maxHeight?: number
): void {
  const resolvedMaxWidth = maxWidth ?? TOOLTIP_MAX_WIDTH_PX

  element.style.maxWidth = `${resolvedMaxWidth}px`
  element.style.minWidth = `${TOOLTIP_MIN_WIDTH_PX}px`
  element.style.boxSizing = "border-box"

  if (maxHeight !== undefined) {
    element.style.maxHeight = `${maxHeight}px`
  }
}

/**
 * Applies word-wrapping and text-overflow styles to a value display
 * element so long strings break properly within the tooltip.
 *
 * @param element - The span/div element showing the value text
 */
export function applyValueTextStyles(element: HTMLElement): void {
  element.style.overflowWrap = "break-word"
  element.style.wordBreak = "break-all"
  element.style.whiteSpace = "pre-wrap"
  element.style.overflow = "hidden"
  element.style.display = "inline-block"
  element.style.maxWidth = "100%"
  element.style.verticalAlign = "top"
}

/**
 * Creates a fully styled value row for the tooltip, including
 * a label (e.g., "Initial" or "Current") and a value element
 * with proper overflow handling.
 *
 * @param label - The label text (e.g., "Initial", "Current", "Value")
 * @param value - The raw value string to display
 * @param maxValueLength - Maximum characters before truncation
 * @returns An object containing the row container element
 */
export function createTooltipValueRow(
  label: string,
  value: string | undefined | null,
  maxValueLength: number = TOOLTIP_MAX_VALUE_LENGTH
): HTMLDivElement {
  const row = document.createElement("div")
  row.className = "flex items-start space-x-2"
  row.style.width = "100%"

  const labelEl = document.createElement("div")
  labelEl.textContent = label
  labelEl.className = "font-bold"
  labelEl.style.flexShrink = "0"
  labelEl.style.minWidth = "50px"
  labelEl.style.marginRight = label === "Initial" ? "1rem" : "0.375rem"

  const valueEl = document.createElement("span")
  valueEl.className = "env-tooltip-value"
  const displayValue = formatTooltipValue(value, maxValueLength)
  valueEl.textContent = displayValue

  applyValueTextStyles(valueEl)

  // Add a title attribute with the truncated indicator so users
  // know the full length if it was truncated
  if (value && value.length > maxValueLength) {
    valueEl.title = `Full value: ${value.length} characters`
  }

  row.appendChild(labelEl)
  row.appendChild(valueEl)

  return row
}

/**
 * Applies overflow constraints to the outer tooltip container element
 * (the `.tippy-box` wrapper). This ensures the entire tooltip
 * respects viewport boundaries.
 *
 * @param tooltipBox - The outer `.tippy-box` element
 * @param tooltipContent - The inner `.tippy-content` element
 */
export function constrainTooltipToViewport(
  tooltipBox: HTMLElement,
  tooltipContent: HTMLElement
): void {
  const { maxWidth, maxHeight } = calculateTooltipDimensions(
    window.innerWidth,
    window.innerHeight
  )

  applyTooltipOverflowStyles(tooltipBox, maxWidth, maxHeight)

  tooltipContent.style.maxWidth = "100%"
  tooltipContent.style.overflow = "hidden"
  tooltipContent.style.boxSizing = "border-box"
}

/**
 * Escapes HTML entities in a string to prevent XSS in tooltip
 * content that may be rendered with innerHTML.
 *
 * @param text - The raw text to escape
 * @returns The text with HTML entities escaped
 */
export function escapeHtmlForTooltip(text: string): string {
  if (!text) return ""

  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  }

  return text.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char)
}
