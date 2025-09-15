export type DraggableMoveEvent = {
  draggedContext?: {
    futureIndex?: number
  }
}

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
