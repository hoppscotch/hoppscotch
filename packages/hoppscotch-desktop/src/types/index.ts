export interface RecentInstance {
  url: string
  lastUsed: string
  version?: string
  pinned: boolean
}

export interface StoreSchema {
  recentInstances: RecentInstance[]
}

export enum UpdateStatus {
  IDLE = "idle",
  CHECKING = "checking",
  AVAILABLE = "available",
  NOT_AVAILABLE = "not_available",
  DOWNLOADING = "downloading",
  INSTALLING = "installing",
  READY_TO_RESTART = "ready_to_restart",
  ERROR = "error",
}

export enum CheckResult {
  AVAILABLE,
  NOT_AVAILABLE,
  TIMEOUT,
  ERROR,
}

export interface UpdateState {
  status: UpdateStatus
  version?: string
  message?: string
}

// Legacy `PortableSettings` interface. Kept around so the v1 to v2
// migration in `persistence.service.ts` can read pre-v2 store entries
// written by portable builds. New code uses `DesktopSettings` from
// `@hoppscotch/common/platform/desktop-settings` instead.
export interface PortableSettings {
  disableUpdateNotifications: boolean
  autoSkipWelcome: boolean
}
