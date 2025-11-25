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
