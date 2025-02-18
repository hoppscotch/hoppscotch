import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { Ref, ref, computed } from "vue"
import { LazyStore } from "@tauri-apps/plugin-store"
import { download, load, clear } from "@hoppscotch/plugin-appload"
import { pipe } from "fp-ts/function"

const STORE_PATH = "hopp.store.json"
const MAX_HISTORY = 10

export type InstanceDetails = {
  url: string
  lastUsed: string
  version: string
}

export type CurrentInstance = {
  url: string
  version: string
  isVendored?: boolean
}

export type InstanceEvent =
  | { event: "instance-changed"; url: string }
  | { event: "instance-connecting"; url: string }
  | { event: "instance-connection-failed"; url: string; error: string }
  | { event: "instance-connection-success"; url: string }
  | { event: "instance-cleared" }

export class InstanceSwitcherService extends Service<InstanceEvent> {
  public static readonly ID = "INSTANCE_SWITCHER_SERVICE"

  private currentInstance$ = new BehaviorSubject<CurrentInstance | null>(null)
  private recentInstances$ = new BehaviorSubject<InstanceDetails[]>([])
  private isConnecting: Ref<boolean> = ref(false)
  private connectionError: Ref<string | null> = ref(null)
  private store!: LazyStore

  override async onServiceInit(): Promise<void> {
    this.store = new LazyStore(STORE_PATH)
    await this.store.init()
    await this.loadRecentInstances()
    await this.loadCurrentInstance()
  }

  private normalizeUrl(url: string): E.Either<Error, string> {
    return pipe(
      E.tryCatch(
        () => {
          const withProtocol = url.startsWith("http") ? url : `http://${url}`
          const parsedUrl = new URL(withProtocol)
          if (!parsedUrl.port) parsedUrl.port = "3200"
          return parsedUrl.toString()
        },
        (e) => (e instanceof Error ? e : new Error(String(e)))
      )
    )
  }

  public getCurrentInstanceDisplayName(): string {
    const instance = this.getCurrentInstance()

    if (!instance.value) {
      return "Hoppscotch Self Hosted"
    }

    const url = instance.value.url

    try {
      const urlO = new URL(url)
      const hostname = urlO.hostname

      if (hostname === "localhost") {
        return "Self Hosted"
      }
      if (hostname === "hoppscotch") {
        return "Cloud"
      }
      return hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  public getCurrentInstanceStream() {
    return this.currentInstance$
  }

  public getInstanceEventsStream() {
    return this.getEventStream()
  }

  public getRecentInstancesStream() {
    return this.recentInstances$
  }

  public getCurrentInstance() {
    return computed(() => this.currentInstance$.value)
  }

  public getRecentInstances() {
    return this.recentInstances$.value
  }

  public getConnectingState() {
    return this.isConnecting
  }

  public getConnectionError() {
    return this.connectionError
  }

  public clearConnectionError() {
    this.connectionError.value = null
  }

  private async loadCurrentInstance() {
    try {
      const currentInstance =
        await this.store.get<CurrentInstance>("currentInstance")
      if (currentInstance) {
        this.currentInstance$.next(currentInstance)
      }
    } catch (error) {
      console.error("Failed to load current instance:", error)
    }
  }

  private async saveCurrentInstance(instance: CurrentInstance | null) {
    try {
      await this.store.set("currentInstance", instance)
      await this.store.save()
    } catch (error) {
      console.error("Failed to save current instance:", error)
    }
  }

  private async loadRecentInstances() {
    try {
      const instances =
        (await this.store.get<InstanceDetails[]>("recentInstances")) || []

      const updatedInstances = instances.map((instance) => {
        if ("pinned" in instance) {
          const { pinned, ...rest } = instance as InstanceDetails & {
            pinned: boolean
          }
          return rest as InstanceDetails
        }
        return instance
      })

      const sortedInstances = updatedInstances.sort(
        (a, b) =>
          new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      )

      this.recentInstances$.next(sortedInstances)
    } catch (error) {
      console.error("Failed to load recent instances:", error)
      this.recentInstances$.next([])
    }
  }

  public async saveRecentInstances(
    instances: InstanceDetails[]
  ): Promise<void> {
    try {
      this.recentInstances$.next(instances)
      await this.store.set("recentInstances", instances)
      await this.store.save()
    } catch (error) {
      console.error("Failed to save recent instances:", error)
    }
  }

  public async removeInstance(url: string): Promise<void> {
    try {
      const instances = [...this.recentInstances$.value]
      const index = instances.findIndex((item) => item.url === url)

      if (index >= 0) {
        instances.splice(index, 1)
        await this.saveRecentInstances(instances)
      }
    } catch (error) {
      console.error("Failed to remove instance:", error)
    }
  }

  public async setCurrentVendoredInstance(): Promise<void> {
    try {
      const currentInstance: CurrentInstance = {
        url: "app://hoppscotch",
        version: "vendored",
        isVendored: true,
      }

      await load({
        bundleName: "hoppscotch",
        window: { title: "Hoppscotch" },
      })

      this.currentInstance$.next(currentInstance)
      await this.saveCurrentInstance(currentInstance)
      this.emit({
        event: "instance-changed",
        url: currentInstance.url,
      })
      this.emit({
        event: "instance-connection-success",
        url: currentInstance.url,
      })
    } catch (error) {
      console.error("Failed to set vendored instance:", error)
      this.connectionError.value =
        error instanceof Error ? error.message : String(error)
    }
  }

  private async updateRecentInstance(url: string, version: string) {
    try {
      const instances = [...this.recentInstances$.value]
      const existingIndex = instances.findIndex((item) => item.url === url)

      const newEntry: InstanceDetails = {
        url,
        lastUsed: new Date().toISOString(),
        version,
      }

      if (existingIndex >= 0) {
        instances.splice(existingIndex, 1)
      }

      instances.unshift(newEntry)

      if (instances.length > MAX_HISTORY) {
        instances.splice(MAX_HISTORY)
      }

      await this.saveRecentInstances(instances)
    } catch (error) {
      console.error("Failed to update recent instance:", error)
    }
  }

  public isCurrentInstance(url: string): boolean {
    if (!url || !this.currentInstance$.value) return false

    if (this.currentInstance$.value.isVendored) {
      return url === "app://hoppscotch"
    }

    const normalizedInput = this.normalizeUrlSimple(url)
    const normalizedCurrent = this.normalizeUrlSimple(
      this.currentInstance$.value.url
    )

    return normalizedInput === normalizedCurrent
  }

  private normalizeUrlSimple(url: string): string {
    try {
      const withProtocol = url.startsWith("http") ? url : `http://${url}`
      const parsedUrl = new URL(withProtocol)

      if (!parsedUrl.port) parsedUrl.port = "3200"

      return (
        parsedUrl.origin.toLowerCase() +
        parsedUrl.pathname.replace(/\/+$/, "").toLowerCase()
      )
    } catch (e) {
      return url.trim().toLowerCase().replace(/\/+$/, "")
    }
  }

  public async clearAllInstances() {
    try {
      await this.saveRecentInstances([])
      this.emit({ event: "instance-cleared" })
    } catch (error) {
      console.error("Failed to clear all instances:", error)
    }
  }

  public async clearCache() {
    try {
      await clear()
      return E.right(undefined)
    } catch (err) {
      console.error("Failed to clear cache:", err)
      return E.left("Failed to clear cache")
    }
  }

  public async connectToInstance(url: string): Promise<E.Either<string, void>> {
    if (this.isConnecting.value) {
      return E.left("Already connecting to an instance")
    }

    if (this.isCurrentInstance(url)) {
      return E.left("Already connected to this instance")
    }

    this.isConnecting.value = true
    this.connectionError.value = null
    this.emit({ event: "instance-connecting", url })

    try {
      const normalizedUrlResult = pipe(url, this.normalizeUrl)

      if (E.isLeft(normalizedUrlResult)) {
        const error = normalizedUrlResult.left.message
        this.connectionError.value = error
        this.emit({
          event: "instance-connection-failed",
          url,
          error,
        })
        return E.left(error)
      }

      const normalizedUrl = normalizedUrlResult.right

      const downloadResp = await download({ serverUrl: normalizedUrl })
      if (!downloadResp.success) {
        const error = "Failed to download bundle"
        this.connectionError.value = error
        this.emit({
          event: "instance-connection-failed",
          url: normalizedUrl,
          error,
        })
        return E.left(error)
      }

      await this.updateRecentInstance(normalizedUrl, downloadResp.version)

      const loadResp = await load({
        bundleName: downloadResp.bundleName,
        window: { title: "Hoppscotch" },
      })

      if (!loadResp.success) {
        const error = "Failed to load bundle"
        this.connectionError.value = error
        this.emit({
          event: "instance-connection-failed",
          url: normalizedUrl,
          error,
        })
        return E.left(error)
      }

      const currentInstance = {
        url: normalizedUrl,
        version: downloadResp.version,
        isVendored: false,
      }
      this.currentInstance$.next(currentInstance)
      await this.saveCurrentInstance(currentInstance)

      this.emit({
        event: "instance-changed",
        url: normalizedUrl,
      })

      this.emit({
        event: "instance-connection-success",
        url: normalizedUrl,
      })

      return E.right(undefined)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.connectionError.value = error
      this.emit({
        event: "instance-connection-failed",
        url,
        error,
      })
      return E.left(error)
    } finally {
      this.isConnecting.value = false
    }
  }
}
