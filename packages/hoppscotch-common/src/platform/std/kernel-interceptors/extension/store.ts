import { Service } from "dioc"
import { Store } from "~/kernel/store"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { ref } from "vue"

const STORE_NAMESPACE = "interceptors.extension.v1"
const SETTINGS_KEY = "settings"

export type ExtensionStatus = "available" | "unknown-origin" | "waiting"

export type ExtensionVersion = {
  major: number
  minor: number
}

export const defineSubscribableObject = <T extends object>(obj: T) => {
  const proxyObject = {
    ...obj,
    _subscribers: {} as {
      // eslint-disable-next-line no-unused-vars
      [key in keyof T]?: ((...args: any[]) => any)[]
    },
    subscribe(prop: keyof T, func: (...args: any[]) => any): void {
      if (Array.isArray(this._subscribers[prop])) {
        this._subscribers[prop]?.push(func)
      } else {
        this._subscribers[prop] = [func]
      }
    },
  }

  type SubscribableProxyObject = typeof proxyObject

  return new Proxy(proxyObject, {
    set(obj, prop, newVal) {
      obj[prop as keyof SubscribableProxyObject] = newVal

      const currentSubscribers = obj._subscribers[prop as keyof T]

      if (Array.isArray(currentSubscribers)) {
        for (const subscriber of currentSubscribers) {
          subscriber(newVal)
        }
      }

      return true
    },
  })
}

type ExtensionSettings = {
  version: "v1"
  status: ExtensionStatus
  extensionVersion?: ExtensionVersion
}

interface StoredData {
  version: string
  settings: ExtensionSettings
  lastUpdated: string
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  version: "v1",
  status: "waiting",
}

export class KernelInterceptorExtensionStore extends Service {
  public static readonly ID = "KERNEL_EXTENSION_INTERCEPTOR_STORE"

  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS }
  private extensionPollIntervalId = ref<ReturnType<typeof setInterval>>()

  async onServiceInit(): Promise<void> {
    const initResult = await Store.init()
    if (E.isLeft(initResult)) {
      console.error(
        "[ExtensionStore] Failed to initialize store:",
        initResult.left
      )
      return
    }

    await this.loadSettings()

    if (!this.tryDetectExtension()) {
      this.setupExtensionStatusListener()
    }

    const watcher = await Store.watch(STORE_NAMESPACE, SETTINGS_KEY)
    watcher.on("change", async ({ value }) => {
      if (value) {
        const storedData = value as StoredData
        this.settings = storedData.settings
      }
    })
  }

  public getExtensionVersion(): O.Option<ExtensionVersion> {
    return O.fromNullable(this.settings.extensionVersion)
  }

  public getExtensionStatus(): ExtensionStatus {
    return this.settings.status
  }

  private setupExtensionStatusListener(): void {
    if (window.__HOPP_EXTENSION_STATUS_PROXY__) {
      this.settings.status = window.__HOPP_EXTENSION_STATUS_PROXY__.status
      window.__HOPP_EXTENSION_STATUS_PROXY__.subscribe(
        "status",
        (status: ExtensionStatus) => {
          this.updateSettings({ status })
        }
      )
    } else {
      const statusProxy = defineSubscribableObject({
        status: "waiting" as ExtensionStatus,
      })

      window.__HOPP_EXTENSION_STATUS_PROXY__ = statusProxy
      statusProxy.subscribe("status", (status: ExtensionStatus) =>
        this.updateSettings({ status })
      )

      if (this.tryDetectExtension()) {
        return
      }

      /**
       * Keeping identifying extension backward compatible
       * We are assuming the default version is 0.24 or later. So if the extension exists, its identified immediately,
       * then we use a poll to find the version, this will get the version for 0.24 and any other version
       * of the extension, but will have a slight lag.
       * 0.24 users will get the benefits of 0.24, while the extension won't break for the old users
       */
      this.extensionPollIntervalId.value = setInterval(() => {
        if (this.tryDetectExtension() && this.extensionPollIntervalId.value) {
          clearInterval(this.extensionPollIntervalId.value)
        }
      }, 2000)
    }
  }

  public tryDetectExtension(): boolean {
    if (typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined") {
      const version = window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()

      this.settings = {
        ...this.settings,
        extensionVersion: version,
        status: "available",
      }

      // We don't need to persist right away to thing eventually resolving is good enough
      this.persistSettings()

      // When the version is not 0.24 or higher, the extension wont do this. so we have to do it manually
      if (
        version.major === 0 &&
        version.minor <= 23 &&
        window.__HOPP_EXTENSION_STATUS_PROXY__
      ) {
        window.__HOPP_EXTENSION_STATUS_PROXY__.status = "available"
      }
      return true
    }
    return false
  }

  private async loadSettings(): Promise<void> {
    const loadResult = await Store.get<StoredData>(
      STORE_NAMESPACE,
      SETTINGS_KEY
    )

    if (E.isRight(loadResult) && loadResult.right) {
      const storedData = loadResult.right
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...storedData.settings,
      }
    } else {
      await this.persistSettings()
    }
  }

  private async persistSettings(): Promise<void> {
    const storedData: StoredData = {
      version: "v1",
      settings: this.settings,
      lastUpdated: new Date().toISOString(),
    }

    const saveResult = await Store.set(
      STORE_NAMESPACE,
      SETTINGS_KEY,
      storedData
    )

    if (E.isLeft(saveResult)) {
      console.error(
        "[ExtensionStore] Failed to save settings:",
        saveResult.left
      )
    }
  }

  public async updateSettings(
    settings: Partial<ExtensionSettings>
  ): Promise<void> {
    this.settings = {
      ...this.settings,
      ...settings,
    }

    await this.persistSettings()
  }

  public getSettings(): ExtensionSettings {
    return { ...this.settings }
  }
}
