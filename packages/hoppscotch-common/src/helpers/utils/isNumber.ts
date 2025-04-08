/**
 * Check if a value is a number
 * @param value - The value to check
 * @returns True if the value is a number, false otherwise
 */
export const isNumber = (value: unknown): boolean => {
  if (typeof value === "number") return !Number.isNaN(value) // handle actual numbers
  if (typeof value !== "string") return false // only process strings or numbers!
  return (
    value.trim() !== "" && // ensure strings of whitespace fail
    !isNaN(Number(value)) // use type coercion to parse the entirety of the string
  )
}
