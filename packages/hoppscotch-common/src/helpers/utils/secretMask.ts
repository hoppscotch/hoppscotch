/**
 * Masks a secret value for display by replacing it with `*` characters — one
 * per character — so the mask length matches the value's length.
 *
 * An empty value is returned as an empty string rather than a mask, so callers
 * can still tell an unset secret apart from a stored one (e.g. the env tooltip
 * shows "Empty" instead of a mask).
 *
 * @param value - The raw secret value to mask. May be empty, `null`, or `undefined`.
 * @returns A string of `*` the same length as `value`, or `""` when `value` is empty or nullish.
 */
export const maskSecretValue = (value?: string | null): string =>
  "*".repeat(value?.length ?? 0)
