import { Service } from "dioc"
import type { RelayRequest } from "@hoppscotch/kernel"
import { Store } from "~/kernel/store"
import * as E from "fp-ts/Either"
import {
  InputDomainSetting,
  convertDomainSetting,
} from "~/helpers/functional/domain-settings"
import {
  type ClientCertEntry,
  resolveClientCertificate,
} from "~/helpers/functional/cert-registry"

const STORE_NAMESPACE = "interceptors.native.v1"

const STORE_KEYS = {
  SETTINGS: "settings",
} as const

interface StoredData {
  version: string
  domains: Record<string, InputDomainSetting>
  /** Multi-certificate registry — each entry maps a hostname pattern to one cert */
  clientCerts: ClientCertEntry[]
  lastUpdated: string
}

const defaultDomainConfig: InputDomainSetting = {
  version: "v1",
  security: {
    verifyHost: true,
    verifyPeer: true,
  },
  proxy: undefined,
  options: {
    followRedirects: true,
  },
}

export class KernelInterceptorNativeStore extends Service {
  public static readonly ID = "KERNEL_NATIVE_INTERCEPTOR_STORE"
  private static readonly GLOBAL_DOMAIN = "*"
  private static readonly DEFAULT_GLOBAL_SETTINGS: InputDomainSetting = {
    ...defaultDomainConfig,
    version: "v1",
  }

  private domainSettings = new Map<string, InputDomainSetting>()

  /** In-memory multi-certificate registry */
  private clientCertsRegistry: ClientCertEntry[] = []

  async onServiceInit(): Promise<void> {
    const initResult = await Store.init()
    if (E.isLeft(initResult)) {
      console.error(
        "[NativeStore] Failed to initialize store:",
        initResult.left
      )
      return
    }

    await this.loadStore()
    this.setupWatchers()
  }

  private async loadStore(): Promise<void> {
    const loadResult = await Store.get<StoredData>(
      STORE_NAMESPACE,
      STORE_KEYS.SETTINGS
    )

    if (E.isRight(loadResult) && loadResult.right) {
      const storedData = loadResult.right
      this.domainSettings = new Map(Object.entries(storedData.domains))
      this.clientCertsRegistry = storedData.clientCerts ?? []
    }

    if (!this.domainSettings.has(KernelInterceptorNativeStore.GLOBAL_DOMAIN)) {
      this.domainSettings.set(
        KernelInterceptorNativeStore.GLOBAL_DOMAIN,
        KernelInterceptorNativeStore.DEFAULT_GLOBAL_SETTINGS
      )
      await this.persistStore()
    }
  }

  private async setupWatchers() {
    const watcher = await Store.watch(STORE_NAMESPACE, STORE_KEYS.SETTINGS)
    watcher.on("change", async ({ value }: { value: unknown }) => {
      if (value) {
        const store = value as StoredData
        this.domainSettings = new Map(Object.entries(store.domains))
        this.clientCertsRegistry = store.clientCerts ?? []
      }
    })
  }

  private async persistStore(): Promise<void> {
    const store: StoredData = {
      version: "v1",
      domains: Object.fromEntries(this.domainSettings),
      clientCerts: this.clientCertsRegistry,
      lastUpdated: new Date().toISOString(),
    }

    const saveResult = await Store.set(
      STORE_NAMESPACE,
      STORE_KEYS.SETTINGS,
      store
    )
    if (E.isLeft(saveResult)) {
      throw new Error(
        `Failed to save native settings: ${String(saveResult.left)}`
      )
    }
  }

  private mergeSecurity(
    ...settings: (Required<InputDomainSetting>["security"] | undefined)[]
  ): Required<InputDomainSetting>["security"] | undefined {
    return settings.reduce(
      (acc, setting) => (setting ? { ...acc, ...setting } : acc),
      undefined as Required<RelayRequest>["security"] | undefined
    )
  }

  private mergeProxy(
    ...settings: (Required<InputDomainSetting>["proxy"] | undefined)[]
  ): Required<InputDomainSetting>["proxy"] | undefined {
    return settings.reduce(
      (acc, setting) => (setting ? { ...acc, ...setting } : acc),
      undefined as Required<InputDomainSetting>["proxy"] | undefined
    )
  }

  private mergeOptions(
    ...settings: (Required<InputDomainSetting>["options"] | undefined)[]
  ): Required<InputDomainSetting>["options"] | undefined {
    return settings.reduce(
      (acc, setting) => (setting ? { ...acc, ...setting } : acc),
      undefined as Required<InputDomainSetting>["options"] | undefined
    )
  }

  private getMergedSettings(domain: string): InputDomainSetting {
    const domainSettings = this.domainSettings.get(domain)
    const globalSettings =
      domain !== KernelInterceptorNativeStore.GLOBAL_DOMAIN
        ? this.domainSettings.get(KernelInterceptorNativeStore.GLOBAL_DOMAIN)
        : undefined

    const result = {
      security: this.mergeSecurity(
        globalSettings?.security,
        domainSettings?.security
      ),
      proxy: this.mergeProxy(globalSettings?.proxy, domainSettings?.proxy),
      options: this.mergeOptions(
        globalSettings?.options,
        domainSettings?.options
      ),
    }

    return { version: "v1", ...result }
  }

  public async completeRequest(
    request: Omit<RelayRequest, "proxy" | "security" | "meta">
  ): Promise<RelayRequest> {
    const host = new URL(request.url).host
    const settings = this.getMergedSettings(host)

    const clientCert = await resolveClientCertificate(
      new URL(request.url).hostname,
      this.clientCertsRegistry
    )
    if (clientCert) {
      settings.security = {
        ...settings.security,
        certificates: {
          ...settings.security?.certificates,
          client: clientCert,
        },
      }
    }
    const effective = convertDomainSetting(settings)

    if (E.isLeft(effective)) {
      throw effective.left
    }

    return { ...request, ...effective.right }
  }

  public getClientCerts(): ClientCertEntry[] {
    return [...this.clientCertsRegistry]
  }

  public async saveClientCerts(entries: ClientCertEntry[]): Promise<void> {
    const previous = this.clientCertsRegistry
    this.clientCertsRegistry = [...entries]
    try {
      await this.persistStore()
    } catch (error) {
      this.clientCertsRegistry = previous
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // Domain Settings
  // ---------------------------------------------------------------------------

  public getDomainSettings(domain: string): InputDomainSetting {
    return (
      this.domainSettings.get(domain) ?? {
        ...defaultDomainConfig,
        version: "v1",
      }
    )
  }

  public async saveDomainSettings(
    domain: string,
    settings: Partial<InputDomainSetting>
  ): Promise<void> {
    const previous = this.domainSettings.get(domain)
    const updatedSettings: InputDomainSetting = {
      ...settings,
      version: "v1",
    }

    this.domainSettings.set(domain, updatedSettings)
    try {
      await this.persistStore()
    } catch (error) {
      if (previous) this.domainSettings.set(domain, previous)
      else this.domainSettings.delete(domain)
      throw error
    }
  }

  public async clearDomainSettings(domain: string): Promise<void> {
    this.domainSettings.delete(domain)
    await this.persistStore()
  }

  public getDomains(): string[] {
    return Array.from(this.domainSettings.keys())
  }

  public getAllDomainSettings(): Map<string, InputDomainSetting> {
    return new Map(this.domainSettings)
  }
}
