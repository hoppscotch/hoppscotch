import { Service } from "dioc"

export class ScrollService extends Service {
  public static readonly ID = "SCROLL_SERVICE"

  private scrollMap = new Map<string, number>()

  public setScroll(tabId: string, suffix: string, position: number) {
    const key = `${tabId}::${suffix}`
    this.scrollMap.set(key, position)
  }

  public getScroll(tabId: string, suffix: string): number | undefined {
    const key = `${tabId}::${suffix}`
    return this.scrollMap.get(key)
  }

  public cleanupScrollForTab(tabId: string) {
    const suffixes = ["json", "raw", "html", "xml", "preview"]
    for (const suffix of suffixes) {
      const key = `${tabId}::${suffix}`
      this.scrollMap.delete(key)
    }
  }

  public cleanupAllScroll() {
    this.scrollMap.clear()
  }

  public setScrollForKey(key: string, position: number) {
  this.scrollMap.set(key, position)
}

public getScrollForKey(key: string): number | undefined {
  return this.scrollMap.get(key)
}

}
