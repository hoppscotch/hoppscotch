/**
 * Per-feature sync overrides. The default sync code in `lib/sync/*` talks
 * to the upstream Postgres backend directly; when a shell's backend
 * diverges (e.g. cloud has a dedicated `updateUserGlobalEnvironment`
 * mutation that legacy/selfhost backends don't), the shell can inject a
 * replacement here and the sync layer will feature-detect.
 *
 * Each field is optional — when omitted the sync layer falls back to its
 * legacy code path (currently: `updateUserEnvironment` with an empty
 * `name`, which the legacy backend treats as a global update).
 */
export type SyncPlatformDef = {
  environment?: {
    /**
     * Update the user's global environment. Receives the backend env id
     * and the pre-serialised JSON payload (the `{ v, variables }`
     * wrapper). Fire-and-forget — the sync layer doesn't await the
     * return.
     */
    updateUserGlobalEnvironment?: (id: string, variables: string) => unknown
  }
}
