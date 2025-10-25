/**
 * Special marker constants for preserving undefined and null values
 * across the sandbox boundary during serialization.
 *
 * These markers are used because:
 * - JSON.stringify converts undefined to null or omits the property
 * - We need to distinguish between actual null and serialized undefined
 * - The sandbox boundary requires serialization, losing type information
 */
export const UNDEFINED_MARKER = "__HOPPSCOTCH_UNDEFINED__" as const
export const NULL_MARKER = "__HOPPSCOTCH_NULL__" as const

export type SandboxMarker = typeof UNDEFINED_MARKER | typeof NULL_MARKER

/**
 * Converts marker strings back to their original values
 */
export const convertMarkerToValue = (value: unknown): unknown => {
  if (value === UNDEFINED_MARKER) return undefined
  if (value === NULL_MARKER) return null
  return value
}

/**
 * Converts null/undefined values to marker strings for serialization
 */
export const convertValueToMarker = (value: unknown): unknown => {
  if (value === undefined) return UNDEFINED_MARKER
  if (value === null) return NULL_MARKER
  return value
}
