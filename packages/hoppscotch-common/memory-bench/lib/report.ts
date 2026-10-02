/**
 * Collects harness results and writes them to disk as JSON (machine-readable,
 * for CI diffing) and Markdown (human-readable, for PR evidence). Vitest 4
 * suppresses in-test console output on non-TTY runs, so writing to a file is the
 * reliable way to surface the numbers.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { bytesToMB } from "./measure"

export type Metric = {
  label: string
  /** Free-form numeric fields in MB or other units, keyed by name. */
  values: Record<string, number>
  notes?: string
}

const metrics: Metric[] = []

export function record(metric: Metric): void {
  metrics.push(metric)
}

/** Record a set of byte-valued measurements, auto-converted to MB. */
export function recordBytes(
  label: string,
  bytes: Record<string, number>,
  notes?: string
): void {
  const values: Record<string, number> = {}
  for (const [k, v] of Object.entries(bytes)) values[`${k}_MB`] = bytesToMB(v)
  record({ label, values, notes })
}

export function writeReport(
  outDir: string,
  name = "latest"
): { json: string; md: string } {
  const jsonPath = resolve(outDir, `${name}.json`)
  const mdPath = resolve(outDir, `${name}.md`)
  mkdirSync(dirname(jsonPath), { recursive: true })

  const payload = {
    generatedAtNote:
      "post-GC retained JS heap (process.memoryUsage().heapUsed after global.gc())",
    node: process.version,
    metrics,
  }
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + "\n")

  const lines: string[] = [
    "# Memory harness — latest results",
    "",
    "Primary metric: **post-GC retained JS heap** (`heapUsed` after forced GC).",
    `Node ${process.version}.`,
    "",
  ]
  for (const m of metrics) {
    lines.push(`## ${m.label}`, "")
    for (const [k, v] of Object.entries(m.values)) lines.push(`- ${k}: ${v}`)
    if (m.notes) lines.push("", m.notes)
    lines.push("")
  }
  writeFileSync(mdPath, lines.join("\n") + "\n")
  // Clear so a subsequent spec file (shared module registry under isolate:false)
  // starts with a clean slate.
  metrics.length = 0
  return { json: jsonPath, md: mdPath }
}
