import { HoppAccentColors } from "~/newstore/settings"
import type { HoppAccentColor } from "~/newstore/settings"
import { colord } from "colord"

export function isPresetAccentColor(color: unknown): color is HoppAccentColor {
  return (
    typeof color === "string" &&
    (HoppAccentColors as readonly string[]).includes(color)
  )
}

/**
 * Return either `#000000` or `#ffffff` depending on which provides better contrast
 * for the provided color. Uses WCAG contrast ratio calculation and prefers the
 * color meeting the threshold (4.5:1) if possible.
 */
export function getContrastColor(
  hexOrColor: string,
  threshold = 4.5
): "#000000" | "#ffffff" {
  try {
    const c = colord(hexOrColor)
    const { r, g, b } = c.toRgb()

    const srgb = [r, g, b].map((v) => v / 255)
    const linear = srgb.map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    )
    const L = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    // Contrast ratios for white/black text on top of the input color.
    const contrastAgainstWhite = (1.0 + 0.05) / (L + 0.05)
    const contrastAgainstBlack = (L + 0.05) / (0.0 + 0.05)

    const meetsWhite = contrastAgainstWhite >= threshold
    const meetsBlack = contrastAgainstBlack >= threshold

    if (meetsWhite && !meetsBlack) return "#ffffff"
    if (meetsBlack && !meetsWhite) return "#000000"

    // If both meet or both fail, prefer the higher WCAG contrast ratio.
    return contrastAgainstWhite >= contrastAgainstBlack ? "#ffffff" : "#000000"
  } catch (_e) {
    return "#000000"
  }
}
