import { BehaviorSubject, Observable } from "rxjs"
import { computed } from "vue"
import { LazyStore } from "@tauri-apps/plugin-store"
import {
  getInstanceDir,
  getConfigDir,
  getStoreDir,
  getLatestDir,
  Store,
} from "~/kernel/store"
import * as E from "fp-ts/Either"
import { join } from "@tauri-apps/api/path"
import { exists, copyFile, remove, readDir, mkdir } from "@tauri-apps/plugin-fs"

const STORE_NAMESPACE = "hoppscotch-desktop.v1"
const MIGRATION_NAMESPACE = "migration.v1"
const CURRENT_STORE_VERSION = 1

type LegacyServerInstance = {
  type: "server"
  serverUrl: string
  displayName: string
  version: string
  lastUsed: string
  bundleName?: string
}

type LegacyCloudInstance = {
  type: "cloud"
  displayName: string
  version: string
}

type LegacyInstanceKind = LegacyServerInstance | LegacyCloudInstance

type LegacyConnectionState =
  | { status: "idle" }
  | { status: "connecting"; target: string }
  | { status: "connected"; instance: LegacyInstanceKind }
  | { status: "error"; target: string; message: string }

type LegacyUpdateState = {
  status: string
  version?: string
  message?: string
  progress?: {
    downloaded: number
    total?: number
  }
}

export type InstanceKind = "on-prem" | "cloud" | "cloud-org" | "vendored"

export type Instance = {
  kind: InstanceKind
  serverUrl: string
  displayName: string
  version: string
  lastUsed: string
  bundleName?: string
}

export type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; target: string }
  | { status: "connected"; instance: Instance }
  | { status: "error"; target: string; message: string }

export type MigrationStatus =
  | { status: "pending" }
  | { status: "in-progress" }
  | { status: "completed" }
  | { status: "failed"; error: string }

export class InstanceStoreMigrationService {
  private static instance: InstanceStoreMigrationService
  private status$ = new BehaviorSubject<MigrationStatus>({ status: "pending" })
  private migrationLock = false

  private constructor() {}

  public static getInstance(): InstanceStoreMigrationService {
    if (!InstanceStoreMigrationService.instance) {
      InstanceStoreMigrationService.instance =
        new InstanceStoreMigrationService()
    }
    return InstanceStoreMigrationService.instance
  }

  async initialize(): Promise<void> {
    if (this.migrationLock) {
      console.log("Migration already in progress, skipping...")
      return
    }

    this.migrationLock = true

    try {
      const initResult = await Store.init()
      if (E.isLeft(initResult)) {
        console.error(`Failed to initialize kernel store: ${initResult.left}`)
        // Don't fail the migration, just log and continue,
        // since there's a chance no services have started just yet,
        // better to continue and fail with legitimate critical reasons,
        // rather than failing here and not being able to see the actual cause.
      }

      const isMigrated = await this.isMigrationComplete()
      if (isMigrated) {
        console.log("Migration already completed")
        this.status$.next({ status: "completed" })
        return
      }

      await this.performMigration()
    } catch (error) {
      console.error("Migration error:", error)
      // Even if migration fails, mark as completed to prevent retry loops,
      // so there won't be partial state from the "source".
      // There's always a way to restart migration is the source is safe.
      await this.markMigrationComplete()
      this.status$.next({ status: "completed" })
    } finally {
      this.migrationLock = false
    }
  }

  private async isMigrationComplete(): Promise<boolean> {
    try {
      const versionResult = await Store.get<number>(
        MIGRATION_NAMESPACE,
        "migrationVersion"
      )
      const currentVersion = E.isRight(versionResult)
        ? versionResult.right || 0
        : 0
      return currentVersion >= CURRENT_STORE_VERSION
    } catch {
      return false
    }
  }

  private async markMigrationComplete(): Promise<void> {
    try {
      await Store.set(
        MIGRATION_NAMESPACE,
        "migrationVersion",
        CURRENT_STORE_VERSION
      )
    } catch (error) {
      console.error("Failed to mark migration as complete:", error)
    }
  }

  private async performMigration(): Promise<void> {
    this.status$.next({ status: "in-progress" })

    try {
      // Ensure directory structure exists
      // (shouldn't fail, but good to check just in case)
      await this.ensureDirectoryStructure()

      // Migrate data from old stores.
      // NOTE: This can fail if the store is using default path,
      // and not the full specificed path.
      // Remember to check that first.
      await this.migrateDataSafely()

      // Move .hoppscotch.store files
      // (shouldn't fail, but good to check just in case)
      await this.migrateHoppscotchStoreFiles()

      // Mark migration as complete before cleanup
      // (shouldn't fail, but good to check just in case)
      await this.markMigrationComplete()

      // Clean up old files
      // (best effort, don't fail if this fails)
      await this.cleanupOldFilesSafely()

      this.status$.next({ status: "completed" })
      console.log("Migration completed successfully")
    } catch (error) {
      console.error("Migration failed:", error)
      // Mark as completed anyway to prevent retry loops
      // (same reasoning as in init)
      await this.markMigrationComplete()
      this.status$.next({ status: "completed" })
    }
  }

  private async ensureDirectoryStructure(): Promise<void> {
    try {
      const latestDir = await getLatestDir()
      const storeDir = await getStoreDir()
      const instanceDir = await getInstanceDir()

      // Create directories if they don't exist
      for (const dir of [latestDir, storeDir, instanceDir]) {
        try {
          const dirExists = await exists(dir)
          if (!dirExists) {
            await mkdir(dir, { recursive: true })
            console.log(`Created directory: ${dir}`)
          }
        } catch (error) {
          // Directory might already exist or parent might not exist
          console.log(`Directory ${dir} might already exist:`, error)
        }
      }
    } catch (error) {
      console.error("Failed to ensure directory structure:", error)
      // Continue anyway, directories might already exist
    }
  }

  private async migrateDataSafely(): Promise<void> {
    const configDir = await getConfigDir()

    const hoppStorePath = await join(configDir, "hopp.store.json")
    const desktopStorePath = await join(configDir, "hoppscotch-desktop.store")

    let connectionState: ConnectionState = { status: "idle" }
    let recentInstances: Instance[] = []
    let updateState: any = null

    // Read from hopp.store.json if it exists
    try {
      if (await exists(hoppStorePath)) {
        const hoppStore = new LazyStore(hoppStorePath)
        await hoppStore.init()

        const hoppState =
          await hoppStore.get<LegacyConnectionState>("connectionState")
        if (hoppState && hoppState.status === "connected") {
          connectionState = {
            status: "connected",
            instance: this.convertInstanceToNewFormat(hoppState.instance),
          }
        }

        const legacyInstances =
          await hoppStore.get<LegacyServerInstance[]>("recentInstances")
        if (legacyInstances) {
          recentInstances = legacyInstances.map((inst) =>
            this.convertInstanceToNewFormat(inst)
          )
        }
      }
    } catch (error) {
      console.log("Could not read hopp.store.json:", error)
    }

    // Read from hoppscotch-desktop.store if it exists
    try {
      if (await exists(desktopStorePath)) {
        const desktopStore = new LazyStore(desktopStorePath)
        await desktopStore.init()

        // Only override connection state if we didn't get one from hopp.store
        if (connectionState.status === "idle") {
          const desktopState =
            await desktopStore.get<LegacyConnectionState>("connectionState")
          if (desktopState && desktopState.status === "connected") {
            connectionState = {
              status: "connected",
              instance: this.convertInstanceToNewFormat(desktopState.instance),
            }
          }
        }

        updateState = await desktopStore.get<LegacyUpdateState>("updateState")
      }
    } catch (error) {
      console.log("Could not read hoppscotch-desktop.store:", error)
    }

    try {
      await Store.set(STORE_NAMESPACE, "connectionState", connectionState)
      console.log("Migrated connection state")
    } catch (error) {
      console.error("Failed to save connection state:", error)
    }

    try {
      await Store.set(STORE_NAMESPACE, "recentInstances", recentInstances)
      console.log(`Migrated ${recentInstances.length} recent instances`)
    } catch (error) {
      console.error("Failed to save recent instances:", error)
    }

    if (updateState) {
      try {
        await Store.set(STORE_NAMESPACE, "updateState", updateState)
        console.log("Migrated update state")
      } catch (error) {
        console.error("Failed to save update state:", error)
      }
    }
  }

  private async migrateHoppscotchStoreFiles(): Promise<void> {
    try {
      const configDir = await getConfigDir()
      const storeDir = await getStoreDir()

      const entries = await readDir(configDir)
      const storeFiles = entries
        .filter(
          (entry: any) =>
            !entry.isDirectory && entry.name.endsWith(".hoppscotch.store")
        )
        .map((entry: any) => entry.name)

      for (const fileName of storeFiles) {
        try {
          const sourcePath = await join(configDir, fileName)
          const targetPath = await join(storeDir, fileName)

          // Check if source still exists and target doesn't
          const sourceExists = await exists(sourcePath)
          const targetExists = await exists(targetPath)

          if (sourceExists && !targetExists) {
            await copyFile(sourcePath, targetPath)
            console.log(`Migrated ${fileName} to store directory`)
          } else if (sourceExists && targetExists) {
            console.log(`${fileName} already exists in target, skipping`)
          }
        } catch (error) {
          console.error(`Failed to migrate ${fileName}:`, error)
          // Continue with other files
        }
      }
    } catch (error) {
      console.error("Failed to migrate .hoppscotch.store files:", error)
      // Non-critical, continue
    }
  }

  private async cleanupOldFilesSafely(): Promise<void> {
    const configDir = await getConfigDir()

    // List of files to potentially remove
    const filesToClean = ["hopp.store.json", "hoppscotch-desktop.store"]

    for (const fileName of filesToClean) {
      try {
        const filePath = await join(configDir, fileName)
        if (await exists(filePath)) {
          await remove(filePath)
          console.log(`Cleaned up old file: ${fileName}`)
        }
      } catch (error) {
        console.log(`Could not remove ${fileName}:`, error)
        // Non-critical, continue
      }
    }

    // Also clean up .hoppscotch.store files that were successfully migrated
    try {
      const storeDir = await getStoreDir()
      const entries = await readDir(configDir)
      const storeFiles = entries
        .filter(
          (entry: any) =>
            !entry.isDirectory && entry.name.endsWith(".hoppscotch.store")
        )
        .map((entry: any) => entry.name)

      for (const fileName of storeFiles) {
        try {
          const sourcePath = await join(configDir, fileName)
          const targetPath = await join(storeDir, fileName)

          // Only remove if successfully copied to target
          if ((await exists(targetPath)) && (await exists(sourcePath))) {
            await remove(sourcePath)
            console.log(`Cleaned up migrated file: ${fileName}`)
          }
        } catch (error) {
          console.log(`Could not remove ${fileName}:`, error)
        }
      }
    } catch (error) {
      console.log("Could not clean up .hoppscotch.store files:", error)
    }
  }

  private convertInstanceToNewFormat(
    legacyInstance: LegacyInstanceKind
  ): Instance {
    if (legacyInstance.type === "cloud") {
      return {
        kind: "cloud",
        serverUrl: "hoppscotch.io",
        displayName: legacyInstance.displayName,
        version: legacyInstance.version,
        lastUsed: new Date().toISOString(),
      }
    } else {
      return {
        kind: "on-prem",
        serverUrl: legacyInstance.serverUrl,
        displayName: legacyInstance.displayName,
        version: legacyInstance.version,
        lastUsed: legacyInstance.lastUsed,
        bundleName: legacyInstance.bundleName,
      }
    }
  }

  public getMigrationStatusStream(): Observable<MigrationStatus> {
    return this.status$
  }

  public getMigrationStatus() {
    return computed(() => this.status$.value)
  }

  public isMigrationCompleted() {
    return computed(() => this.status$.value.status === "completed")
  }

  public getMigrationError() {
    return computed(() => {
      const status = this.status$.value
      return status.status === "failed" ? status.error : null
    })
  }
}
