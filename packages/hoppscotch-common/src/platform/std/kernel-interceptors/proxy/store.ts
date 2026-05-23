import { ref, readonly, toRaw, type Ref, type DeepReadonly } from "vue"
import { Service } from "dioc"
import { Store } from "~/kernel/store"
import {
  getDefaultProxyUrl,
  DEFAULT_HOPP_PROXY_URL,
  isValidProxyUrl,
} from "~/helpers/proxyUrl"
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

  private _resolveReady!: () => void
  // Resolves once persisted settings have been loaded into `_settings`.
  // Callers that read `proxyUrl` on initial page load (e.g. the OAuth redirect
  // handler) must await this to avoid using the in-memory default URL.
  private readonly _ready: Promise<void> = new Promise((resolve) => {
    this._resolveReady = resolve
  })

  /**
   * Reactive, read-only view of the current proxy settings.
   */
  public readonly settings$: DeepReadonly<Ref<ProxySettings>> = readonly(
    this._settings
  )

  async onServiceInit(): Promise<void> {
    try {
      const initResult = await Store.init()
      if (E.isLeft(initResult)) {
        console.error(
          "[ProxyStore] Failed to initialize store:",
          initResult.left
        )
        return
      }

      await this.loadSettings()

      const watcher = await Store.watch(STORE_NAMESPACE, SETTINGS_KEY)
      watcher.on("change", async ({ value }: { value?: unknown }) => {
        if (value) {
          const storedData = value as StoredData
          const incomingProxyUrl = storedData.settings?.proxyUrl
          this._settings.value = {
            ...this._settings.value,
            // Only sync user-configurable fields from external changes.
            // Keep the current value if the incoming one is missing (older
            // schema) or invalid (another tab wrote junk via a path that
            // bypassed validation). accessToken stays env-derived.
            proxyUrl:
              incomingProxyUrl && isValidProxyUrl(incomingProxyUrl)
                ? incomingProxyUrl
                : this._settings.value.proxyUrl,
          }
        }
      })
    } catch (error) {
      console.error("[ProxyStore] Failed to finish setup:", error)
    } finally {
      // Always resolve readiness so consumers never hang forever.
      this._resolveReady()
    }
  }

  public whenReady(): Promise<void> {
    return this._ready
  }

  private async loadSettings(): Promise<void> {
    const loadResult = await Store.get<StoredData>(
      STORE_NAMESPACE,
      SETTINGS_KEY
    )

    const defaults = await buildDefaultSettings()

    if (E.isRight(loadResult) && loadResult.right) {
      const storedData = loadResult.right
      // Reject persisted proxyUrl that wouldn't survive backend validation
      // (e.g. junk left over from before client-side validation existed).
      // Without this, execute() would post requests to an invalid URL.
      const persistedProxyUrl = storedData.settings?.proxyUrl
      const proxyUrl =
        persistedProxyUrl && isValidProxyUrl(persistedProxyUrl)
          ? persistedProxyUrl
          : defaults.proxyUrl
      this._settings.value = {
        ...defaults,
        // Only restore user-configurable fields from storage.
        // accessToken is env-derived (VITE_PROXYSCOTCH_ACCESS_TOKEN) and
        // must always reflect the current deployment, not a stale persisted value.
        proxyUrl,
      }
      // If we had to discard a bad persisted value, write the corrected
      // settings back so we don't repeat the fallback on every boot.
      if (proxyUrl !== persistedProxyUrl) {
        await this.persistSettings()
      }
    } else {
      this._settings.value = { ...defaults }
      await this.persistSettings()
    }
  }

  private async persistSettings(): Promise<void> {
    const rawSettings = toRaw(this._settings.value)

    const storedData: StoredData = {
      version: "v1",
      settings: { ...rawSettings },
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

  /**
   * Update user-configurable proxy settings.
   * Only `proxyUrl` is user-configurable, `accessToken` and `version` are
   * derived at runtime and cannot be overwritten by callers.
   */
  public async updateSettings(
    patch: Pick<ProxySettings, "proxyUrl">
  ): Promise<void> {
    // Belt-and-suspenders: the settings UI already gates this, but the
    // store is a public API any future caller can hit, and execute() uses
    // proxyUrl directly. Reject invalid input here so the interceptor
    // can't be silently broken from outside the settings screen.
    if (!isValidProxyUrl(patch.proxyUrl)) {
      console.warn(
        "[ProxyStore] Refused to persist invalid proxy URL:",
        patch.proxyUrl
      )
      return
    }
    this._settings.value = {
      ...this._settings.value,
      proxyUrl: patch.proxyUrl,
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
