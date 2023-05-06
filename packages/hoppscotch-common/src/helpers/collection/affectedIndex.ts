/**
 * Get the indexes that are affected by the reorder
 * @param from index of the item before reorder
 * @param to index of the item after reorder
 * @returns Map of from to to
 */

export function getAffectedIndexes(from: number, to: number) {
  const indexes = new Map<number, number>()
  indexes.set(from, to)
  if (from < to) {
    for (let i = from + 1; i <= to; i++) {
      indexes.set(i, i - 1)
    }
  } else {
    for (let i = from - 1; i >= to; i--) {
      indexes.set(i, i + 1)
    }
  }
  return indexes
}
