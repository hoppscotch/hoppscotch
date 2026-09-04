// Re-exports of types whose canonical definitions live in common. Listed
// here so in-package imports can keep using `~/types` without every caller
// needing to know the precise module path in common. New types that need to
// cross the shell/webview boundary belong in common directly.
export {
  UpdateStatus,
  type UpdateState,
  type DownloadProgress,
} from "@hoppscotch/common/platform/update-state"

// Not to be confused with `UpdateStatus`. `CheckResult` is the outcome of a
// single call to the updater's `checkForUpdates`, where `UpdateStatus` is
// the full state machine covering checking, downloading, installing, and
// restart. Only `checkForUpdates` returns this.
export enum CheckResult {
  AVAILABLE,
  NOT_AVAILABLE,
  TIMEOUT,
  ERROR,
}
