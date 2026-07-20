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
