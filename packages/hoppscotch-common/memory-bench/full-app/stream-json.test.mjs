/**
 * Regression tests for the streaming JSON parser. Run with: `node --test`
 * (from this directory). Pure Node built-ins — no test framework dependency.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { parseJSONFile } from "./stream-json.mjs"

const DIR = join(tmpdir(), "claude")
mkdirSync(DIR, { recursive: true })
let seq = 0

// Parse `text` through the streaming parser at several read-buffer sizes so
// token/chunk-boundary handling is exercised, not just the happy single-chunk
// path. Returns the parsed value (asserts all chunk sizes agree).
async function parse(text) {
  const path = join(DIR, `sj-${seq++}.json`)
  writeFileSync(path, text)
  let first
  for (const highWaterMark of [1, 2, 3, 7, 64, 4096]) {
    const got = await parseJSONFile(path, { highWaterMark })
    if (first === undefined) first = got
    else assert.deepEqual(got, first, `chunk size ${highWaterMark} disagreed`)
  }
  return first
}

const rejects = (text) =>
  assert.rejects(() => parse(text), SyntaxError, `expected reject: ${text}`)

// The fix this guards: malformed numeric syntax must be rejected, not coerced
// to NaN (1.2.3, 1e) or silently wrong values (5., 01) the way bare Number() does.
test("rejects malformed numbers instead of emitting NaN/garbage", async () => {
  for (const bad of [
    "1.2.3", "--5", "1e", "5.", ".5", "1e+", "01", "00",
    "-", "1..2", "1ee5", "1e1.5", "-.5", "+5", "1e--5",
  ]) {
    await rejects(bad)
  }
})

test("parses valid numbers identically to JSON.parse", async () => {
  for (const text of [
    "0", "-0", "123", "-99", "3.14", "-2.5e10", "1e-7", "1E+5",
    "9007199254740991", "[1,2.5,-3e2,0.0]", '{"a":-1.5e-3,"b":[1e10,0]}',
  ]) {
    assert.deepEqual(await parse(text), JSON.parse(text))
  }
})

test("parses heap-snapshot-shaped structures", async () => {
  const snap = {
    snapshot: { meta: { node_fields: ["type", "name", "id", "self_size"] } },
    nodes: Array.from({ length: 400 }, (_, i) => i * 1000 - i),
    edges: Array.from({ length: 300 }, (_, i) => i % 7),
    strings: ['<dummy>', "", "(GC roots)", 'a "quoted" /slash\\ é #1'],
  }
  assert.deepEqual(await parse(JSON.stringify(snap)), snap)
})
