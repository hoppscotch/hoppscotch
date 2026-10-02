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
  history?: {
    /**
     * Resolve whether the backend currently has user-history storing
     * enabled. Self-host exposes this through the `isUserHistoryEnabled`
     * infra-config; backends without that admin toggle (e.g. cloud) omit
     * this hook and the sync layer treats history as always enabled.
     * Rejects on fetch failure so the sync layer can flag its error state.
     */
    getHistoryStoreStatus?: () => Promise<boolean>
    /**
     * Subscribe to backend-side history-enabled toggles (the self-host
     * infra-config `USER_HISTORY_STORE_ENABLED`). `onStatusChange` fires
     * with each new enabled state; returns an unsubscribe handle the sync
     * layer tears down alongside the other history subscriptions.
     */
    subscribeToHistoryStoreStatus?: (
      onStatusChange: (enabled: boolean) => void
    ) => { unsubscribe: () => void }
  }
}
