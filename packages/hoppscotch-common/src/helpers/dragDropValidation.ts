export type DragDropEvent = {
  draggedContext?: {
    futureIndex?: number
  }
}

/**
 * Validates if a drag-and-drop operation should be allowed.
 *
 * Prevents items from being dropped at the last position, which is reserved
 * for the "add new item" empty entry in lists like headers and parameters.
 *
 * @param dragEvent - The drag event containing position information
 * @param totalItems - The current length of the items array
 * @returns true if the drop is allowed, false otherwise
 */
export function isDragDropAllowed(
  dragEvent: DragDropEvent,
  totalItems: number
): boolean {
  const targetIndex = dragEvent?.draggedContext?.futureIndex

  // Validate input parameters
  if (
    typeof targetIndex !== "number" ||
    isNaN(targetIndex) ||
    isNaN(totalItems)
  ) {
    return false
  }

  // Prevent dropping at the last position (reserved for empty entry)
  if (targetIndex >= totalItems - 1) {
    return false
  }

  return true
}
