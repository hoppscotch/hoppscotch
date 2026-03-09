import * as E from "fp-ts/Either"
import { z } from "zod"
import { StoreError } from "@hoppscotch/kernel"
import { Store } from "~/kernel/store"
import { UpdateState, PortableSettings } from "~/types"

export const STORE_NAMESPACE = "hoppscotch-desktop.v1"

export const STORE_KEYS = {
  UPDATE_STATE: "updateState",
  CONNECTION_STATE: "connectionState",
  RECENT_INSTANCES: "recentInstances",
  SCHEMA_VERSION: "schema_version",
  PORTABLE_SETTINGS: "portableSettings",
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

export const PORTABLE_SETTINGS_SCHEMA = z.object({
  disableUpdateNotifications: z.boolean(),
  autoSkipWelcome: z.boolean(),
})

export type InstanceKind = z.infer<typeof INSTANCE_SCHEMA>["kind"]
export type Instance = z.infer<typeof INSTANCE_SCHEMA>
export type ConnectionState = z.infer<typeof CONNECTION_STATE_SCHEMA>

interface Migration {
  version: number
  migrate: () => Promise<void>
}

const migrations: Migration[] = [
  {
    version: 1,
    migrate: async () => {},
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
    return initResult
  }

  private async runMigrations() {
    const versionResult = await Store.get<string>(
      STORE_NAMESPACE,
      STORE_KEYS.SCHEMA_VERSION
    )
    const perhapsVersion = E.isRight(versionResult) ? versionResult.right : "1"
    const currentVersion = perhapsVersion ?? "1"
    const targetVersion = "1"

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

  async setPortableSettings(settings: PortableSettings): Promise<void> {
    console.log("Setting portable settings:", settings)
    const result = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.PORTABLE_SETTINGS,
      settings
    )
    if (E.isLeft(result)) {
      console.error("Failed to save portable settings:", result.left)
      throw new Error(`Failed to save portable settings: ${result.left}`)
    } else {
      console.log("Successfully saved portable settings")
    }
  }

  async getPortableSettings(): Promise<PortableSettings> {
    const result = await Store.get<PortableSettings>(
      STORE_NAMESPACE,
      STORE_KEYS.PORTABLE_SETTINGS
    )

    const defaultSettings = {
      disableUpdateNotifications: false,
      autoSkipWelcome: false,
    }

    if (E.isRight(result) && result.right) {
      console.log("Loaded portable settings from store:", result.right)
      return result.right
    }

    console.log("No portable settings found, using defaults:", defaultSettings)
    return defaultSettings
  }
}
