import { Service } from "dioc"
import { BehaviorSubject, Observable } from "rxjs"
import { computed } from "vue"
import { LazyStore } from "@tauri-apps/plugin-store"
import { download, load, clear, remove } from "@hoppscotch/plugin-appload"
import { useToast } from "~/composables/toast"
import { platform } from "~/platform"

const STORE_PATH = "hopp.store.json"
const MAX_RECENT_INSTANCES = 10

type ServerInstance = {
  type: "server"
  serverUrl: string
  displayName: string
  version: string
  lastUsed: string
  bundleName?: string
}

type VendoredInstance = {
  type: "vendored"
  displayName: string
  version: string
}

export type InstanceType = ServerInstance | VendoredInstance

export type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; target: string }
  | { status: "connected"; instance: InstanceType }
  | { status: "error"; target: string; message: string }

export class InstanceSwitcherService extends Service<ConnectionState> {
  public static readonly ID = "INSTANCE_SWITCHER_SERVICE"

  private state$ = new BehaviorSubject<ConnectionState>({ status: "idle" })
  private recentInstances$ = new BehaviorSubject<ServerInstance[]>([])
  private store!: LazyStore
  private toast = useToast()

  public getVendoredInstance(): VendoredInstance {
    const { instanceType, displayConfig } = platform.instance
    const { displayName, version } = displayConfig

    return {
      type: instanceType,
      displayName,
      version,
    }
  }

  override async onServiceInit(): Promise<void> {
    this.store = new LazyStore(STORE_PATH)
    await this.store.init()
    await this.loadRecentInstances()

    if (this.inVendoredEnvironment()) {
      this.state$.next({
        status: "connected",
        instance: this.getVendoredInstance(),
      })
      this.emit(this.state$.value)
    } else {
      await this.loadSavedState()
    }
  }

  private inVendoredEnvironment(): boolean {
    try {
      return (
        window.location.hostname === "hoppscotch" &&
        window.location.protocol === "app:"
      )
    } catch {
      return false
    }
  }

  public getStateStream(): Observable<ConnectionState> {
    return this.state$
  }

  public getRecentInstancesStream(): Observable<ServerInstance[]> {
    return this.recentInstances$
  }

  public getCurrentState() {
    return computed(() => this.state$.value)
  }

  public getCurrentInstance() {
    return computed(() => {
      const state = this.state$.value
      return state.status === "connected" ? state.instance : null
    })
  }

  public getRecentInstances() {
    return computed(() => this.recentInstances$.value)
  }

  public isConnecting() {
    return computed(() => this.state$.value.status === "connecting")
  }

  public getConnectionError() {
    return computed(() => {
      const state = this.state$.value
      return state.status === "error" ? state.message : null
    })
  }

  public async connectToVendoredInstance(): Promise<boolean> {
    if (this.isCurrentlyVendored()) {
      return true
    }

    this.state$.next({
      status: "connecting",
      target: this.getVendoredInstance().displayName,
    })
    this.emit(this.state$.value)

    try {
      this.state$.next({
        status: "connected",
        instance: this.getVendoredInstance(),
      })
      this.emit(this.state$.value)

      await this.saveCurrentState()

      this.toast.success(
        platform.instance.displayConfig.connectingMessage.replace(
          "{instanceName}",
          this.getVendoredInstance().displayName
        )
      )

      const loadResponse = await load({
        bundleName: "Hoppscotch",
        window: { title: "Hoppscotch" },
      })

      if (!loadResponse.success) {
        throw new Error(
          `Failed to load ${this.getVendoredInstance().type} bundle`
        )
      }

      this.toast.success(
        platform.instance.displayConfig.connectedMessage.replace(
          "{instanceName}",
          this.getVendoredInstance().displayName
        )
      )
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.state$.next({
        status: "error",
        target: this.getVendoredInstance().displayName,
        message: errorMessage,
      })
      this.emit(this.state$.value)

      this.toast.error(`Failed to connect: ${errorMessage}`)
      return false
    }
  }

  public async connectToServerInstance(serverUrl: string): Promise<boolean> {
    if (this.isCurrentlyConnectedTo(serverUrl)) {
      const currentState = this.state$.value
      if (
        currentState.status === "connected" &&
        currentState.instance.type === "server"
      ) {
        const updatedInstance: ServerInstance = {
          ...currentState.instance,
          lastUsed: new Date().toISOString(),
        }

        await this.updateRecentInstance(updatedInstance)
      }
      return true
    }

    const normalizedUrl = this.normalizeUrl(serverUrl)
    const displayName = this.getDisplayNameFromUrl(normalizedUrl)

    this.state$.next({
      status: "connecting",
      target: displayName,
    })
    this.emit(this.state$.value)

    try {
      const downloadResponse = await download({ serverUrl: normalizedUrl })
      if (!downloadResponse.success) {
        throw new Error("Failed to download bundle")
      }

      const instance: ServerInstance = {
        type: "server",
        serverUrl: normalizedUrl,
        displayName,
        version: downloadResponse.version,
        lastUsed: new Date().toISOString(),
        bundleName: downloadResponse.bundleName,
      }

      await this.updateRecentInstance(instance)

      this.state$.next({
        status: "connected",
        instance,
      })
      this.emit(this.state$.value)

      await this.saveCurrentState()

      this.toast.success(`Connecting to ${displayName}`)

      const loadResponse = await load({
        bundleName: downloadResponse.bundleName,
        window: { title: "Hoppscotch" },
      })

      if (!loadResponse.success) {
        throw new Error("Failed to load bundle")
      }

      this.toast.success(`Connected to ${displayName}`)
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.state$.next({
        status: "error",
        target: displayName,
        message: errorMessage,
      })
      this.emit(this.state$.value)

      this.toast.error(`Connection failed: ${errorMessage}`)
      return false
    }
  }

  public async removeInstance(serverUrl: string): Promise<boolean> {
    try {
      const normalizedUrl = this.normalizeUrl(serverUrl)

      const instanceToRemove = this.recentInstances$.value.find(
        (instance) => instance.serverUrl === normalizedUrl
      )

      if (!instanceToRemove) {
        return false
      }

      if (instanceToRemove.bundleName) {
        try {
          await remove({
            bundleName: instanceToRemove.bundleName,
            serverUrl: normalizedUrl,
          })
        } catch (error) {
          console.error("Failed to remove bundle from storage:", error)
          // Continue with instance removal even if bundle removal fails
        }
      }

      const instances = this.recentInstances$.value.filter(
        (instance) => instance.serverUrl !== normalizedUrl
      )

      this.recentInstances$.next(instances)
      await this.saveRecentInstances()

      const displayName = this.getDisplayNameFromUrl(serverUrl)
      this.toast.success(`Removed ${displayName}`)

      // If we're currently connected to this instance, go back to idle state
      if (this.isCurrentlyConnectedTo(serverUrl)) {
        this.state$.next({ status: "idle" })
        this.emit(this.state$.value)
        await this.saveCurrentState()
      }

      return true
    } catch (error) {
      this.toast.error("Failed to remove instance")
      return false
    }
  }

  public async clearCache(): Promise<boolean> {
    try {
      await clear()
      this.toast.success("Cache cleared successfully")
      return true
    } catch (error) {
      this.toast.error("Failed to clear cache")
      return false
    }
  }

  public getCurrentInstanceDisplayName(): string {
    const state = this.state$.value
    if (state.status !== "connected") {
      return "Hoppscotch"
    }
    return state.instance.displayName
  }

  public getDisplayNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // We don't want entire hostname, only the specific org
      const hostnameParts = urlObj.hostname.split(".")
      const mainDomain = hostnameParts.slice(-2).join(".")

      if (mainDomain === "hoppscotch") {
        return "Hoppscotch"
      }

      return mainDomain || urlObj.hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  public isCurrentlyVendored(): boolean {
    const state = this.state$.value
    return (
      state.status === "connected" &&
      state.instance.type === this.getVendoredInstance().type
    )
  }

  public isCurrentlyConnectedTo(serverUrl: string): boolean {
    const state = this.state$.value
    if (state.status !== "connected") return false

    const instance = state.instance
    if (instance.type !== "server") return false

    return instance.serverUrl === this.normalizeUrl(serverUrl)
  }

  public normalizeUrl(url: string): string {
    try {
      const withProtocol = url.startsWith("http") ? url : `http://${url}`
      const urlObj = new URL(withProtocol)

      const pathSegments = urlObj.pathname.split("/").filter(Boolean)

      if (!pathSegments.includes("desktop-app-server")) {
        // We try `desktop-app-server` subpath first
        const withSubpath = new URL(withProtocol)
        withSubpath.pathname = `/desktop-app-server${urlObj.pathname}`

        // If it fails, fall back to the original URL with default port
        try {
          const re = withSubpath.toString().replace(/\/$/, "")
          return re
        } catch {
          if (!urlObj.port) {
            urlObj.port = "3200"
          }
          const re = urlObj.toString().replace(/\/$/, "")
          return re
        }
      }

      const re = urlObj.toString().replace(/\/$/, "")
      return re
    } catch (error) {
      return url
    }
  }

  private async loadSavedState(): Promise<void> {
    try {
      const savedState =
        await this.store.get<ConnectionState>("connectionState")

      if (savedState && savedState.status === "connected") {
        if (savedState.instance.type === "server") {
          this.state$.next(savedState)
          this.emit(this.state$.value)
        }
      }
    } catch (error) {
      console.error("Failed to load saved state:", error)
      this.state$.next({ status: "idle" })
    }
  }

  private async saveCurrentState(): Promise<void> {
    try {
      await this.store.set("connectionState", this.state$.value)
      await this.store.save()
    } catch (error) {
      console.error("Failed to save current state:", error)
    }
  }

  private async loadRecentInstances(): Promise<void> {
    try {
      const instances =
        (await this.store.get<ServerInstance[]>("recentInstances")) || []

      const sortedInstances = instances.sort(
        (a, b) =>
          new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      )

      this.recentInstances$.next(sortedInstances)
    } catch (error) {
      console.error("Failed to load recent instances:", error)
      this.recentInstances$.next([])
    }
  }

  private async saveRecentInstances(): Promise<void> {
    try {
      await this.store.set("recentInstances", this.recentInstances$.value)
      await this.store.save()
    } catch (error) {
      console.error("Failed to save recent instances:", error)
    }
  }

  private async updateRecentInstance(instance: ServerInstance): Promise<void> {
    try {
      const currentInstances = [...this.recentInstances$.value]
      const instances = currentInstances.filter(
        (item) => item.serverUrl !== instance.serverUrl
      )

      instances.unshift(instance)

      if (instances.length > MAX_RECENT_INSTANCES) {
        instances.length = MAX_RECENT_INSTANCES
      }

      this.recentInstances$.next(instances)
      await this.saveRecentInstances()

      console.log(
        `Updated recent instances. Current count: ${instances.length}`
      )
    } catch (error) {
      console.error("Failed to update recent instance:", error)
    }
  }
}
