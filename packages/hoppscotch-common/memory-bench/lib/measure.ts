/**
 * Memory measurement primitives for the renderer heap harness.
 *
 * Truth metric: post-GC retained JS heap. In a browser this is
 * `performance.memory.usedJSHeapSize`; under Node/V8 the faithful equivalent is
 * `process.memoryUsage().heapUsed` taken immediately after a forced GC.
 *
 * Requires the runtime to expose `global.gc` (run Node with `--expose-gc`).
 */

export const GC_AVAILABLE = typeof global.gc === "function"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Force a few GC cycles, yielding to the event loop between them so that
 * finalizers / weakly-held references are actually reclaimed before we read.
 */
export async function forceGC(cycles = 4): Promise<void> {
  if (!GC_AVAILABLE) {
    throw new Error(
      "global.gc is not available — run vitest with NODE_OPTIONS=--expose-gc"
    )
  }
  for (let i = 0; i < cycles; i++) {
    global.gc!()
    // allow microtasks + a macrotask tick so pending frees settle
    await sleep(0)
  }
}

/** Post-GC retained heap in bytes (the primary signal). */
export async function retainedHeap(): Promise<number> {
  await forceGC()
  return process.memoryUsage().heapUsed
}

export const MB = 1024 * 1024
export const bytesToMB = (b: number) => +(b / MB).toFixed(2)

/**
 * Ordinary-least-squares slope of `ys` against iteration index, in bytes per
 * iteration. A near-zero slope across a repeated action loop means "flat" (no
 * leak); a positive slope that scales with the work means the baseline is
 * ratcheting up — i.e. a retained-reference leak.
 */
export function leakSlope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xs = ys.map((_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  return den === 0 ? 0 : num / den
}

export type Sample = { iteration: number; retainedBytes: number }

/**
 * Run `action` `iterations` times, sampling post-GC retained heap after each.
 * `warmup` iterations run first and are excluded from the returned samples so
 * one-time lazy allocations (module init, JIT, pooled buffers) don't masquerade
 * as a leak.
 */
export async function sampleLoop(
  action: (i: number) => void | Promise<void>,
  { iterations, warmup = 2 }: { iterations: number; warmup?: number }
): Promise<Sample[]> {
  for (let i = 0; i < warmup; i++) await action(i)
  const samples: Sample[] = []
  for (let i = 0; i < iterations; i++) {
    await action(i + warmup)
    samples.push({ iteration: i, retainedBytes: await retainedHeap() })
  }
  return samples
}

/** Pretty one-line summary for console output in the harness / PR evidence. */
export function summarize(label: string, samples: Sample[]): string {
  const ys = samples.map((s) => s.retainedBytes)
  const first = ys[0]
  const last = ys[ys.length - 1]
  const slope = leakSlope(ys)
  return [
    `${label}:`,
    `start=${bytesToMB(first)}MB`,
    `end=${bytesToMB(last)}MB`,
    `delta=${bytesToMB(last - first)}MB`,
    `slope=${(slope / 1024).toFixed(1)}KB/iter`,
  ].join(" ")
}
