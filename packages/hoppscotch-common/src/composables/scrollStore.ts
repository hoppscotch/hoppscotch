export const globalScrollMap = new Map<string, number>()
// This map stores scroll positions for different tabs and suffixes
// The key format is: `${tabId}::${suffix}`
export function cleanupScrollForTab(tabId: string) {
  const suffixes = ["json", "raw", "preview"]
  for (const suffix of suffixes) {
    const key = `${tabId}::${suffix}`
    globalScrollMap.delete(key)
  }
}

export function cleanupAllScroll() {
  globalScrollMap.clear()
}

