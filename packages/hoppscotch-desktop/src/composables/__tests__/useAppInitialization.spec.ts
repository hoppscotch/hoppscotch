import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Instance } from "@hoppscotch/common/platform/instance"

type LoadCall = { bundleName: string; host?: string }

const { load, download, close } = vi.hoisted(() => ({
  load: vi.fn<
    (opts: { bundleName: string; host?: string }) => Promise<unknown>
  >(async () => ({ success: true, windowLabel: "instance" })),
  download: vi.fn<(opts: { serverUrl: string }) => Promise<unknown>>(
    async () => ({
      version: "26.8.0",
      bundleName: "acme",
    })
  ),
  close: vi.fn<(opts: { windowLabel: string }) => void>(),
}))

vi.mock("@hoppscotch/plugin-appload", () => ({ load, download, close }))

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: async () => "26.8.0",
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: async () => undefined,
}))

vi.mock("~/services/instance-store-migration.service", () => ({
  InstanceStoreMigrationService: {
    getInstance: () => ({
      initialize: async () => undefined,
      getMigrationStatus: () => ({ value: { status: "completed" } }),
      getMigrationError: () => ({ value: null }),
    }),
  },
}))

vi.mock("@hoppscotch/common/composables/desktop-settings", () => ({
  useDesktopSettings: () => ({
    ready: async () => undefined,
    settings: { zoomLevel: 1.0 },
  }),
}))

// One in-memory value per store key, standing in for the Tauri store the
// launcher and the instance webviews share on disk.
const store = {
  connectionState: null as unknown,
  recentInstances: [] as Instance[],
  instanceAuthFailure: null as string | null,
}

const resource = <K extends keyof typeof store>(key: K) => ({
  get: async () => store[key],
  set: async (value: (typeof store)[K]) => {
    store[key] = value
  },
  watch: async () => () => undefined,
})

vi.mock("~/services/persistence.service", () => ({
  DesktopPersistenceService: {
    getInstance: () => ({
      connectionState: resource("connectionState"),
      recentInstances: resource("recentInstances"),
      instanceAuthFailure: resource("instanceAuthFailure"),
      init: async () => ({ _tag: "Right", right: undefined }),
    }),
  },
}))

const { useAppInitialization } = await import("../useAppInitialization")

const ORG_INSTANCE: Instance = {
  kind: "cloud-org",
  serverUrl: "https://acme.example.com",
  displayName: "Acme",
  version: "26.8.0",
  lastUsed: "2026-08-20T00:00:00.000Z",
  bundleName: "Hoppscotch",
}

// A cloud-org resume calls `load` with the instance's `serverUrl` as `host`,
// where the vendored fallback calls it with no host at all, so the presence
// of `host` is what separates the two outcomes.
const resumedHosts = () =>
  load.mock.calls
    .map(([opts]) => (opts as LoadCall).host)
    .filter((host): host is string => host !== undefined)

describe("loadRecent auth probe", () => {
  beforeEach(() => {
    store.connectionState = { status: "connected", instance: ORG_INSTANCE }
    store.recentInstances = [ORG_INSTANCE]
    store.instanceAuthFailure = null
    load.mockClear()
    close.mockClear()
  })

  // The launcher read side ships ahead of the enterprise writer that records
  // a failure, so on every OSS launch the record is absent and startup has
  // to behave as it did before the probe existed. Adding the writer later
  // fails this test if it changes that.
  it("resumes the connected instance when no auth failure is recorded", async () => {
    await useAppInitialization().loadRecent()

    expect(resumedHosts()).toEqual([ORG_INSTANCE.serverUrl])
  })

  it("resumes when the recorded failure belongs to another instance", async () => {
    store.instanceAuthFailure = "https://other.example.com"

    await useAppInitialization().loadRecent()

    expect(resumedHosts()).toEqual([ORG_INSTANCE.serverUrl])
  })

  it("resumes when the record is unreadable", async () => {
    const initialization = useAppInitialization()
    vi.spyOn(
      initialization.persistence.instanceAuthFailure,
      "get"
    ).mockRejectedValueOnce(new Error("store unavailable"))

    await initialization.loadRecent()

    expect(resumedHosts()).toEqual([ORG_INSTANCE.serverUrl])
  })

  // The contract the enterprise writer targets. A recorded failure for the
  // instance about to be resumed routes startup to the vendored app, whose
  // header renders the instance switcher, and the record is consumed so a
  // later manual reconnect is not blocked.
  it("loads vendored and clears the record on a matching failure", async () => {
    store.instanceAuthFailure = ORG_INSTANCE.serverUrl

    await useAppInitialization().loadRecent()

    expect(resumedHosts()).toEqual([])
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ bundleName: "Hoppscotch" })
    )
    expect(store.instanceAuthFailure).toBeNull()
  })

  // The webview and the launcher record the same server through different
  // flows, so the two spellings have to compare equal.
  it("matches a recorded failure that differs by case and trailing slash", async () => {
    store.instanceAuthFailure = "https://ACME.example.com/desktop-app-server/"

    await useAppInitialization().loadRecent()

    expect(resumedHosts()).toEqual([])
  })

  // `vendored` runs offline and default `cloud` stays usable signed out, so
  // neither is probed and a stale record cannot divert them.
  it("skips the probe for instances that need no auth", async () => {
    const staleRecord = "https://acme.example.com"
    store.instanceAuthFailure = staleRecord
    store.connectionState = {
      status: "connected",
      instance: { ...ORG_INSTANCE, kind: "cloud" },
    }

    await useAppInitialization().loadRecent()

    expect(store.instanceAuthFailure).toBe(staleRecord)
  })
})
