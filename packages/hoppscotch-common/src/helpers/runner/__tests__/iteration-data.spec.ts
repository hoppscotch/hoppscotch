import { describe, expect, it } from "vitest"

import {
  parseCSVIterationData,
  parseJSONIterationData,
} from "../iteration-data"

describe("iteration data parsing", () => {
  it("parses CSV rows into environment variable rows", () => {
    const result = parseCSVIterationData(
      'name,email\n"Ada, Lovelace",ada@example.com\nGrace,grace@example.com'
    )

    expect(result).toEqual([
      [
        {
          key: "name",
          initialValue: "Ada, Lovelace",
          currentValue: "Ada, Lovelace",
          secret: false,
        },
        {
          key: "email",
          initialValue: "ada@example.com",
          currentValue: "ada@example.com",
          secret: false,
        },
      ],
      [
        {
          key: "name",
          initialValue: "Grace",
          currentValue: "Grace",
          secret: false,
        },
        {
          key: "email",
          initialValue: "grace@example.com",
          currentValue: "grace@example.com",
          secret: false,
        },
      ],
    ])
  })

  it("parses JSON array objects into environment variable rows", () => {
    const result = parseJSONIterationData(
      JSON.stringify([
        { id: 1, active: true },
        { id: 2, active: false },
      ])
    )

    expect(result).toEqual([
      [
        {
          key: "id",
          initialValue: "1",
          currentValue: "1",
          secret: false,
        },
        {
          key: "active",
          initialValue: "true",
          currentValue: "true",
          secret: false,
        },
      ],
      [
        {
          key: "id",
          initialValue: "2",
          currentValue: "2",
          secret: false,
        },
        {
          key: "active",
          initialValue: "false",
          currentValue: "false",
          secret: false,
        },
      ],
    ])
  })
})
