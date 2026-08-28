/**
 * Scenario B — Collection load (issue #5883).
 *
 * Exercises the REAL renderer code under test for hypothesis H1:
 *   - the production `DispatchingStore` class (`~/newstore/DispatchingStore`)
 *   - the production `useReadonlyStream` composable (`~/composables/stream`)
 *   - real `@hoppscotch/data` collection objects
 *
 * These are wired exactly as `newstore/collections.ts` wires the real
 * `restCollectionStore` / `restCollections$`:
 *     new DispatchingStore(defaultState, dispatchers)
 *     store.subject$.pipe(pluck("state"))
 * and consumed exactly as `components/collections/index.vue:495`:
 *     useReadonlyStream(restCollections$, [], "deep")
 *
 * We deliberately reconstruct the store wiring here rather than importing
 * `newstore/collections.ts` directly: that module pulls in the full app
 * bootstrap (i18n, dioc services, auth) which requires the app's real entry
 * sequence and is unsuitable for a unit-level harness. The deep-clone cost being
 * measured lives entirely in `useReadonlyStream` + `DispatchingStore`, both of
 * which are the genuine production modules imported above.
 *
 * Run with: NODE_OPTIONS=--expose-gc (see package script `bench:memory`).
 */
import { afterAll, afterEach, describe, expect, it } from "vitest"
import { createApp, defineComponent, h, computed, type App } from "vue"
import { pluck } from "rxjs/operators"
import type { HoppCollection } from "@hoppscotch/data"
import DispatchingStore, {
  defineDispatchers,
} from "~/newstore/DispatchingStore"
import { useReadonlyStream } from "~/composables/stream"
import {
  GC_AVAILABLE,
  retainedHeap,
  sampleLoop,
  leakSlope,
  summarize,
  bytesToMB,
} from "../lib/measure"
import { makeCollections } from "../lib/fixtures"
import { record, recordBytes, writeReport } from "../lib/report"
import { resolve } from "node:path"

afterAll(() => {
  if (!GC_AVAILABLE) return
  writeReport(resolve(__dirname, "../results"), "collections")
})

type CloneMode = "noclone" | "shallow" | "deep"
type CollState = { state: HoppCollection[] }

// 1:1 reproduction of the real `setCollections` dispatcher from
// newstore/collections.ts (`setCollections: (_, { entries }) => ({ state: entries })`).
const dispatchers = defineDispatchers({
  setCollections(_: CollState, { entries }: { entries: HoppCollection[] }) {
    return { state: entries }
  },
})

const restCollectionStore = new DispatchingStore<CollState, typeof dispatchers>(
  { state: [] },
  dispatchers
)
const restCollections$ = restCollectionStore.subject$.pipe(pluck("state"))
const setRESTCollections = (entries: HoppCollection[]) =>
  restCollectionStore.dispatch({ dispatcher: "setCollections", payload: { entries } })

// Scaled so the deep-clone effect clears Node heap measurement noise. The effect
// scales linearly with request count; the realistic #5883 size (~20 requests) is
// reported separately for context.
const SCALED = { collections: 6, perCollection: 400 } // ~2400 requests
const REALISTIC = { collections: 1, perCollection: 20 }

/** Minimal stand-in for components/collections/index.vue's collection sidebar. */
function mountSidebar(cloneMode: CloneMode): { app: App; host: HTMLElement } {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      setup() {
        const myCollections = useReadonlyStream(restCollections$, [], cloneMode)
        // Mirrors index.vue's filteredCollections: shallow per-node copies that
        // alias the underlying request objects.
        const filtered = computed(() =>
          (myCollections.value ?? []).map((c) => ({
            ...c,
            folders: c.folders.map((f) => ({ ...f, requests: [...f.requests] })),
            requests: [...c.requests],
          }))
        )
        return () =>
          h("div", `${myCollections.value?.length ?? 0}/${filtered.value.length}`)
      },
    })
  )
  app.mount(host)
  return { app, host }
}

function unmount({ app, host }: { app: App; host: HTMLElement }) {
  app.unmount()
  host.remove()
}

afterEach(() => {
  setRESTCollections([])
})

describe.skipIf(!GC_AVAILABLE)(
  "Scenario B — collection load (H1: deep clone)",
  () => {
    it("quantifies retained overhead of deep clone vs noclone", async () => {
      setRESTCollections(makeCollections(SCALED.collections, SCALED.perCollection))

      const storeOnly = await retainedHeap()

      const noclone = mountSidebar("noclone")
      const withNoClone = await retainedHeap()
      unmount(noclone)

      const deep = mountSidebar("deep")
      const withDeep = await retainedHeap()
      unmount(deep)

      const deepOverhead = withDeep - withNoClone
      const reqCount = SCALED.collections * SCALED.perCollection

      recordBytes(
        `Scenario B / H1 — deep-clone retained overhead (${reqCount} requests)`,
        {
          store_only: storeOnly,
          sidebar_noclone: withNoClone,
          sidebar_deep: withDeep,
          deep_clone_overhead: deepOverhead,
          overhead_per_20_requests: (deepOverhead / reqCount) * 20,
        },
        "deep-clone overhead = extra retained heap from cloneDeep of the whole tree per emission (the H1 cost a fix would reclaim)."
      )

      expect(deepOverhead).toBeGreaterThan(0)
    }, 120_000)

    it("realistic ~20-request collection: reports steady-state retained", async () => {
      setRESTCollections(
        makeCollections(REALISTIC.collections, REALISTIC.perCollection)
      )
      const storeOnly = await retainedHeap()
      const deep = mountSidebar("deep")
      const withDeep = await retainedHeap()
      unmount(deep)
      recordBytes("Scenario B / realistic — ~20-request collection steady state", {
        store_only: storeOnly,
        sidebar_deep: withDeep,
      })
      expect(withDeep).toBeGreaterThan(0)
    }, 60_000)

    it("mutation churn stays flat (leak guard: transient clones are freed)", async () => {
      setRESTCollections(makeCollections(SCALED.collections, SCALED.perCollection))
      const sidebar = mountSidebar("deep")

      const samples = await sampleLoop(
        () => {
          setRESTCollections(
            makeCollections(SCALED.collections, SCALED.perCollection)
          )
        },
        { iterations: 12, warmup: 3 }
      )
      unmount(sidebar)

      const ys = samples.map((s) => s.retainedBytes)
      const slope = leakSlope(ys)
      record({
        label: "Scenario B / churn — repeated whole-tree re-set (leak guard)",
        values: {
          start_MB: bytesToMB(ys[0]),
          end_MB: bytesToMB(ys[ys.length - 1]),
          delta_MB: bytesToMB(ys[ys.length - 1] - ys[0]),
          slope_KB_per_iter: +(slope / 1024).toFixed(1),
        },
        notes: summarize("churn", samples),
      })
      expect(slope).toBeLessThan(200 * 1024)
    }, 180_000)

    it("mount/unmount churn returns to baseline (teardown guard)", async () => {
      setRESTCollections(makeCollections(SCALED.collections, SCALED.perCollection))

      const samples = await sampleLoop(
        () => {
          const s = mountSidebar("deep")
          unmount(s)
        },
        { iterations: 12, warmup: 3 }
      )

      const ys = samples.map((s) => s.retainedBytes)
      const slope = leakSlope(ys)
      record({
        label: "Scenario D-lite — mount/unmount churn (teardown guard)",
        values: {
          start_MB: bytesToMB(ys[0]),
          end_MB: bytesToMB(ys[ys.length - 1]),
          delta_MB: bytesToMB(ys[ys.length - 1] - ys[0]),
          slope_KB_per_iter: +(slope / 1024).toFixed(1),
        },
        notes: summarize("mount/unmount", samples),
      })
      expect(slope).toBeLessThan(200 * 1024)
    }, 180_000)
  }
)
