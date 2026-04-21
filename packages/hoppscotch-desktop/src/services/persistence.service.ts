import * as E from "fp-ts/Either"
import { invoke } from "@tauri-apps/api/core"
import { z } from "zod"
import { StoreError } from "@hoppscotch/kernel"
import {
  DESKTOP_SETTINGS_SCHEMA,
  DESKTOP_SETTINGS_STORE_KEY,
  DESKTOP_SETTINGS_STORE_NAMESPACE,
  type DesktopSettings,
} from "@hoppscotch/common/platform/desktop-settings"
import { Store } from "~/kernel/store"
import { UpdateState, PortableSettings } from "~/types"

export const STORE_NAMESPACE = DESKTOP_SETTINGS_STORE_NAMESPACE

export const STORE_KEYS = {
  UPDATE_STATE: "updateState",
  CONNECTION_STATE: "connectionState",
  RECENT_INSTANCES: "recentInstances",
  SCHEMA_VERSION: "schema_version",
  // Legacy key. Written by portable builds in schema v1. Read only by the
  // v1 to v2 migration. All other code uses `DESKTOP_SETTINGS`.
  PORTABLE_SETTINGS: "portableSettings",
  DESKTOP_SETTINGS: DESKTOP_SETTINGS_STORE_KEY,
} as const

export const UPDATE_STATE_SCHEMA = z.object({
  status: z.enum([
    "idle",
    "checking",
    "available",
    "not_available",
    "downloading",
    "installing",
    "ready_to_restart",
    "error",
  ]),
  version: z.string().optional(),
  message: z.string().optional(),
  progress: z
    .object({
      downloaded: z.number(),
      total: z.number().optional(),
    })
    .optional(),
})

export const INSTANCE_SCHEMA = z.object({
  kind: z.enum(["on-prem", "cloud", "cloud-org", "vendored"]),
  serverUrl: z.string(),
  displayName: z.string(),
  version: z.string(),
  lastUsed: z.string(),
  bundleName: z.string().optional(),
})

export const CONNECTION_STATE_SCHEMA = z.object({
  status: z.enum(["idle", "connecting", "connected", "error"]),
  instance: INSTANCE_SCHEMA.optional(),
  target: z.string().optional(),
  message: z.string().optional(),
})

export type InstanceKind = z.infer<typeof INSTANCE_SCHEMA>["kind"]
export type Instance = z.infer<typeof INSTANCE_SCHEMA>
export type ConnectionState = z.infer<typeof CONNECTION_STATE_SCHEMA>
// Re-export for callers that import from this service. The canonical type
// lives in `@hoppscotch/common/platform/desktop-settings`.
export type { DesktopSettings }

interface Migration {
  version: number
  migrate: () => Promise<void>
}

const migrations: Migration[] = [
  {
    version: 1,
    migrate: async () => {},
  },
  {
    // v1 to v2. Introduces `DesktopSettings` as the single source of truth
    // for all desktop builds. Portable users had `portableSettings` with two
    // fields, standard-build users had nothing. Both land in `desktopSettings`
    // with full defaults for any field not carried over.
    //
    // Legacy `portableSettings` is intentionally left in place. The key is
    // cheap to keep, it preserves a rollback path, and a later migration can
    // prune it once the v2 definition has stabilized.
    version: 2,
    migrate: async () => {
      const legacyResult = await Store.get<Partial<PortableSettings>>(
        STORE_NAMESPACE,
        STORE_KEYS.PORTABLE_SETTINGS
      )
      const legacy =
        E.isRight(legacyResult) && legacyResult.right
          ? legacyResult.right
          : undefined

      const migrated = DESKTOP_SETTINGS_SCHEMA.parse({
        disableUpdateNotifications: legacy?.disableUpdateNotifications,
        autoSkipWelcome: legacy?.autoSkipWelcome,
      })

      const writeResult = await Store.set(
        STORE_NAMESPACE,
        STORE_KEYS.DESKTOP_SETTINGS,
        migrated
      )
      if (E.isLeft(writeResult)) {
        console.error(
          "[PersistenceService] v2 migration failed to write desktopSettings:",
          writeResult.left
        )
      }
    },
  },
]

export class DesktopPersistenceService {
  private static instance: DesktopPersistenceService

  private constructor() {}

  public static getInstance(): DesktopPersistenceService {
    if (!DesktopPersistenceService.instance) {
      DesktopPersistenceService.instance = new DesktopPersistenceService()
    }
    return DesktopPersistenceService.instance
  }

  async init(): Promise<E.Either<StoreError, void>> {
    const initResult = await Store.init()
    if (E.isLeft(initResult)) {
      console.error(
        "[PersistenceService] Failed to initialize store:",
        initResult.left
      )
      return initResult
    }
    await this.runMigrations()
    await this.syncDesktopSettingsToRust()
    return initResult
  }

  /**
   * Push the current `DesktopSettings` to the Rust-side `DESKTOP_CONFIG`
   * mutex via the `set_desktop_config` Tauri command.
   *
   * Rust services that need a live settings value (for example an appload
   * HTTP client's connection timeout, once that consumer lands) lock
   * `DESKTOP_CONFIG` on each read. If this push fails, Rust falls back to
   * compile-time defaults, so failures here are non-fatal.
   *
   * Also called from the webview-side settings UI on every user change.
   */
  private async syncDesktopSettingsToRust(): Promise<void> {
    try {
      const settings = await this.getDesktopSettings()
      await invoke("set_desktop_config", { config: settings })
    } catch (err) {
      console.warn(
        "[PersistenceService] Failed to sync DesktopSettings to Rust:",
        err
      )
    }
  }

  private async runMigrations() {
    const versionResult = await Store.get<string>(
      STORE_NAMESPACE,
      STORE_KEYS.SCHEMA_VERSION
    )
    const perhapsVersion = E.isRight(versionResult) ? versionResult.right : "1"
    const currentVersion = perhapsVersion ?? "1"
    const targetVersion = "2"

    if (currentVersion !== targetVersion) {
      for (const migration of migrations) {
        if (migration.version > parseInt(currentVersion)) {
          await migration.migrate()
        }
      }

      await Store.set(STORE_NAMESPACE, STORE_KEYS.SCHEMA_VERSION, targetVersion)
    }
  }

  async setUpdateState(state: UpdateState): Promise<void> {
    const result = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.UPDATE_STATE,
      state
    )
    if (E.isLeft(result)) {
      console.error("Failed to save update state:", result.left)
    }
  }

  async getUpdateState(): Promise<UpdateState | null> {
    const result = await Store.get<UpdateState>(
      STORE_NAMESPACE,
      STORE_KEYS.UPDATE_STATE
    )
    if (E.isRight(result) && result.right) {
      return result.right
    }
    return null
  }

  async watchUpdateState(
    handler: (state: UpdateState) => void
  ): Promise<() => void> {
    const watcher = await Store.watch(STORE_NAMESPACE, STORE_KEYS.UPDATE_STATE)
    return watcher.on("change", ({ value }: { value?: unknown }) => {
      if (value) {
        handler(value as UpdateState)
      }
    })
  }

  async setConnectionState(state: ConnectionState): Promise<void> {
    const result = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.CONNECTION_STATE,
      state
    )
    if (E.isLeft(result)) {
      console.error("Failed to save connection state:", result.left)
    }
  }

  async getConnectionState(): Promise<ConnectionState | null> {
    const result = await Store.get<ConnectionState>(
      STORE_NAMESPACE,
      STORE_KEYS.CONNECTION_STATE
    )
    if (E.isRight(result) && result.right) {
      return result.right
    }
    return null
  }

  async setRecentInstances(instances: Instance[]): Promise<void> {
    const result = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.RECENT_INSTANCES,
      instances
    )
    if (E.isLeft(result)) {
      console.error("Failed to save recent instances:", result.left)
    }
  }

  async getRecentInstances(): Promise<Instance[]> {
    const result = await Store.get<Instance[]>(
      STORE_NAMESPACE,
      STORE_KEYS.RECENT_INSTANCES
    )
    if (E.isRight(result) && result.right) {
      return result.right
    }
    return []
  }

  async addRecentInstance(instance: Instance): Promise<void> {
    const instances = await this.getRecentInstances()
    const existingIndex = instances.findIndex(
      (i) => i.kind === instance.kind && i.serverUrl === instance.serverUrl
    )

    if (existingIndex >= 0) {
      instances[existingIndex] = {
        ...instance,
        lastUsed: new Date().toISOString(),
      }
    } else {
      instances.unshift({ ...instance, lastUsed: new Date().toISOString() })
    }

    const sortedInstances = instances
      .sort(
        (a, b) =>
          new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      )
      .slice(0, 10)

    await this.setRecentInstances(sortedInstances)
  }

  async removeRecentInstance(serverUrl: string): Promise<void> {
    const instances = await this.getRecentInstances()
    const filtered = instances.filter((i) => i.serverUrl !== serverUrl)
    await this.setRecentInstances(filtered)
  }

  async setDesktopSettings(settings: DesktopSettings): Promise<void> {
    // Parse through the schema on write so any caller passing a loosely-typed
    // object still lands in the store as a fully-validated form.
    const validated = DESKTOP_SETTINGS_SCHEMA.parse(settings)
    const result = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.DESKTOP_SETTINGS,
      validated
    )
    if (E.isLeft(result)) {
      console.error("Failed to save desktop settings:", result.left)
      throw new Error(`Failed to save desktop settings: ${result.left}`)
    }
    // Keep the Rust-side copy in sync for any live consumers.
    await this.syncDesktopSettingsToRust()
  }

  async getDesktopSettings(): Promise<DesktopSettings> {
    const result = await Store.get<unknown>(
      STORE_NAMESPACE,
      STORE_KEYS.DESKTOP_SETTINGS
    )

    // On any read failure, parse error, or missing key: fall back to the
    // full-defaults object. Every field in the schema has a `.default()`, so
    // parsing `{}` yields a valid settings object with current behavior.
    if (E.isLeft(result) || !result.right) {
      return DESKTOP_SETTINGS_SCHEMA.parse({})
    }

    const parsed = DESKTOP_SETTINGS_SCHEMA.safeParse(result.right)
    if (!parsed.success) {
      console.warn(
        "[PersistenceService] desktopSettings in store failed schema validation, falling back to defaults:",
        parsed.error
      )
      return DESKTOP_SETTINGS_SCHEMA.parse({})
    }
    return parsed.data
  }
}
