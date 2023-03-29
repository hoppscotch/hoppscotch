/**
 * Get the indexes that are affected by the reorder
 * @param oldIndex index of the item before reorder
 * @param newIndex index of the item after reorder
 * @returns Map of oldIndex to newIndex
 */

export function getAffectedIndexes(oldIndex: number, newIndex: number) {
  const indexes = new Map<number, number>()
  indexes.set(oldIndex, newIndex)
  if (oldIndex < newIndex) {
    for (let i = oldIndex + 1; i <= newIndex; i++) {
      indexes.set(i, i - 1)
    }
  } else {
    for (let i = oldIndex - 1; i >= newIndex; i--) {
      indexes.set(i, i + 1)
    }
  }
  return indexes
}
