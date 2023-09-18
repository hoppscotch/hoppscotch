/**
 * Compares two arrays for an equal set of items by first converting them to sets and
 * then comparing them.
 *
 * Sets are used to avoid complications with duplicate items.
 *
 * @param a The first array
 * @param b The second array
 * @returns True if the arrays hold the same items (and are, of course, the same length),
 *          otherwise false.
 */
export const setCompareArrays = (a: any[], b: any[]) => {
  const aSet = new Set(a)
  const bSet = new Set(b)
  return aSet.size === bSet.size && [...aSet].every((x) => bSet.has(x))
}
