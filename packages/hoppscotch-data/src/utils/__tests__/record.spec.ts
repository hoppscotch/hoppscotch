import { describe, expect, test } from "vitest"
import { recordUpdate } from "../record"

describe("record utilities", () => {
  describe("recordUpdate", () => {
    test("updates a single field using a mapping function", () => {
      const obj = { name: "Alice", age: 30 }
      const updater = recordUpdate(
        "age" as const,
        (x: number) => x + 1
      )
      const result = updater(obj)
      expect(result).toEqual({ name: "Alice", age: 31 })
    })

    test("preserves other fields unchanged", () => {
      const obj = { a: 1, b: 2, c: 3 }
      const updater = recordUpdate(
        "b" as const,
        (x: number) => x * 10
      )
      const result = updater(obj)
      expect(result).toEqual({ a: 1, b: 20, c: 3 })
    })

    test("can change the type of the updated field", () => {
      const obj = { name: "Alice", age: 30 }
      const updater = recordUpdate(
        "age" as const,
        (x: number) => String(x)
      )
      const result = updater(obj)
      expect(result).toEqual({ name: "Alice", age: "30" })
      expect(typeof result.age).toBe("string")
    })

    test("works with string transformations", () => {
      const obj = { greeting: "hello", count: 5 }
      const updater = recordUpdate(
        "greeting" as const,
        (s: string) => s.toUpperCase()
      )
      const result = updater(obj)
      expect(result).toEqual({ greeting: "HELLO", count: 5 })
    })

    test("works with array fields", () => {
      const obj = { items: [1, 2, 3], label: "test" }
      const updater = recordUpdate(
        "items" as const,
        (arr: number[]) => [...arr, 4]
      )
      const result = updater(obj)
      expect(result).toEqual({ items: [1, 2, 3, 4], label: "test" })
    })

    test("does not mutate the original object", () => {
      const obj = { x: 1, y: 2 }
      const updater = recordUpdate(
        "x" as const,
        (n: number) => n + 10
      )
      const result = updater(obj)
      expect(obj).toEqual({ x: 1, y: 2 })
      expect(result).toEqual({ x: 11, y: 2 })
    })

    test("works with nested object fields", () => {
      const obj = { meta: { version: 1 }, data: "test" }
      const updater = recordUpdate(
        "meta" as const,
        (m: { version: number }) => ({ ...m, version: m.version + 1 })
      )
      const result = updater(obj)
      expect(result).toEqual({ meta: { version: 2 }, data: "test" })
    })
  })
})
