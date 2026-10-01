import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

describe("console output capture", () => {
  test("captures grouped and non-log console entries", () => {
    return expect(
      runPreRequestScript(
        `
        console.log("before clear")
        console.clear()
        console.group("outer")
        console.count()
        console.time("timer")
        console.timeLog("timer", "checkpoint")
        console.timeEnd("timer")
        console.dir({ name: "alpha" })
        console.assert(false)
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
            type: "count",
            args: ["default", 1],
          }),
          expect.objectContaining({
            type: "timeLog",
            args: [expect.stringMatching(/^timer: .+ms$/), "checkpoint"],
          }),
          expect.objectContaining({
            type: "timeEnd",
            args: [expect.stringMatching(/^timer: .+ms$/)],
          }),
          expect.objectContaining({
            type: "dir",
            args: [{ name: "alpha" }],
          }),
          expect.objectContaining({
            type: "assert",
            args: ["Assertion failed"],
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
