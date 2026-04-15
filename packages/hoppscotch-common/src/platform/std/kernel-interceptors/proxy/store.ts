import { ref, readonly, type Ref, type DeepReadonly } from "vue"
import { Service } from "dioc"
import { Store } from "~/kernel/store"
import { getDefaultProxyUrl, DEFAULT_HOPP_PROXY_URL } from "~/helpers/proxyUrl"
import * as E from "fp-ts/Either"

const STORE_NAMESPACE = "interceptors.proxy.v1"
const SETTINGS_KEY = "settings"

export type ProxySettings = {
  version: "v1"
  proxyUrl: string
  accessToken: string
}

interface StoredData {
  version: string
  settings: ProxySettings
  lastUpdated: string
}

/**
 * Build fresh default settings.
 * Called as a function (not a static const) so that `getDefaultProxyUrl()`
 * can resolve against the current platform, which isn't available at
 * module-load time.
 */
async function buildDefaultSettings(): Promise<ProxySettings> {
  return {
    version: "v1",
    proxyUrl: await getDefaultProxyUrl(),
    accessToken: import.meta.env.VITE_PROXYSCOTCH_ACCESS_TOKEN ?? "",
  }
}

/**
 * Reactive proxy settings store.
 *
 * Exposes `settings$` as a readonly ref, any component or service that reads
 * `settings$.value` will automatically re-render when settings change.
 */
export class KernelInterceptorProxyStore extends Service {
  public static readonly ID = "KERNEL_PROXY_INTERCEPTOR_STORE"

  private readonly _settings = ref<ProxySettings>({
    version: "v1",
    proxyUrl: DEFAULT_HOPP_PROXY_URL,
    accessToken: import.meta.env.VITE_PROXYSCOTCH_ACCESS_TOKEN ?? "",
  })

  /**
   * Reactive, read-only view of the current proxy settings.
   */
  public readonly settings$: DeepReadonly<Ref<ProxySettings>> = readonly(
    this._settings
  )

  async onServiceInit(): Promise<void> {
    const initResult = await Store.init()
    if (E.isLeft(initResult)) {
      console.error("[ProxyStore] Failed to initialize store:", initResult.left)
      return
    }

    await this.loadSettings()

    const watcher = await Store.watch(STORE_NAMESPACE, SETTINGS_KEY)
    watcher.on("change", async ({ value }) => {
      if (value) {
        const storedData = value as StoredData
        this._settings.value = storedData.settings
      }
    })
  }

  private async loadSettings(): Promise<void> {
    const loadResult = await Store.get<StoredData>(
      STORE_NAMESPACE,
      SETTINGS_KEY
    )

    const defaults = await buildDefaultSettings()

    if (E.isRight(loadResult) && loadResult.right) {
      const storedData = loadResult.right
      this._settings.value = {
        ...defaults,
        ...storedData.settings,
      }
    } else {
      this._settings.value = { ...defaults }
      await this.persistSettings()
    }
  }

  private async persistSettings(): Promise<void> {
    const storedData: StoredData = {
      version: "v1",
      settings: this._settings.value,
      lastUpdated: new Date().toISOString(),
    }

    const saveResult = await Store.set(
      STORE_NAMESPACE,
      SETTINGS_KEY,
      storedData
    )

    if (E.isLeft(saveResult)) {
      console.error("[ProxyStore] Failed to save settings:", saveResult.left)
    }
  }

  public async updateSettings(patch: Partial<ProxySettings>): Promise<void> {
    this._settings.value = {
      ...this._settings.value,
      ...patch,
    }
    await this.persistSettings()
  }

  /**
   * @deprecated Use `settings$` for reactive access. This exists only for
   * non-reactive contexts (e.g. inside `execute()` in the interceptor service).
   */
  public getSettings(): ProxySettings {
    return { ...this._settings.value }
  }

  public async resetSettings(): Promise<void> {
    this._settings.value = await buildDefaultSettings()
    await this.persistSettings()
  }
}
