import { describe, expect, test } from "vitest"

import { renderConsoleEntries } from "../entries"
import type { ConsoleEntry } from "../Panel.vue"

const entry = (
  type: ConsoleEntry["type"],
  args: unknown[] = []
): ConsoleEntry => ({
  type,
  args,
  timestamp: 0,
})

describe("renderConsoleEntries", () => {
  test("assigns a new identity to a group after console.clear", () => {
    const entries = renderConsoleEntries([
      entry("group", ["old group"]),
      entry("log", ["old entry"]),
      entry("groupEnd"),
      entry("clear"),
      entry("group", ["new group"]),
      entry("log", ["new entry"]),
      entry("groupEnd"),
    ])

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 4,
      args: ["new group"],
      children: [
        {
          id: 5,
          args: ["new entry"],
        },
      ],
    })
  })
})
