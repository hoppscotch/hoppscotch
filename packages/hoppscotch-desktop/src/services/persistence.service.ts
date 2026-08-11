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
import {
  UPDATE_STATE_SCHEMA,
  UPDATE_STATE_STORE_KEY,
} from "@hoppscotch/common/platform/update-state"
import type { Instance } from "@hoppscotch/common/platform/instance"
import { Log } from "@hoppscotch/common/kernel/log"

import { Store } from "~/kernel/store"
import {
  createStoreResource,
  type StoreResource,
} from "~/kernel/store-resource"
import type { UpdateState } from "~/types"

const LOG_TAG = "persistence"

// Shared namespace for every desktop-local store resource. Individual keys
// live in `STORE_KEYS` below. Exported for the small handful of callers
// that still touch the store directly.
export const STORE_NAMESPACE = DESKTOP_SETTINGS_STORE_NAMESPACE

export const STORE_KEYS = {
  UPDATE_STATE: UPDATE_STATE_STORE_KEY,
  CONNECTION_STATE: "connectionState",
  RECENT_INSTANCES: "recentInstances",
  SCHEMA_VERSION: "schema_version",
  // Legacy key. Written by portable builds in schema v1. Read only by the
  // v1 to v2 migration. All other code uses `DESKTOP_SETTINGS`.
  PORTABLE_SETTINGS: "portableSettings",
  DESKTOP_SETTINGS: DESKTOP_SETTINGS_STORE_KEY,
} as const

// Runtime validator for `Instance` values read from the store. The type
// annotation pins the Zod output to the canonical `Instance` in common,
// so any drift between the definition stored here and the definition
// consumed by the webview's instance service would fail typecheck
// rather than silently producing a mismatched runtime value.
export const INSTANCE_SCHEMA: z.ZodType<Instance> = z.object({
  kind: z.enum(["on-prem", "cloud", "cloud-org", "vendored"]),
  serverUrl: z.string(),
  displayName: z.string(),
  version: z.string(),
  lastUsed: z.string(),
  bundleName: z.string().optional(),
})

// Runtime definition of the persisted connection state. NOTE: the
// canonical `ConnectionState` type in
// `@hoppscotch/common/platform/instance.ts` is a discriminated union,
// while the persisted form here is flat with optional fields per
// variant. The two are semi-compatible (the union serializes cleanly
// into this flat form), but the reader loses type narrowing. A later
// migration can switch the persisted form to a discriminated union so
// common's type becomes the single source of truth end-to-end.
export const PERSISTED_CONNECTION_STATE_SCHEMA = z.object({
  status: z.enum(["idle", "connecting", "connected", "error"]),
  instance: INSTANCE_SCHEMA.optional(),
  target: z.string().optional(),
  message: z.string().optional(),
})

export type PersistedConnectionState = z.infer<
  typeof PERSISTED_CONNECTION_STATE_SCHEMA
>

// Re-exported for callers that import from this service. The canonical type
// lives in `@hoppscotch/common/platform/desktop-settings`.
export type { DesktopSettings }

// Legacy `PortableSettings` interface. Kept as a local type (not
// exported, not re-exported from `~/types`) because the v2 migration
// is the only reader and no new code should produce this form. Once
// the migration is retired this type can be dropped entirely.
interface LegacyPortableSettings {
  disableUpdateNotifications: boolean
  autoSkipWelcome: boolean
}

interface Migration {
  version: number
  // Each migration returns its result as an `Either` so the surrounding
  // `runMigrations` loop, and in turn `init`, can propagate the
  // `StoreError` contract without falling back to throws.
  migrate: () => Promise<E.Either<StoreError, void>>
}

const migrations: Migration[] = [
  {
    version: 1,
    migrate: async () => E.right(undefined),
  },
  {
    // v1 to v2. Introduces `DesktopSettings` as the single source of truth
    // for all desktop builds. Portable users had `portableSettings` with two
    // fields, standard-build users had nothing. Both land in `desktopSettings`
    // with full defaults for any field not carried over.
    //
    // Legacy `portableSettings` is intentionally left in place. The key
    // is cheap to keep, it preserves a rollback path, and a later
    // migration can prune it once the v2 definition has stabilized.
    version: 2,
    migrate: async () => {
      // Decide whether to skip based on the existing `desktopSettings`
      // payload. Two paths can re-run this migration after it succeeded
      // once. A user downgrades to a pre-v2 build, which resets
      // `SCHEMA_VERSION` to "1" because the older code does not
      // recognize "2" and rolls it back. A re-upgrade then sees v1
      // again and tries to migrate. The other path is a corrupted
      // `SCHEMA_VERSION` value, which the `runMigrations` parse-defense
      // coerces to "1" so every migration reruns from scratch. In both
      // cases, blindly running the legacy carry-forward would
      // overwrite any user-set v2 fields with
      // `disableUpdateNotifications` plus schema defaults, undoing the
      // user's work.
      //
      // Three reachable cases here, each handled explicitly. A `Left`
      // from `Store.get` means the store is degraded (file I/O
      // failure, or not yet open) and there is no way to tell whether
      // v2 already ran. Propagating the `Left` aborts the migration
      // before `runMigrations` bumps `SCHEMA_VERSION`, so the next
      // launch retries on a hopefully-recovered store. A `Right` with
      // a present and schema-valid payload is the canonical "v2
      // already happened" signal, since the migration itself is what
      // writes a valid payload, so a stored value implies the
      // migration ran successfully at least once. A `Right` with
      // either no payload (fresh install) or a malformed payload
      // (partial object, wrong field types) falls through to the
      // legacy carry-forward, which writes a fresh schema-defaults
      // `desktopSettings` and self-heals the corruption.
      const existingResult = await Store.get<unknown>(
        STORE_NAMESPACE,
        STORE_KEYS.DESKTOP_SETTINGS
      )
      if (E.isLeft(existingResult)) {
        return existingResult
      }
      if (
        existingResult.right !== undefined &&
        DESKTOP_SETTINGS_SCHEMA.safeParse(existingResult.right).success
      ) {
        return E.right(undefined)
      }

      const legacyResult = await Store.get<Partial<LegacyPortableSettings>>(
        STORE_NAMESPACE,
        STORE_KEYS.PORTABLE_SETTINGS
      )
      const legacy =
        E.isRight(legacyResult) && legacyResult.right
          ? legacyResult.right
          : undefined

      // Use `safeParse` with a defaults fallback. `Store.get` returns
      // the raw JSON value cast to the generic without validation, so
      // a corrupted legacy entry (for example a stringified boolean
      // left behind by an older build) would throw from `.parse` and
      // abort the full persistence init. Falling back to a fresh
      // defaults parse keeps the migration progressing on bad data.
      const parsed = DESKTOP_SETTINGS_SCHEMA.safeParse({
        disableUpdateNotifications: legacy?.disableUpdateNotifications,
        autoSkipWelcome: legacy?.autoSkipWelcome,
      })
      const migrated = parsed.success
        ? parsed.data
        : DESKTOP_SETTINGS_SCHEMA.parse({})

      const writeResult = await Store.set(
        STORE_NAMESPACE,
        STORE_KEYS.DESKTOP_SETTINGS,
        migrated
      )
      if (E.isLeft(writeResult)) {
        // Return Left so `runMigrations` aborts before recording the
        // new `SCHEMA_VERSION`. Swallowing here would let the loop
        // bump the version despite the failed write, and the next
        // launch would treat the data as already migrated and never
        // retry.
        Log.error(
          LOG_TAG,
          "v2 migration failed to write desktopSettings",
          writeResult.left
        )
        return writeResult
      }
      return E.right(undefined)
    },
  },
]

/**
 * Facade over the desktop-local persistent store.
 *
 * Each persistent value is exposed as a `StoreResource<T>`, which
 * carries a uniform `{ get, set, watch }` API validated through a Zod
 * schema. The service itself is a thin orchestrator. It runs
 * schema-version migrations on init, subscribes once to the
 * desktop-settings resource so the Rust mailbox stays in sync with any
 * writer, and exposes the resources as readonly members.
 *
 * Callers move from `persistence.setFoo(value)` to `persistence.foo.set(value)`
 * and likewise for `get` / `watch`. Compound operations (e.g. adding to the
 * recent-instances list) live as free functions over the resource, below.
 */
export class DesktopPersistenceService {
  private static instance: DesktopPersistenceService

  readonly desktopSettings: StoreResource<DesktopSettings>
  readonly updateState: StoreResource<UpdateState | null>
  readonly connectionState: StoreResource<PersistedConnectionState | null>
  readonly recentInstances: StoreResource<Instance[]>

  private constructor() {
    this.desktopSettings = createStoreResource(
      STORE_NAMESPACE,
      STORE_KEYS.DESKTOP_SETTINGS,
      DESKTOP_SETTINGS_SCHEMA,
      () => DESKTOP_SETTINGS_SCHEMA.parse({})
    )
    this.updateState = createStoreResource(
      STORE_NAMESPACE,
      STORE_KEYS.UPDATE_STATE,
      UPDATE_STATE_SCHEMA.nullable(),
      () => null
    )
    this.connectionState = createStoreResource(
      STORE_NAMESPACE,
      STORE_KEYS.CONNECTION_STATE,
      PERSISTED_CONNECTION_STATE_SCHEMA.nullable(),
      () => null
    )
    this.recentInstances = createStoreResource(
      STORE_NAMESPACE,
      STORE_KEYS.RECENT_INSTANCES,
      z.array(INSTANCE_SCHEMA),
      () => []
    )
  }

  public static getInstance(): DesktopPersistenceService {
    if (!DesktopPersistenceService.instance) {
      DesktopPersistenceService.instance = new DesktopPersistenceService()
    }
    return DesktopPersistenceService.instance
  }

  async init(): Promise<E.Either<StoreError, void>> {
    const initResult = await Store.init()
    if (E.isLeft(initResult)) {
      Log.error(LOG_TAG, "Failed to initialize store", initResult.left)
      return initResult
    }
    const migrationResult = await this.runMigrations()
    if (E.isLeft(migrationResult)) {
      return migrationResult
    }
    await this.setupRustSync()
    return E.right(undefined)
  }

  /**
   * Keep the Rust-side `DESKTOP_CONFIG` mailbox (see
   * `src-tauri/src/config.rs`) in sync with the desktop settings resource.
   *
   * Two triggers. An initial push so Rust has the current value
   * before any consumer reads it. A subscription to the resource's
   * `watch` so every subsequent write from any writer (this shell,
   * the webview, another process) gets mirrored. The write-side code
   * path stays pure persistence, and the sync is a cross-cutting
   * concern handled here.
   *
   * Both paths swallow failures. Rust already has a compile-time default
   * for every field Rust cares about, so a failed sync degrades to
   * "Rust reads stale value" rather than a user-visible error.
   */
  private async setupRustSync(): Promise<void> {
    try {
      const initial = await this.desktopSettings.get()
      await invoke("set_desktop_config", { config: initial })
    } catch (err) {
      Log.warn(LOG_TAG, "Initial DesktopSettings sync to Rust failed", err)
    }

    try {
      await this.desktopSettings.watch((settings) => {
        invoke("set_desktop_config", { config: settings }).catch((err) => {
          Log.warn(LOG_TAG, "DesktopSettings sync to Rust failed", err)
        })
      })
    } catch (err) {
      Log.warn(
        LOG_TAG,
        "Failed to subscribe to DesktopSettings for Rust sync",
        err
      )
    }
  }

  private async runMigrations(): Promise<E.Either<StoreError, void>> {
    const versionResult = await Store.get<string>(
      STORE_NAMESPACE,
      STORE_KEYS.SCHEMA_VERSION
    )
    const perhapsVersion = E.isRight(versionResult) ? versionResult.right : "1"
    const rawVersion = perhapsVersion ?? "1"
    // Coerce a corrupted or non-numeric stored value to the lowest known
    // version. Without this, `parseInt("v2")` or `parseInt("")` would
    // return NaN, every `migration.version > NaN` check below would
    // evaluate to false, the loop would skip every migration, and the
    // code would still write `SCHEMA_VERSION = "2"` at the end. That
    // would mark migrations complete without ever running them.
    // Falling back to "1" instead reruns every migration from scratch,
    // which is safe because each migration is idempotent on a fresh
    // store and a real fresh install lands here through the same path.
    const parsedVersion = parseInt(rawVersion, 10)
    const currentVersion = Number.isNaN(parsedVersion) ? "1" : rawVersion
    const targetVersion = "2"

    if (currentVersion === targetVersion) {
      return E.right(undefined)
    }

    for (const migration of migrations) {
      if (migration.version > parseInt(currentVersion, 10)) {
        const result = await migration.migrate()
        if (E.isLeft(result)) {
          return result
        }
      }
    }

    // Record the new version only when the write succeeds. A silent
    // failure here would leave the stored version stale, and the next
    // launch would re-run every migration on already-migrated data.
    const versionWrite = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.SCHEMA_VERSION,
      targetVersion
    )
    if (E.isLeft(versionWrite)) {
      Log.error(
        LOG_TAG,
        "Failed to persist schema version after migrations",
        versionWrite.left
      )
      return versionWrite
    }
    return E.right(undefined)
  }
}

/**
 * Adds an instance to the recent list, preserving the "most-recent-first,
 * max 10, deduplicated by kind+serverUrl" invariants. Kept as a free
 * function over the resource rather than a method on the service so the
 * data-access concern (the resource) stays separate from the business
 * rules (dedupe, sort, trim).
 */
export async function addRecentInstance(
  recent: StoreResource<Instance[]>,
  instance: Instance
): Promise<void> {
  const current = await recent.get()
  const now = new Date().toISOString()
  const existingIndex = current.findIndex(
    (i) => i.kind === instance.kind && i.serverUrl === instance.serverUrl
  )

  const merged =
    existingIndex >= 0
      ? current.map((existing, index) =>
          index === existingIndex ? { ...instance, lastUsed: now } : existing
        )
      : [{ ...instance, lastUsed: now }, ...current]

  const next = [...merged]
    .sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    )
    .slice(0, 10)

  await recent.set(next)
}

/**
 * Removes an instance from the recent list by `serverUrl`. Absent entries
 * are silently ignored.
 */
export async function removeRecentInstance(
  recent: StoreResource<Instance[]>,
  serverUrl: string
): Promise<void> {
  const current = await recent.get()
  const filtered = current.filter((i) => i.serverUrl !== serverUrl)
  await recent.set(filtered)
}
