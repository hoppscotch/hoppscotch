import { describe, test, expect } from "vitest"
import { isDragDropAllowed, DragDropEvent } from "../dragDropValidation"

describe("isDragDropAllowed", () => {
  describe("Valid drag operations", () => {
    test("allows dropping at the beginning of a list", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 0,
        },
      }
      const totalItems = 5

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })

    test("allows dropping in the middle of a list", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 2,
        },
      }
      const totalItems = 5

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })

    test("allows dropping at second-to-last position", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 3,
        },
      }
      const totalItems = 5

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })

    test("allows dropping in a list with only one empty item", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 0,
        },
      }
      const totalItems = 2

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })
  })

  describe("Invalid drag operations", () => {
    test("prevents dropping at the last position (reserved for empty entry)", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 4,
        },
      }
      const totalItems = 5

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(false)
    })

    test("prevents dropping beyond the last position", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 10,
        },
      }
      const totalItems = 5

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(false)
    })

    test("prevents dropping at the last position in a minimal list", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 1,
        },
      }
      const totalItems = 2

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(false)
    })
  })

  describe("Edge cases and invalid input", () => {
    test("returns false when dragEvent is null", () => {
      expect(isDragDropAllowed(null as any, 5)).toBe(false)
    })

    test("returns false when dragEvent is undefined", () => {
      expect(isDragDropAllowed(undefined as any, 5)).toBe(false)
    })

    test("returns false when draggedContext is missing", () => {
      const dragEvent = {} as DragDropEvent
      expect(isDragDropAllowed(dragEvent, 5)).toBe(false)
    })

    test("returns false when futureIndex is missing", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {},
      }
      expect(isDragDropAllowed(dragEvent, 5)).toBe(false)
    })

    test("returns false when futureIndex is null", () => {
      const dragEvent = {
        draggedContext: {
          futureIndex: null as any,
        },
      } as DragDropEvent
      expect(isDragDropAllowed(dragEvent, 5)).toBe(false)
    })

    test("returns false when futureIndex is not a number", () => {
      const dragEvent = {
        draggedContext: {
          futureIndex: "invalid" as any,
        },
      } as DragDropEvent
      expect(isDragDropAllowed(dragEvent, 5)).toBe(false)
    })

    test("returns false when futureIndex is NaN", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: NaN,
        },
      }
      expect(isDragDropAllowed(dragEvent, 5)).toBe(false)
    })

    test("returns false when totalItems is null", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 2,
        },
      }
      expect(isDragDropAllowed(dragEvent, null as any)).toBe(false)
    })

    test("returns false when totalItems is not a number", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 2,
        },
      }
      expect(isDragDropAllowed(dragEvent, "invalid" as any)).toBe(false)
    })

    test("returns false when totalItems is NaN", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 2,
        },
      }
      expect(isDragDropAllowed(dragEvent, NaN)).toBe(false)
    })

    test("handles negative futureIndex correctly", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: -1,
        },
      }
      const totalItems = 5

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })

    test("handles zero totalItems correctly", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 0,
        },
      }
      const totalItems = 0

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(false)
    })

    test("handles minimal valid case (totalItems = 1)", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 0,
        },
      }
      const totalItems = 1

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(false)
    })
  })

  describe("Real-world scenarios", () => {
    test("simulates dragging a header to position 0 in a list of 3 items", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 0,
        },
      }
      const totalItems = 3 // 2 real headers + 1 empty

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })

    test("simulates dragging a header to position 1 in a list of 3 items", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 1,
        },
      }
      const totalItems = 3 // 2 real headers + 1 empty

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(true)
    })

    test("prevents dragging a header to the empty position (position 2) in a list of 3 items", () => {
      const dragEvent: DragDropEvent = {
        draggedContext: {
          futureIndex: 2,
        },
      }
      const totalItems = 3 // 2 real headers + 1 empty

      expect(isDragDropAllowed(dragEvent, totalItems)).toBe(false)
    })

    test("simulates a large list with many items", () => {
      const totalItems = 100 // 99 real items + 1 empty

      // Should allow dropping anywhere except the last position
      const dragEvent0: DragDropEvent = { draggedContext: { futureIndex: 0 } }
      const dragEvent50: DragDropEvent = { draggedContext: { futureIndex: 50 } }
      const dragEvent98: DragDropEvent = { draggedContext: { futureIndex: 98 } }
      const dragEvent99: DragDropEvent = { draggedContext: { futureIndex: 99 } }

      expect(isDragDropAllowed(dragEvent0, totalItems)).toBe(true)
      expect(isDragDropAllowed(dragEvent50, totalItems)).toBe(true)
      expect(isDragDropAllowed(dragEvent98, totalItems)).toBe(true)
      expect(isDragDropAllowed(dragEvent99, totalItems)).toBe(false)
    })
  })
})
