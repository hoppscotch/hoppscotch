/**
 * Scenario C — Large JSON response (issue #5883: "1.7GB -> 3.6GB on a 3.43MB
 * payload, only partly recovers").
 *
 * Reproduces the renderer's real response-body copy chain for the JSON lens,
 * using the SAME library the app uses (`lossless-json`) and the SAME operations
 * as components/lenses/renderers/JSONLensRenderer.vue:
 *
 *   raw ArrayBuffer (kept on HoppRESTResponse.body)
 *     -> TextDecoder().decode(body)                 (getResponseBodyText)
 *     -> LJSON.parse(text)                          (parsed object)
 *     -> LJSON.stringify(parsed, undefined, 2)      (pretty string for CodeMirror)
 *
 * Measures how much retained heap is held when these copies coexist (as they do
 * while the lens is displayed) versus the raw body alone — i.e. the copy
 * amplification factor — and whether dropping the intermediates returns to the
 * raw-only baseline (the "only partly recovers" claim).
 *
 * Run with: NODE_OPTIONS=--expose-gc (see package script `bench:memory`).
 */
import { afterAll, describe, expect, it } from "vitest"
import * as LJSON from "lossless-json"
import {
  GC_AVAILABLE,
  retainedHeap,
  bytesToMB,
  MB,
} from "../lib/measure"
import { recordBytes, writeReport } from "../lib/report"
import { resolve } from "node:path"

afterAll(() => {
  if (!GC_AVAILABLE) return
  writeReport(resolve(__dirname, "../results"), "response-body")
})

/** Exactly the production getResponseBodyText (composables/lens-actions.ts). */
function getResponseBodyText(body: ArrayBuffer | string): string {
  if (typeof body === "string") return body
  return new TextDecoder("utf-8").decode(body).replace(/\0+$/, "")
}

/** Build a realistic ~`targetMB` JSON body as the kernel delivers it: an ArrayBuffer. */
function makeJsonBody(targetMB: number): ArrayBuffer {
  const rows: unknown[] = []
  let approx = 0
  let i = 0
  while (approx < targetMB * MB) {
    const row = {
      id: i,
      uuid: `${i}-3f2a9c1e-8b7d-4e6f-a1b2-${"c".repeat(12)}`,
      name: `Resource number ${i}`,
      email: `user${i}@example.com`,
      active: i % 2 === 0,
      score: i * 1.5,
      tags: ["alpha", "beta", "gamma", `tag-${i}`],
      nested: { a: i, b: `value-${i}`, c: [i, i + 1, i + 2] },
    }
    rows.push(row)
    approx += 160 // rough bytes/row
    i++
  }
  const str = JSON.stringify({ data: rows, count: rows.length })
  return new TextEncoder().encode(str).buffer
}

describe.skipIf(!GC_AVAILABLE)("Scenario C — large JSON response (H3)", () => {
  it("breaks down simultaneous response-copy amplification + recovery", async () => {
    // ~3.4 MB to mirror #5883's 3.43 MB payload.
    let body: ArrayBuffer | null = makeJsonBody(2)
    const rawBytes = body.byteLength
    const bodyMB = bytesToMB(rawBytes)

    // Baseline: only the raw ArrayBuffer retained (as on HoppRESTResponse.body).
    const baseline = await retainedHeap()

    // Build copies one at a time, mirroring the JSON lens, measuring each stage.
    let text: string | null = getResponseBodyText(body) // decoded string
    const afterDecode = await retainedHeap()

    let parsed: unknown = LJSON.parse(text) // LJSON-parsed object graph
    const afterParse = await retainedHeap()

    let pretty: string | null = LJSON.stringify(parsed, undefined, 2) as string // pretty
    const afterPretty = await retainedHeap()

    const totalAmplification = afterPretty - baseline

    // Recovery: release the intermediates (the lens would on tab/response change)
    // but keep the raw body — does retained return toward the raw-only baseline?
    text = null
    parsed = null
    pretty = null
    const afterDropIntermediates = await retainedHeap()

    // Release everything including the raw body.
    body = null
    const afterReleaseAll = await retainedHeap()

    recordBytes(
      `Scenario C / H3 — JSON lens copy breakdown (raw body ${bodyMB} MB)`,
      {
        raw_body: rawBytes,
        baseline_raw_only: baseline,
        after_plus_decoded_string: afterDecode,
        after_plus_parsed_object: afterParse,
        after_plus_pretty_string: afterPretty,
        total_amplification_over_raw: totalAmplification,
        after_dropping_intermediates: afterDropIntermediates,
        after_releasing_all: afterReleaseAll,
      },
      [
        `Per-copy growth: decode +${bytesToMB(afterDecode - baseline)}MB, `,
        `LJSON.parse +${bytesToMB(afterParse - afterDecode)}MB, `,
        `pretty +${bytesToMB(afterPretty - afterParse)}MB. `,
        `Total ≈ ${(totalAmplification / rawBytes).toFixed(1)}x raw. `,
        `Recovery after dropping intermediates: ${bytesToMB(
          afterDropIntermediates - baseline
        )}MB above raw-only baseline (0 ≈ full recovery).`,
      ].join("")
    )

    expect(totalAmplification).toBeGreaterThan(rawBytes)
    // Sanity: dropping intermediates must recover most of the amplification,
    // else the harness itself is leaking.
    expect(afterDropIntermediates).toBeLessThan(afterPretty)
  }, 120_000)
})
