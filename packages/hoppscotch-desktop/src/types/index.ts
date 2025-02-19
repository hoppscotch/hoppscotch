export interface RecentInstance {
  url: string
  lastUsed: string
  version?: string
  pinned: boolean
}

export interface StoreSchema {
  recentInstances: RecentInstance[]
}
