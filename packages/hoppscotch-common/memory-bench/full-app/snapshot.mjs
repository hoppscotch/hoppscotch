/**
 * Diagnostic: render N large JSON responses (closing the tab between each), then
 * take a CDP heap snapshot and histogram retained object class-names + count large
 * retained strings. Identifies WHAT survives tab close (the retainer behind the
 * measured large-response leak). Diagnostic only — not part of the committed suite.
 */
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { writeFileSync, readFileSync, rmSync } from "node:fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_URL = process.env.APP_URL ?? "http://localhost:3000/"
const SRC = "/@fs" + resolve(__dirname, "../../src")
const BODY_MB = Number(process.env.BODY_MB ?? 2)
const ROUNDS = Number(process.env.ROUNDS ?? 2)
const SNAP = resolve(__dirname, "heap.heapsnapshot")

const browser = await chromium.launch({
  headless: true,
  args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"],
})
const page = await browser.newPage()
const client = await page.context().newCDPSession(page)
await client.send("HeapProfiler.enable")

await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 })
await page.waitForTimeout(6000)

for (let r = 0; r < ROUNDS; r++) {
  await page.evaluate(
    async ({ SRC, mb }) => {
      const dioc = await import(`${SRC}/modules/dioc.ts`)
      const { RESTTabService } = await import(`${SRC}/services/tab/rest.ts`)
      const { getDefaultRESTRequest } = await import(`${SRC}/helpers/rest/default.ts`)
      const tabs = dioc.getService(RESTTabService)
      const tab = tabs.createNewTab(
        { type: "request", request: getDefaultRESTRequest(), isDirty: false, optionTabPreference: "params" },
        true
      )
      const rows = []
      let approx = 0, i = 0
      while (approx < mb * 1024 * 1024) {
        rows.push({ id: i, name: `Resource ${i}`, email: `u${i}@x.io`, tags: ["a", "b", `t${i}`], nested: { a: i, c: [i, i + 1] } })
        approx += 120; i++
      }
      const body = new TextEncoder().encode(JSON.stringify({ data: rows })).buffer
      tab.document.response = {
        type: "success",
        headers: [{ key: "content-type", value: "application/json" }],
        body, statusCode: 200, statusText: "OK",
        meta: { responseSize: body.byteLength, responseDuration: 8 },
        req: tab.document.request,
      }
      window.__tid = tab.id
    },
    { SRC, mb: BODY_MB }
  )
  await page.waitForTimeout(3500)
  await page.evaluate(async ({ SRC }) => {
    const dioc = await import(`${SRC}/modules/dioc.ts`)
    const { RESTTabService } = await import(`${SRC}/services/tab/rest.ts`)
    const tabs = dioc.getService(RESTTabService)
    tabs.closeTab(window.__tid)
    if (Array.isArray(tabs.recentlyClosedTabs)) tabs.recentlyClosedTabs.length = 0
  }, { SRC })
  await page.waitForTimeout(600)
}
for (let i = 0; i < 5; i++) { await client.send("HeapProfiler.collectGarbage"); await page.waitForTimeout(40) }

// Collect the snapshot.
const chunks = []
const onChunk = (p) => chunks.push(p.chunk)
client.on("HeapProfiler.addHeapSnapshotChunk", onChunk)
await client.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false })
client.off("HeapProfiler.addHeapSnapshotChunk", onChunk)
writeFileSync(SNAP, chunks.join(""))
await browser.close()

// Parse: node_fields = [type, name, id, self_size, edge_count, ...]; name -> strings[].
const snap = JSON.parse(readFileSync(SNAP, "utf8"))
const { node_fields, node_types } = snap.snapshot.meta
const nFields = node_fields.length
const nameIdx = node_fields.indexOf("name")
const typeIdx = node_fields.indexOf("type")
const sizeIdx = node_fields.indexOf("self_size")
const typeEnum = node_types[typeIdx]
const nodes = snap.nodes
const strings = snap.strings

const classSize = new Map()
const classCount = new Map()
const WATCH = ["_EditorView", "_EditorState", "ViewState", "EffectScope", "ComputedRefImpl", "ReactiveEffect"]
const watchCount = new Map(WATCH.map((w) => [w, 0]))
let bigStrings = 0
let bigStringBytes = 0
for (let i = 0; i < nodes.length; i += nFields) {
  const type = typeEnum[nodes[i + typeIdx]]
  const name = strings[nodes[i + nameIdx]]
  const size = nodes[i + sizeIdx]
  if (type === "object" || type === "native") {
    classSize.set(name, (classSize.get(name) || 0) + size)
    classCount.set(name, (classCount.get(name) || 0) + 1)
    if (watchCount.has(name)) watchCount.set(name, watchCount.get(name) + 1)
  }
  if (type === "string" && size > 1_000_000) {
    bigStrings++
    bigStringBytes += size
  }
}
const top = [...classSize.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)

// --- Retaining-path analysis for the largest retained strings ---
const { edge_fields, edge_types } = snap.snapshot.meta
const eFields = edge_fields.length
const eTypeIdx = edge_fields.indexOf("type")
const eNameIdx = edge_fields.indexOf("name_or_index")
const eToIdx = edge_fields.indexOf("to_node")
const edgeTypeEnum = edge_types[eTypeIdx]
const edges = snap.edges
const nodeCount = nodes.length / nFields

// Forward edges are stored in node order; each node consumes edge_count edges.
const edgeCountIdx = node_fields.indexOf("edge_count")
const firstEdge = new Uint32Array(nodeCount) // index (in edge ordinals) of node's first edge
let acc = 0
for (let n = 0; n < nodeCount; n++) {
  firstEdge[n] = acc
  acc += nodes[n * nFields + edgeCountIdx]
}
// Reverse adjacency: child node ordinal -> array of [parentOrdinal, edgeName]
const parents = new Map()
for (let n = 0; n < nodeCount; n++) {
  const ec = nodes[n * nFields + edgeCountIdx]
  const base = firstEdge[n] * eFields
  for (let e = 0; e < ec; e++) {
    const off = base + e * eFields
    const toNodeIndex = edges[off + eToIdx] // index into nodes array
    const child = toNodeIndex / nFields
    const etype = edgeTypeEnum[edges[off + eTypeIdx]]
    const nameOrIdx = edges[off + eNameIdx]
    const ename = etype === "element" || etype === "hidden" ? `[${nameOrIdx}]` : strings[nameOrIdx]
    let arr = parents.get(child)
    if (!arr) parents.set(child, (arr = []))
    if (arr.length < 6) arr.push([n, `${etype}:${ename}`])
  }
}
const nodeName = (n) => `${typeEnum[nodes[n * nFields + typeIdx]]} ${strings[nodes[n * nFields + nameIdx]]}`.trim()

function retainingPath(startOrdinal) {
  // BFS backward toward a root; report first path that reaches a GC-rootish node.
  const seen = new Set([startOrdinal])
  const q = [[startOrdinal, []]]
  let best = null
  while (q.length) {
    const [cur, path] = q.shift()
    const ps = parents.get(cur)
    if (!ps || path.length > 18) {
      if (!best) best = path
      continue
    }
    for (const [p, ename] of ps) {
      const nm = nodeName(p)
      const step = `${ename} <- ${nm}`
      if (/Window|GC roots|\(global|Document DOM tree|\(Documents\)/.test(nm)) {
        return [...path, step]
      }
      if (!seen.has(p)) {
        seen.add(p)
        q.push([p, [...path, step]])
      }
    }
  }
  return best || []
}

// Find largest string nodes and trace them.
const stringNodes = []
for (let i = 0; i < nodeCount; i++) {
  if (typeEnum[nodes[i * nFields + typeIdx]] === "string") {
    const sz = nodes[i * nFields + sizeIdx]
    if (sz > 1_000_000) stringNodes.push([i, sz])
  }
}
stringNodes.sort((a, b) => b[1] - a[1])
const traced = stringNodes.slice(0, 3).map(([ord, sz]) => ({
  sizeMB: +(sz / 1048576).toFixed(1),
  preview: strings[nodes[ord * nFields + nameIdx]]?.slice(0, 40),
  retainingPath: retainingPath(ord).slice(0, 12),
}))

console.log(JSON.stringify({
  rounds: ROUNDS,
  bodyMB: BODY_MB,
  bigStringsOver1MB: bigStrings,
  bigStringTotalMB: +(bigStringBytes / 1048576).toFixed(1),
  topRetainedClassesBySelfSize: top.map(([n, s]) => `${n}: ${(s / 1048576).toFixed(1)} MB`),
  watchedInstanceCounts: Object.fromEntries(WATCH.map((w) => [w, watchCount.get(w)])),
  largestStringRetainers: traced,
}, null, 2))
rmSync(SNAP, { force: true })
