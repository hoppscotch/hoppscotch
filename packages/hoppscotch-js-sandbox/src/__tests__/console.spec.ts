import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

describe("console output capture", () => {
  test("captures grouping, table, clear, and multiline log entries", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("before clear")
        console.clear()
        console.group("outer")
        console.log("line 1\\nline 2")
        console.groupCollapsed("nested")
        console.table([{ name: "alpha", enabled: true }])
        console.groupEnd()
        console.groupEnd()
        console.assert(true, "should not be captured")
        console.assert(false, "should be captured")
        `,
        {
          envs: { global: [], selected: [] },
          request: getDefaultRESTRequest(),
          cookies: null,
          experimentalScriptingSandbox: true,
        }
      )
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            type: "log",
            args: ["before clear"],
          }),
          expect.objectContaining({
            type: "clear",
            args: [],
          }),
          expect.objectContaining({
            type: "group",
            args: ["outer"],
          }),
          expect.objectContaining({
            type: "log",
            args: ["line 1\nline 2"],
          }),
          expect.objectContaining({
            type: "group",
            args: ["nested"],
            collapsed: true,
          }),
          expect.objectContaining({
            type: "table",
            args: [[{ name: "alpha", enabled: true }]],
          }),
          expect.objectContaining({
            type: "groupEnd",
            args: [],
          }),
          expect.objectContaining({
            type: "groupEnd",
            args: [],
          }),
          expect.objectContaining({
            type: "assert",
            args: ["should be captured"],
          }),
        ],
      })
    )
  })
})
