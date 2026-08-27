import * as E from "fp-ts/Either"
import { describe, expect, test } from "vitest"
import { datasetRowToTempVars, parseDatasetFile } from "../dataset"

const file = (name: string, body: string) => new File([body], name)

describe("collection runner dataset parsing", () => {
  test("parses CSV headers as variable names and rows as iteration data", async () => {
    const result = await parseDatasetFile(
      file(
        "testing.csv",
        " title ,body,userId\nfirst,im first one,1\nsecond,im second one,2"
      )
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right).toEqual({
      type: "csv",
      fileName: "testing.csv",
      rows: [
        { title: "first", body: "im first one", userId: "1" },
        { title: "second", body: "im second one", userId: "2" },
      ],
    })
  })

  // PapaParse emits UndetectableDelimiter on single-column files even though
  // the parse succeeded; it must not be treated as fatal.
  test("accepts a single-column CSV", async () => {
    const result = await parseDatasetFile(
      file("testing.csv", "userId\n1\n2\n3")
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([
      { userId: "1" },
      { userId: "2" },
      { userId: "3" },
    ])
  })

  test("accepts a single-column CSV prefixed with a UTF-8 BOM", async () => {
    const result = await parseDatasetFile(file("testing.csv", "﻿userId\n1\n2"))

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([{ userId: "1" }, { userId: "2" }])
  })

  test("ignores trailing whitespace-only lines", async () => {
    const result = await parseDatasetFile(
      file("testing.csv", "a,b\n1,2\n   \n")
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([{ a: "1", b: "2" }])
  })

  test("reports the spreadsheet line number for a malformed row", async () => {
    const result = await parseDatasetFile(
      file("testing.csv", "a,b\n1,2\n3\n4,5")
    )

    expect(E.isLeft(result)).toBe(true)
    if (E.isRight(result)) return

    // Header is line 1, so the short row (parsed row index 1) is line 3.
    expect(result.left).toContain("Line 3")
  })

  test("reports the spreadsheet line number for an unterminated quote", async () => {
    const result = await parseDatasetFile(
      file("testing.csv", 'user,pass\nbob,x\nalice,"unclosed')
    )

    expect(E.isLeft(result)).toBe(true)
    if (E.isRight(result)) return

    // Quotes errors count the header itself as row 0 (PapaParse reports
    // row 2 here), so the bad row is file line 3 — not line 4.
    expect(result.left).toContain("Line 3")
  })

  // skipEmptyLines: "greedy" tests the parsed values with quotes already
  // stripped, so a row whose every field is quoted whitespace is dropped
  // exactly like a bare whitespace-only line. Accepted trade-off; a row with
  // any non-blank field survives, and its quoted whitespace is preserved.
  test("drops a row whose only field values are quoted whitespace", async () => {
    const result = await parseDatasetFile(
      file("testing.csv", 'user\nalice\n"   "\nbob\n')
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([{ user: "alice" }, { user: "bob" }])
  })

  test("keeps a quoted-whitespace field when another field has content", async () => {
    const result = await parseDatasetFile(
      file("testing.csv", 'a,b\n1,2\nx,"  "\n3,4')
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([
      { a: "1", b: "2" },
      { a: "x", b: "  " },
      { a: "3", b: "4" },
    ])
  })

  test("parses JSON rows and stringifies non-string values", async () => {
    const result = await parseDatasetFile(
      file(
        "testing.json",
        JSON.stringify([
          {
            title: "first",
            active: true,
            count: 1,
            nullable: null,
            ids: [1, 2],
            meta: { role: "admin" },
          },
        ])
      )
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([
      {
        title: "first",
        active: "true",
        count: "1",
        nullable: "",
        ids: "[1,2]",
        meta: '{"role":"admin"}',
      },
    ])
  })

  test("preserves empty JSON rows as iterations with no variables", async () => {
    const result = await parseDatasetFile(
      file(
        "testing.json",
        JSON.stringify([{ title: "first" }, {}, { title: "third" }])
      )
    )

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right.rows).toEqual([
      { title: "first" },
      {},
      { title: "third" },
    ])
  })

  test("returns a Left when the file cannot be read", async () => {
    // A non-Blob makes FileReader.readAsText throw; the rejection must surface
    // as a Left rather than an unhandled promise rejection.
    const result = await parseDatasetFile({
      name: "unreadable.json",
    } as unknown as File)

    expect(E.isLeft(result)).toBe(true)
  })

  test("rejects JSON files that are not arrays of objects", async () => {
    const primitiveArray = await parseDatasetFile(
      file("testing.json", JSON.stringify(["first", "second"]))
    )
    const nestedArray = await parseDatasetFile(
      file("testing.json", JSON.stringify([[1], [2]]))
    )
    const object = await parseDatasetFile(
      file("testing.json", JSON.stringify({ title: "first" }))
    )

    expect(E.isLeft(primitiveArray)).toBe(true)
    expect(E.isLeft(nestedArray)).toBe(true)
    expect(E.isLeft(object)).toBe(true)
  })

  test("converts a dataset row to temporary environment variables", () => {
    expect(
      datasetRowToTempVars({ title: "first", body: "im first one" })
    ).toEqual([
      {
        key: "title",
        initialValue: "first",
        currentValue: "first",
        secret: false,
      },
      {
        key: "body",
        initialValue: "im first one",
        currentValue: "im first one",
        secret: false,
      },
    ])
  })
})
