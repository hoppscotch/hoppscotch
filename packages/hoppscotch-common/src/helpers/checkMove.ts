export type DraggableMoveEvent = {
  draggedContext?: {
    futureIndex?: number
  }
}

/**
 * Check if the move action is valid
 * @param event DraggableMoveEvent which contains future index of the dragged item
 * @param itemsLength The current length of the items array
 * @returns boolean indicating if the move is valid
 */
export function checkMove(
  event: DraggableMoveEvent,
  itemsLength: number
): boolean {
  const futureIndex = event?.draggedContext?.futureIndex
  if (
    typeof futureIndex !== "number" ||
    isNaN(futureIndex) ||
    isNaN(itemsLength)
  )
    return false
  if (futureIndex >= itemsLength - 1) return false
  return true
}
