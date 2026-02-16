import { describe, expect, test } from "vitest"
import {
  undefinedEq,
  mapThenEq,
  stringCaseInsensitiveEq,
  lodashIsEqualEq,
} from "../eq"
import * as S from "fp-ts/string"
import * as N from "fp-ts/number"

describe("Eq utilities", () => {
  describe("undefinedEq", () => {
    const numEq = undefinedEq(N.Eq)

    test("returns true when both values are equal and defined", () => {
      expect(numEq.equals(42, 42)).toBe(true)
    })

    test("returns false when values differ", () => {
      expect(numEq.equals(1, 2)).toBe(false)
    })

    test("returns true when both values are undefined", () => {
      expect(numEq.equals(undefined, undefined)).toBe(true)
    })

    test("returns false when only first value is undefined", () => {
      expect(numEq.equals(undefined, 5)).toBe(false)
    })

    test("returns false when only second value is undefined", () => {
      expect(numEq.equals(5, undefined)).toBe(false)
    })

    test("works with string Eq", () => {
      const strEq = undefinedEq(S.Eq)
      expect(strEq.equals("hello", "hello")).toBe(true)
      expect(strEq.equals("hello", "world")).toBe(false)
      expect(strEq.equals(undefined, undefined)).toBe(true)
      expect(strEq.equals("hello", undefined)).toBe(false)
    })
  })

  describe("mapThenEq", () => {
    test("compares values after mapping with a transform function", () => {
      const lengthEq = mapThenEq((s: string) => s.length, N.Eq)
      expect(lengthEq.equals("abc", "xyz")).toBe(true)
      expect(lengthEq.equals("ab", "xyz")).toBe(false)
    })

    test("works with numeric transformations", () => {
      const absEq = mapThenEq(Math.abs, N.Eq)
      expect(absEq.equals(-5, 5)).toBe(true)
      expect(absEq.equals(-5, -5)).toBe(true)
      expect(absEq.equals(-5, 6)).toBe(false)
    })

    test("works with object property extraction", () => {
      interface Named {
        name: string
      }
      const nameEq = mapThenEq((x: Named) => x.name, S.Eq)
      expect(nameEq.equals({ name: "Alice" }, { name: "Alice" })).toBe(true)
      expect(nameEq.equals({ name: "Alice" }, { name: "Bob" })).toBe(false)
    })
  })

  describe("stringCaseInsensitiveEq", () => {
    test("treats same-case strings as equal", () => {
      expect(stringCaseInsensitiveEq.equals("hello", "hello")).toBe(true)
    })

    test("treats different-case strings as equal", () => {
      expect(stringCaseInsensitiveEq.equals("Hello", "hello")).toBe(true)
      expect(stringCaseInsensitiveEq.equals("HELLO", "hello")).toBe(true)
      expect(stringCaseInsensitiveEq.equals("HeLLo", "hEllO")).toBe(true)
    })

    test("returns false for different strings", () => {
      expect(stringCaseInsensitiveEq.equals("hello", "world")).toBe(false)
    })

    test("handles empty strings", () => {
      expect(stringCaseInsensitiveEq.equals("", "")).toBe(true)
      expect(stringCaseInsensitiveEq.equals("", "a")).toBe(false)
    })
  })

  describe("lodashIsEqualEq", () => {
    test("compares primitive values", () => {
      expect(lodashIsEqualEq.equals(1, 1)).toBe(true)
      expect(lodashIsEqualEq.equals(1, 2)).toBe(false)
      expect(lodashIsEqualEq.equals("a", "a")).toBe(true)
    })

    test("performs deep equality on objects", () => {
      expect(lodashIsEqualEq.equals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(
        true
      )
      expect(lodashIsEqualEq.equals({ a: 1 }, { a: 2 })).toBe(false)
    })

    test("performs deep equality on nested objects", () => {
      const obj1 = { a: { b: { c: [1, 2, 3] } } }
      const obj2 = { a: { b: { c: [1, 2, 3] } } }
      const obj3 = { a: { b: { c: [1, 2, 4] } } }
      expect(lodashIsEqualEq.equals(obj1, obj2)).toBe(true)
      expect(lodashIsEqualEq.equals(obj1, obj3)).toBe(false)
    })

    test("performs deep equality on arrays", () => {
      expect(lodashIsEqualEq.equals([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(lodashIsEqualEq.equals([1, 2], [1, 2, 3])).toBe(false)
    })

    test("handles null and undefined", () => {
      expect(lodashIsEqualEq.equals(null, null)).toBe(true)
      expect(lodashIsEqualEq.equals(undefined, undefined)).toBe(true)
      expect(lodashIsEqualEq.equals(null, undefined)).toBe(false)
    })
  })
})
