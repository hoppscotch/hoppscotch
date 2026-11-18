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

/** Maximum pixel height for the tooltip container. */
export const TOOLTIP_MAX_HEIGHT_PX = 300

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
  if (!text) {
    return text ?? ""
  }

  const codePoints = Array.from(text)
  if (codePoints.length <= maxLength) return text

  // Show the beginning of the text plus a count so the user knows
  // the full length of the value.
  const truncated = codePoints.slice(0, maxLength).join("")
  return `${truncated}\u2026 (truncated, ${codePoints.length} chars)`
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
  const effectiveWidth = Math.max(viewportWidth - margin * 2, 0)
  const effectiveHeight = Math.max(viewportHeight - margin * 2, 0)

  const maxWidth = Math.min(effectiveWidth, TOOLTIP_MAX_WIDTH_PX)

  const maxHeight = Math.min(effectiveHeight, TOOLTIP_MAX_HEIGHT_PX)

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
  const resolvedMinWidth = Math.min(TOOLTIP_MIN_WIDTH_PX, resolvedMaxWidth)

  element.style.maxWidth = `${resolvedMaxWidth}px`
  element.style.minWidth = `${resolvedMinWidth}px`
  element.style.boxSizing = "border-box"

  if (maxHeight !== undefined) {
    element.style.maxHeight = `${maxHeight}px`
  }
}

/**
 * Creates a fully styled value row for the tooltip, including
 * a label (e.g., "Initial" or "Current") and a value element
 * with proper overflow handling.
 *
 * @param label - The label text (e.g., "Initial", "Current", "Value")
 * @param value - The raw value string to display
 * @param maxValueLength - Maximum characters before truncation
 * @returns The row container element
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
  labelEl.style.marginRight = "0.5rem"

  const valueEl = document.createElement("span")
  valueEl.className = "env-tooltip-value"
  const displayValue = formatTooltipValue(value, maxValueLength)
  valueEl.textContent = displayValue

  // Add a title attribute with the truncated indicator so users
  // know the full length if it was truncated
  if (value && value.length > maxValueLength) {
    valueEl.title = `Full value: ${value.length} characters`
  }

  row.appendChild(labelEl)
  row.appendChild(valueEl)

  return row
}

export type TooltipEditableValueRowOptions = {
  label: string
  /** Set as the input's `.value` property, never as the attribute. */
  value: string
  placeholder?: string
  /**
   * `input` saves on every keystroke (for tooltips that can close at any
   * moment). `commit` saves on Enter or blur (for tooltips that are rebuilt
   * when the underlying data changes).
   */
  saveOn: "input" | "commit"
  onSave: (value: string) => void
  /** When set, the input is masked and gets a show/hide toggle button. */
  secret?: {
    showLabel: string
    hideLabel: string
    showIcon: string
    hideIcon: string
  }
}

/**
 * Creates a tooltip row with a label and an editable single-line input.
 *
 * While the input is focused, a capture-phase keydown listener handles Enter
 * (commit, then blur) and Escape (restore the opening value). Keystrokes that
 * belong to an IME composition are ignored. Ctrl/Cmd+S commits a pending
 * change without blurring, so the save shortcut sees the new value.
 *
 * Call `flush()` when the tooltip is torn down: browsers do not reliably
 * fire `blur` on an element that is removed while focused, so a pending
 * change would otherwise be lost.
 *
 * @param options - Label, initial value, save behaviour and secret handling
 * @returns The row, its input, and a `flush` function that saves any pending change
 */
export function createTooltipEditableValueRow(
  options: TooltipEditableValueRowOptions
): { row: HTMLDivElement; input: HTMLInputElement; flush: () => void } {
  const { label, value, placeholder, saveOn, onSave, secret } = options

  const row = document.createElement("div")
  row.className = "flex items-center space-x-2"
  row.style.width = "100%"

  const labelEl = document.createElement("div")
  labelEl.textContent = label
  labelEl.className = "font-bold"
  labelEl.style.flexShrink = "0"
  labelEl.style.minWidth = "50px"
  labelEl.style.marginRight = "0.5rem"

  const input = document.createElement("input")
  input.type = secret ? "password" : "text"
  input.className =
    "env-tooltip-value flex-1 min-w-0 px-2 py-1 rounded border border-divider bg-primaryLight text-secondaryDark focus:border-dividerDark"
  input.autocomplete = "off"
  input.setAttribute("aria-label", label)
  input.spellcheck = false
  if (placeholder !== undefined) input.placeholder = placeholder
  // The value is only ever set as a property so that a secret never shows
  // up in serialized HTML.
  input.value = value
  // Read the value back: text inputs strip line breaks, so the input may not
  // hold `value` exactly. Comparing against what it actually holds means
  // opening and closing the row without an edit never saves.
  const initial = input.value

  let committed = initial
  const commit = (v: string) => {
    if (v === committed) return
    onSave(v)
    committed = v
  }

  // Runs in the capture phase on window so the commit happens before the
  // global shortcut handler on document, which sends the request on
  // Ctrl/Cmd+Enter. The event is not stopped, so the shortcut still fires.
  const onKeydown = (ev: KeyboardEvent) => {
    if (ev.target !== input) return
    // Skip during IME composition (CJK input). Enter confirms and Escape
    // cancels a candidate, so they must not commit or restore here.
    // Modern browsers report `isComposing`, older ones `keyCode === 229`.
    if (ev.isComposing || ev.keyCode === 229) return
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
      // Save shortcuts run on document after this, so commit first or the
      // old value gets saved. Keep focus: committing more would close the
      // tooltip for request variables.
      commit(input.value)
    } else if (ev.key === "Enter") {
      commit(input.value)
      input.blur()
    } else if (ev.key === "Escape") {
      input.value = initial
      commit(initial)
    }
  }
  const detachKeydown = () =>
    window.removeEventListener("keydown", onKeydown, true)

  input.addEventListener("focus", () => {
    window.addEventListener("keydown", onKeydown, true)
  })
  input.addEventListener("blur", () => {
    detachKeydown()
    commit(input.value)
  })
  if (saveOn === "input") {
    // While an IME composition is in progress the value holds an unconfirmed
    // candidate, so save once the composition ends instead.
    input.addEventListener("input", (ev) => {
      if ((ev as InputEvent).isComposing) return
      commit(input.value)
    })
    input.addEventListener("compositionend", () => commit(input.value))
  }

  row.appendChild(labelEl)
  row.appendChild(input)

  if (secret) {
    const toggle = document.createElement("button")
    toggle.type = "button"
    toggle.className =
      "flex flex-shrink-0 items-center justify-center p-1 rounded text-secondaryLight hover:text-secondaryDark"

    let revealed = false
    const render = () => {
      const labelText = revealed ? secret.hideLabel : secret.showLabel
      toggle.innerHTML = revealed ? secret.hideIcon : secret.showIcon
      toggle.setAttribute("aria-label", labelText)
      toggle.title = labelText
      input.type = revealed ? "text" : "password"
    }
    toggle.addEventListener("click", () => {
      revealed = !revealed
      render()
    })
    render()
    row.appendChild(toggle)
  }

  const flush = () => {
    detachKeydown()
    commit(input.value)
  }

  return { row, input, flush }
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
 * Standardized helper to stabilize interactive tooltips in CodeMirror.
 * Adds a CSS-based bridge to extend the hover area, allowing the user
 * to move the cursor into the tooltip without it closing.
 *
 * @param dom - The outer tooltip container element (.tippy-box)
 */
export function stabilizeTooltipHover(dom: HTMLElement): void {
  dom.classList.add("hopp-tooltip-interactive-wrapper")
}
