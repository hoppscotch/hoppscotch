import { z } from "zod"

/**
 * Shared schema and types for the Tauri desktop app's user settings.
 *
 * The settings live in `tauri-plugin-store` under namespace
 * `DESKTOP_SETTINGS_STORE_NAMESPACE`, key `DESKTOP_SETTINGS_STORE_KEY`.
 * Both the Tauri shell (`hoppscotch-desktop`) and the webview
 * (`hoppscotch-selfhost-web`, loaded via appload) read and write
 * through the same namespace and key.
 *
 * The schema is the contract between the two sides. A change here
 * without coordinating both sides leaves the shell and the webview
 * disagreeing about what is in the store. This module lives in
 * `hoppscotch-common` because both packages already depend on common
 * and neither depends on the other directly, so common is the only
 * place a shared definition can live.
 *
 * Every field has a Zod `.default()` that preserves the pre-settings-epic
 * behavior, so a partial read (missing keys, corrupt blob, fresh install)
 * parses cleanly into a fully-populated object. Use `parseDesktopSettings()`
 * to read raw values safely.
 */

// Store coordinates. Both sides must use these constants, never string
// literals, so a rename is a single edit and a typo is a compile error.
export const DESKTOP_SETTINGS_STORE_NAMESPACE = "hoppscotch-desktop.v1"
export const DESKTOP_SETTINGS_STORE_KEY = "desktopSettings"

// Fields are grouped by the area of the app they affect. Defaults
// preserve today's hardcoded behavior so any field not yet bound to a
// control in the settings UI ships without a visible change for existing
// users.
export const DESKTOP_SETTINGS_SCHEMA = z.object({
  // Migrated from the legacy portable-only `PortableSettings`. A future
  // epic ticket promotes `disableUpdateNotifications` to a user-facing
  // control on all builds. For now it stays portable-only.
  disableUpdateNotifications: z.boolean().default(false),
  autoSkipWelcome: z.boolean().default(false),

  // Connection and startup behavior. The `connectionTimeoutMs` default
  // matches `API_TIMEOUT_SECS` in `config.rs`. User-facing controls for
  // these fields are future scope.
  connectionTimeoutMs: z.number().int().positive().default(30_000),
  autoReconnectLastInstance: z.boolean().default(true),

  // Update-pipeline controls. `disable*` polarity matches the existing
  // `disableUpdateNotifications` field so all three update-related
  // booleans read uniformly, and the on-by-default framing ("Disable X"
  // with default false) nudges users toward keeping the update flow
  // active. `disableUpdateChecks` is bound to a toggle in the current
  // settings UI. `disableUpdateDownloads` is future scope.
  disableUpdateChecks: z.boolean().default(false),
  disableUpdateDownloads: z.boolean().default(false),

  // Display and UX. User-facing zoom control is future scope.
  zoomLevel: z.number().positive().default(1.0),
})

export type DesktopSettings = z.infer<typeof DESKTOP_SETTINGS_SCHEMA>

/**
 * Parses a raw value into `DesktopSettings`, falling back to full defaults
 * on any validation failure. Never throws.
 */
export const parseDesktopSettings = (raw: unknown): DesktopSettings => {
  const parsed = DESKTOP_SETTINGS_SCHEMA.safeParse(raw ?? {})
  if (!parsed.success) {
    return DESKTOP_SETTINGS_SCHEMA.parse({})
  }
  return parsed.data
}
