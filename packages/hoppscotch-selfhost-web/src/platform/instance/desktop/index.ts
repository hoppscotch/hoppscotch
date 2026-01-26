import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as Ord from "fp-ts/Ord"
import * as N from "fp-ts/number"
import * as TE from "fp-ts/TaskEither"
import * as O from "fp-ts/Option"
import { map } from "rxjs/operators"

import {
  download,
  load,
  close,
  clear,
  remove,
  type DownloadResponse,
  type LoadOptions,
  type LoadResponse,
  type CloseResponse,
  type RemoveResponse,
} from "@hoppscotch/plugin-appload"

import { Service } from "dioc"
import { BehaviorSubject, Observable } from "rxjs"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"

import {
  Instance,
  ConnectionState,
  OperationResult,
  InstanceKind,
  InstancePlatformDef,
  VENDORED_INSTANCE_CONFIG,
} from "@hoppscotch/common/platform/instance"

import { Store } from "@app/kernel/store"
import { getKernelMode } from "@hoppscotch/kernel"
import { getService } from "@hoppscotch/common/modules/dioc"

const STORE_NAMESPACE = "hoppscotch-desktop.v1"

type RecentInstances = Instance[]

const sortByLastUsedDesc = A.sort(
  pipe(
    N.Ord,
    Ord.reverse,
    Ord.contramap((instance: Instance) => new Date(instance.lastUsed).getTime())
  )
)

export class DesktopInstanceService
  extends Service<ConnectionState>
  implements InstancePlatformDef
{
  public static readonly ID = "DESKTOP_INSTANCE_SERVICE"

  private connectionState$ = new BehaviorSubject<ConnectionState>(
    this.getDefaultConnectionState()
  )
  private recentInstances$ = new BehaviorSubject<RecentInstances>(
    this.getDefaultRecentInstances()
  )

  /**
   * Enable instance switching for this platform, adherence to platform def
   */
  public readonly instanceSwitchingEnabled: boolean =
    getKernelMode() === "desktop"

  /**
   * Configuration options for instance management
   */
  public readonly config: InstancePlatformDef["config"] = {
    maxRecentInstances: 10,
    defaultWindowOptions: {
      title: "Hoppscotch",
      width: 1200,
      height: 800,
      resizable: true,
    },
    autoReconnect: false,
    connectionTimeout: 30000,
    confirmDestructiveOperations: true,
  }

  /**
   * Gets observable stream of connection state
   */
  public getConnectionStateStream(): Observable<ConnectionState> {
    return this.connectionState$.asObservable()
  }

  /**
   * Gets observable stream of recent instances
   */
  public getRecentInstancesStream(): Observable<RecentInstances> {
    return this.recentInstances$.asObservable()
  }

  /**
   * Gets observable stream of the current active instance
   */
  public getCurrentInstanceStream(): Observable<Instance | null> {
    return this.getConnectionStateStream().pipe(
      map((state) => (state.status === "connected" ? state.instance : null))
    )
  }

  /**
   * Gets current connection state synchronously
   */
  public getCurrentConnectionState(): ConnectionState {
    return this.connectionState$.value
  }

  /**
   * Gets recent instances synchronously
   */
  public getRecentInstances(): RecentInstances {
    return this.recentInstances$.value
  }

  /**
   * Gets the current active instance synchronously
   */
  public getCurrentInstance(): Instance | null {
    const state = this.getCurrentConnectionState()
    return state.status === "connected" ? state.instance : null
  }

  /**
   * Connects to an instance
   */
  public async connectToInstance(
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string,
    options?: Partial<LoadOptions>
  ): Promise<OperationResult> {
    console.log(`[InstanceService] Connecting to: ${serverUrl}`)

    if (this.beforeConnect) {
      const shouldContinue = await this.beforeConnect(
        serverUrl,
        instanceKind,
        displayName
      )
      if (!shouldContinue) {
        console.log(
          `[InstanceService] Connection cancelled by beforeConnect hook`
        )
        return {
          success: false,
          message: "Connection cancelled by beforeConnect hook",
        }
      }
    }

    const result = await this.connectToInstanceTE(
      serverUrl,
      instanceKind,
      displayName,
      options
    )()

    const operationResult = pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Connection failed: ${error}`)
          if (this.onConnectionError) {
            this.onConnectionError(error, serverUrl)
          }
          return { success: false, message: error }
        },
        (operationResult) => {
          console.log(`[InstanceService] Connection successful`)
          return operationResult
        }
      )
    )

    if (operationResult.success && this.afterConnect) {
      const currentInstance = this.getCurrentInstance()
      if (currentInstance) {
        await this.afterConnect(currentInstance)
      }
    }

    return operationResult
  }

  /**
   * Downloads an instance without connecting
   */
  public async downloadInstance(
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string
  ): Promise<OperationResult> {
    console.log(`[InstanceService] Downloading instance: ${serverUrl}`)

    const result = await this.downloadInstanceTE(
      serverUrl,
      instanceKind,
      displayName
    )()

    return pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Download failed: ${error}`)
          if (this.onDownloadError) {
            this.onDownloadError(error, serverUrl)
          }
          return { success: false, message: error }
        },
        (instance): OperationResult => {
          console.log(
            `[InstanceService] Download successful: ${instance.displayName}`
          )
          return {
            success: true,
            message: `Successfully downloaded ${instance.displayName}`,
            data: instance,
          }
        }
      )
    )
  }

  /**
   * Loads a previously downloaded instance
   */
  public async loadInstance(
    instance: Instance,
    options?: Partial<LoadOptions>
  ): Promise<OperationResult> {
    console.log(`[InstanceService] Loading instance: ${instance.displayName}`)

    const result = await this.loadInstanceTE(instance, options)()

    return pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Load failed: ${error}`)
          if (this.onLoadError) {
            this.onLoadError(error, instance)
          }
          return { success: false, message: error }
        },
        (loadResponse): OperationResult => {
          console.log(
            `[InstanceService] Load successful: ${instance.displayName}`
          )
          return {
            success: true,
            message: `Successfully loaded ${instance.displayName}`,
            data: loadResponse,
          }
        }
      )
    )
  }

  /**
   * Removes an instance and its data (except vendored instance)
   */
  public async removeInstance(instance: Instance): Promise<OperationResult> {
    if (instance.kind === "vendored") {
      console.log(
        `[InstanceService] Attempted to remove vendored instance: ${instance.displayName}`
      )
      return {
        success: false,
        message: "Built-in instances cannot be removed",
      }
    }

    console.log(`[InstanceService] Removing instance: ${instance.displayName}`)

    if (this.beforeRemove) {
      const shouldContinue = await this.beforeRemove(instance)
      if (!shouldContinue) {
        console.log(`[InstanceService] Removal cancelled by beforeRemove hook`)
        return {
          success: false,
          message: "Removal cancelled by beforeRemove hook",
        }
      }
    }

    const result = await this.removeInstanceTE(instance)()

    const operationResult = pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Removal failed: ${error}`)
          if (this.onRemoveError) {
            this.onRemoveError(error, instance)
          }
          return { success: false, message: error }
        },
        (operationResult) => {
          console.log(`[InstanceService] Removal successful`)
          return operationResult
        }
      )
    )

    if (operationResult.success && this.afterRemove) {
      await this.afterRemove(instance)
    }

    return operationResult
  }

  /**
   * Disconnects from current instance
   */
  public async disconnect(): Promise<OperationResult> {
    console.log(`[InstanceService] Disconnecting`)

    const currentInstance = this.getCurrentInstance()

    if (currentInstance && this.beforeDisconnect) {
      const shouldContinue = await this.beforeDisconnect(currentInstance)
      if (!shouldContinue) {
        console.log(
          `[InstanceService] Disconnection cancelled by beforeDisconnect hook`
        )
        return {
          success: false,
          message: "Disconnection cancelled by beforeDisconnect hook",
        }
      }
    }

    const result = await this.disconnectTE()()

    const operationResult = pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Disconnection failed: ${error}`)
          return { success: false, message: error }
        },
        (operationResult) => {
          console.log(`[InstanceService] Disconnection successful`)
          return operationResult
        }
      )
    )

    if (operationResult.success && this.afterDisconnect) {
      await this.afterDisconnect()
    }

    return operationResult
  }

  /**
   * Clears all cached instances
   */
  public async clearCache(): Promise<OperationResult> {
    console.log(`[InstanceService] Clearing cache`)

    const result = await this.clearCacheTE()()

    return pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Cache clear failed: ${error}`)
          return { success: false, message: error }
        },
        (operationResult) => {
          console.log(`[InstanceService] Cache cleared successfully`)
          return operationResult
        }
      )
    )
  }

  /**
   * Closes a window
   */
  public async closeWindow(windowLabel?: string): Promise<OperationResult> {
    console.log(`[InstanceService] Closing window: ${windowLabel || "current"}`)

    const result = await pipe(
      this.performCloseTE(windowLabel),
      TE.chain((response) =>
        this.validateCloseResponseTE(response, windowLabel)
      )
    )()

    return pipe(
      result,
      E.fold(
        (error): OperationResult => {
          console.log(`[InstanceService] Window close failed: ${error}`)
          return { success: false, message: error }
        },
        (closeResponse): OperationResult => {
          console.log(`[InstanceService] Window close successful`)
          return {
            success: true,
            message: `Successfully closed window ${windowLabel || "current"}`,
            data: closeResponse,
          }
        }
      )
    )
  }

  /**
   * Normalizes a URL
   */
  public normalizeUrl(url: string): string | null {
    return pipe(
      this.normalizeUrlE(url),
      E.fold(
        () => null,
        (normalized) => normalized
      )
    )
  }

  /**
   * Validates if a server URL is reachable and compatible
   */
  public async validateServerUrl(url: string): Promise<{
    valid: boolean
    version?: string
    instanceKind?: InstanceKind
    error?: string
  }> {
    console.log(`[InstanceService] Validating server URL: ${url}`)

    const normalizedUrl = this.normalizeUrl(url)
    if (!normalizedUrl) {
      return {
        valid: false,
        error: "Invalid URL format",
      }
    }

    try {
      const result = await this.performDownloadTE(normalizedUrl)()

      return pipe(
        result,
        E.fold(
          (
            error
          ): {
            valid: boolean
            version?: string
            instanceKind?: InstanceKind
            error?: string
          } => ({
            valid: false,
            error,
          }),
          (
            response
          ): {
            valid: boolean
            version?: string
            instanceKind?: InstanceKind
            error?: string
          } => {
            if (response.success) {
              console.log(`[InstanceService] URL validation successful`)
              return {
                valid: true,
                version: response.version,
                instanceKind: "on-prem" as InstanceKind,
              }
            } else {
              return {
                valid: false,
                error: "Server validation failed",
              }
            }
          }
        )
      )
    } catch (error) {
      console.log(`[InstanceService] URL validation failed: ${error}`)
      return {
        valid: false,
        error: `Validation failed: ${error}`,
      }
    }
  }

  public beforeConnect?: (
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string
  ) => Promise<boolean>

  public afterConnect?: (instance: Instance) => Promise<void>

  public beforeDisconnect?: (instance: Instance) => Promise<boolean>

  public afterDisconnect?: () => Promise<void>

  public beforeRemove?: (instance: Instance) => Promise<boolean>

  public afterRemove?: (instance: Instance) => Promise<void>

  public onConnectionError?: (error: string, target: string) => void

  public onDownloadError?: (error: string, serverUrl: string) => void

  public onLoadError?: (error: string, instance: Instance) => void

  public onRemoveError?: (error: string, instance: Instance) => void

  private getDefaultRecentInstances(): RecentInstances {
    return []
  }

  private getDefaultConnectionState(): ConnectionState {
    return { status: "idle" }
  }

  private loadRecentInstancesTE(): TE.TaskEither<string, RecentInstances> {
    console.log("[DEBUG] loadRecentInstancesTE called")

    return pipe(
      TE.tryCatch(
        async () => {
          console.log("[DEBUG] About to call Store.get for recentInstances")
          const result = await Store.get<RecentInstances>(
            STORE_NAMESPACE,
            "recentInstances"
          )
          console.log("[DEBUG] Store.get result:", result)
          return result
        },
        (error) => {
          console.error("[DEBUG] Store.get failed:", error)
          return `Failed to load recent instances: ${error}`
        }
      ),
      TE.map(
        E.fold(
          (storeError) => {
            console.log("[DEBUG] Store.get returned Left (error):", storeError)
            const defaultInstances = this.getDefaultRecentInstances()
            console.log("[DEBUG] Using default instances:", defaultInstances)
            return defaultInstances
          },
          (instances) => {
            console.log(
              "[DEBUG] Store.get returned Right (success):",
              instances
            )

            return pipe(
              O.fromNullable(instances),
              O.fold(
                () => {
                  console.log(
                    "[DEBUG] Instances is null/undefined, using default"
                  )
                  const defaultInstances = this.getDefaultRecentInstances()
                  console.log("[DEBUG] Default instances:", defaultInstances)
                  return defaultInstances
                },
                (instances) => {
                  console.log("[DEBUG] Processing loaded instances:", instances)

                  const processed = pipe(
                    instances,
                    sortByLastUsedDesc,
                    this.config?.maxRecentInstances
                      ? A.takeLeft(this.config.maxRecentInstances)
                      : (x) => x
                  )

                  console.log("[DEBUG] After sorting and limiting:", processed)
                  return processed
                }
              )
            )
          }
        )
      )
    )
  }

  private loadConnectionStateTE(): TE.TaskEither<string, ConnectionState> {
    return pipe(
      TE.tryCatch(
        () => Store.get<ConnectionState>(STORE_NAMESPACE, "connectionState"),
        (error) => `Failed to load connection state: ${error}`
      ),
      TE.map(
        E.fold(
          () => this.getDefaultConnectionState(),
          (state) =>
            pipe(
              O.fromNullable(state),
              O.getOrElse(() => this.getDefaultConnectionState())
            )
        )
      )
    )
  }

  private initializeServiceTE(): TE.TaskEither<
    string,
    {
      instances: RecentInstances
      state: ConnectionState
    }
  > {
    return pipe(
      pipe(
        TE.tryCatch(
          () => Store.init(),
          (error) => `Store initialization failed: ${error}`
        ),
        TE.chainEitherK(E.mapLeft(() => "Failed to initialize store"))
      ),
      TE.chain(() =>
        pipe(
          TE.Do,
          TE.bind("instances", () => this.loadRecentInstancesTE()),
          TE.bind("state", () => this.loadConnectionStateTE())
        )
      )
    )
  }

  private updateConnectionState(state: ConnectionState): void {
    this.connectionState$.next(state)
    this.emit(state)
  }

  private updateRecentInstances(instances: RecentInstances): void {
    this.recentInstances$.next(instances)
  }

  override async onServiceInit(): Promise<void> {
    console.log(`[InstanceService] Initializing service`)

    await pipe(
      this.initializeServiceTE(),
      TE.chain(({ instances, state }) => {
        console.log("[DEBUG] initializeServiceTE returned:", {
          instances,
          state,
        })

        this.updateRecentInstances(instances)
        this.updateConnectionState(state)

        return pipe(
          TE.of({ instances, state }),
          TE.chainFirst(() => this.initializeVendoredInstanceTE()),
          TE.map(({ instances, state }) => {
            console.log(
              "[DEBUG] Before updating state - loaded instances:",
              instances
            )
            console.log(
              "[DEBUG] Before updating state - connection state:",
              state
            )
            console.log(
              "[DEBUG] Current BehaviorSubject instances:",
              this.recentInstances$.value
            )

            console.log(
              `[InstanceService] Service initialized with ${this.recentInstances$.value.length} recent instances`
            )

            this.updateConnectionState(state)

            console.log(
              "[DEBUG] After updateConnectionState, BehaviorSubject value:",
              this.connectionState$.value
            )
          })
        )
      }),
      TE.fold(
        (error) => async () => {
          console.error("Service initialization failed:", error)
          this.updateConnectionState({
            status: "error",
            target: "store",
            message: error,
          })
        },
        () => async () => {
          console.log(`[InstanceService] Service initialization complete`)
          console.log(
            "[DEBUG] Final recentInstances$ value:",
            this.recentInstances$.value
          )
          console.log(
            "[DEBUG] Final connectionState$ value:",
            this.connectionState$.value
          )
        }
      )
    )()
  }

  private initializeVendoredInstanceTE(): TE.TaskEither<string, void> {
    console.log(`[InstanceService] Checking for vendored instance`)

    return pipe(
      TE.of(this.recentInstances$.value),
      TE.chain((currentInstances) => {
        const hasVendored = currentInstances.some((i) => i.kind === "vendored")

        if (hasVendored) {
          console.log(
            `[InstanceService] Vendored instance already exists, skipping`
          )
          return TE.of(undefined)
        } else {
          console.log(
            `[InstanceService] Vendored instance missing, adding to recent instances`
          )
          return pipe(
            TE.of(VENDORED_INSTANCE_CONFIG),
            TE.chainFirst((instance) => this.addToRecentInstancesTE(instance)),
            TE.map(() => undefined)
          )
        }
      })
    )
  }

  private setConnectionState(
    newState: ConnectionState
  ): TE.TaskEither<string, ConnectionState> {
    return pipe(
      TE.tryCatch(
        () => Store.set(STORE_NAMESPACE, "connectionState", newState),
        (error) => `Failed to save connection state: ${error}`
      ),
      TE.map((): ConnectionState => {
        this.updateConnectionState(newState)
        return newState
      })
    )
  }

  private setRecentInstances(
    newInstances: RecentInstances
  ): TE.TaskEither<string, RecentInstances> {
    console.log("[DEBUG] setRecentInstances called with:", newInstances)

    const limitedInstances = this.config?.maxRecentInstances
      ? pipe(newInstances, A.takeLeft(this.config.maxRecentInstances))
      : newInstances

    console.log(
      "[DEBUG] After applying maxRecentInstances limit:",
      limitedInstances
    )
    console.log(
      "[DEBUG] maxRecentInstances config:",
      this.config?.maxRecentInstances
    )

    return pipe(
      TE.tryCatch(
        async () => {
          console.log("[DEBUG] About to call Store.set with:", limitedInstances)
          const result = await Store.set(
            STORE_NAMESPACE,
            "recentInstances",
            limitedInstances
          )
          console.log("[DEBUG] Store.set result:", result)
          return result
        },
        (error) => {
          console.error("[DEBUG] Store.set failed with error:", error)
          return `Failed to save recent instances: ${error}`
        }
      ),
      TE.map((_storeResult): RecentInstances => {
        console.log("[DEBUG] Store.set succeeded, updating BehaviorSubject")
        console.log(
          "[DEBUG] Before updateRecentInstances, current value:",
          this.recentInstances$.value
        )
        this.updateRecentInstances(limitedInstances)
        console.log(
          "[DEBUG] After updateRecentInstances, new value:",
          this.recentInstances$.value
        )
        return limitedInstances
      })
    )
  }

  private normalizeUrlE(url: string): E.Either<string, string> {
    return pipe(
      E.tryCatch(
        () => {
          const parsed = new URL(url.includes("://") ? url : `http://${url}`)
          return `${parsed.protocol}//${parsed.host}/desktop-app-server`
        },
        (error) => `Failed to normalize URL: ${error}`
      )
    )
  }

  private setConnectingStateTE(
    target: string
  ): TE.TaskEither<string, ConnectionState> {
    console.log(`[InstanceService] Setting connecting state for: ${target}`)
    return this.setConnectionState({ status: "connecting", target })
  }

  private performDownloadTE(
    serverUrl: string
  ): TE.TaskEither<string, DownloadResponse> {
    console.log(`[InstanceService] Downloading from: ${serverUrl}`)

    const timeout = this.config?.connectionTimeout || 30000

    return TE.tryCatch(
      () =>
        Promise.race([
          download({ serverUrl }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Connection timeout after ${timeout}ms`)),
              timeout
            )
          ),
        ]),
      (error) => `Failed to download instance: ${error}`
    )
  }

  private validateDownloadResponseTE(
    response: DownloadResponse,
    serverUrl: string
  ): TE.TaskEither<string, DownloadResponse> {
    return response.success
      ? TE.right(response)
      : TE.left(`Download failed for ${serverUrl}`)
  }

  private createInstanceFromDownload(
    response: DownloadResponse,
    instanceKind: InstanceKind,
    displayName?: string
  ): Instance {
    const finalDisplayName = pipe(
      O.fromNullable(displayName),
      O.getOrElse(() => response.serverUrl),
      (rawName) =>
        pipe(
          E.tryCatch(
            () =>
              new URL(rawName.includes("://") ? rawName : `http://${rawName}`),
            () => rawName
          ),
          E.fold(
            (fallback) => fallback,
            (urlObj) => {
              const hostnameParts = urlObj.hostname.split(".")
              const mainDomain = hostnameParts.slice(-2).join(".")

              return mainDomain === "hoppscotch"
                ? "Hoppscotch"
                : mainDomain || urlObj.hostname.replace(/^www\./, "")
            }
          )
        )
    )

    return {
      kind: instanceKind,
      serverUrl: response.serverUrl,
      displayName: finalDisplayName,
      version: response.version,
      lastUsed: new Date().toISOString(),
      bundleName: response.bundleName,
    }
  }

  private downloadInstanceTE(
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string
  ): TE.TaskEither<string, Instance> {
    return pipe(
      this.normalizeUrlE(serverUrl),
      TE.fromEither,
      TE.chain((normalizedUrl) =>
        pipe(
          this.setConnectingStateTE(normalizedUrl),
          TE.chain(() => this.performDownloadTE(normalizedUrl)),
          TE.chain((response) =>
            this.validateDownloadResponseTE(response, normalizedUrl)
          ),
          TE.map((response) =>
            this.createInstanceFromDownload(response, instanceKind, displayName)
          )
        )
      )
    )
  }

  private getBundleNameTE(instance: Instance): TE.TaskEither<string, string> {
    return pipe(
      O.fromNullable(instance.bundleName),
      TE.fromOption(() => `Instance ${instance.displayName} has no bundle name`)
    )
  }

  private buildLoadOptions(
    instance: Instance,
    options?: Partial<LoadOptions>
  ): LoadOptions {
    const defaultWindowOptions = this.config?.defaultWindowOptions || {
      title: "Hoppscotch",
      width: 1200,
      height: 800,
      resizable: true,
    }

    return {
      bundleName: instance.bundleName!,
      inline: options?.inline ?? true,
      window: options?.window ?? defaultWindowOptions,
    }
  }

  private performLoadTE(
    loadOptions: LoadOptions
  ): TE.TaskEither<string, LoadResponse> {
    console.log(
      `[InstanceService] Loading with bundle: ${loadOptions.bundleName}`
    )

    return TE.tryCatch(
      () => load(loadOptions),
      (error) => `Failed to load instance: ${error}`
    )
  }

  private validateLoadResponseTE(
    response: LoadResponse,
    displayName: string
  ): TE.TaskEither<string, LoadResponse> {
    return response.success
      ? TE.right(response)
      : TE.left(`Failed to load instance ${displayName}`)
  }

  private updateInstanceStateTE(
    instance: Instance
  ): TE.TaskEither<string, ConnectionState> {
    console.log(`[InstanceService] Updating instance state to connected`)
    return this.setConnectionState({ status: "connected", instance })
  }

  private performCloseTE(
    windowLabel?: string
  ): TE.TaskEither<string, CloseResponse> {
    console.log(`[InstanceService] Closing window: ${windowLabel || "current"}`)

    return TE.tryCatch(
      async () => {
        const currentWindow = getCurrentWebviewWindow()
        const labelToClose = windowLabel || currentWindow.label

        if (labelToClose === "main") {
          throw new Error("Cannot close main window")
        }

        const closeResponse = await close({ windowLabel: labelToClose })
        return closeResponse
      },
      (error) => `Failed to close window: ${error}`
    )
  }

  private validateCloseResponseTE(
    response: CloseResponse,
    windowLabel?: string
  ): TE.TaskEither<string, CloseResponse> {
    return response.success
      ? TE.right(response)
      : TE.left(`Failed to close window ${windowLabel || "current"}`)
  }

  private loadInstanceTE(
    instance: Instance,
    options?: Partial<LoadOptions>
  ): TE.TaskEither<string, LoadResponse> {
    return pipe(
      instance.kind === "vendored"
        ? TE.of(undefined)
        : TE.tryCatch(
            async () => {
              console.log(
                `[InstanceService] Ensuring bundle is available for: ${instance.displayName}`
              )
              await download({ serverUrl: instance.serverUrl })
              return undefined
            },
            (error) => `Failed to ensure bundle is available: ${error}`
          ),
      TE.chain(() => this.getBundleNameTE(instance)),
      TE.map(() => this.buildLoadOptions(instance, options)),
      TE.chain((loadOptions) => this.performLoadTE(loadOptions)),
      TE.chain((response) =>
        this.validateLoadResponseTE(response, instance.displayName)
      ),
      TE.chainFirst(() => this.updateInstanceStateTE(instance)),
      TE.chainFirst(() => this.updateInstanceLastUsed(instance)),
      TE.chainFirst((_loadResponse) =>
        TE.fromTask(async () => {
          try {
            const closeResult = await this.performCloseTE()()
            if (E.isRight(closeResult)) {
              const validateResult = await this.validateCloseResponseTE(
                closeResult.right
              )()
              if (E.isRight(validateResult)) {
                console.log(`Window closed successfully after load`)
              } else {
                console.warn(
                  `Window close validation failed but load succeeded: ${validateResult.left}`
                )
              }
            } else {
              console.warn(
                `Window close failed but load succeeded: ${closeResult.left}`
              )
            }
          } catch (error) {
            console.warn(`Window close error but load succeeded: ${error}`)
          }
          return undefined
        })
      )
    )
  }

  private performRemoveTE(
    bundleName: string,
    serverUrl: string
  ): TE.TaskEither<string, RemoveResponse> {
    console.log(`[InstanceService] Removing bundle: ${bundleName}`)

    return TE.tryCatch(
      () => remove({ bundleName, serverUrl }),
      (error) => `Failed to remove instance: ${error}`
    )
  }

  private validateRemoveResponseTE(
    response: RemoveResponse,
    displayName: string
  ): TE.TaskEither<string, RemoveResponse> {
    return response.success
      ? TE.right(response)
      : TE.left(`Failed to remove instance ${displayName}`)
  }

  private removeFromRecentInstancesTE(
    serverUrl: string
  ): TE.TaskEither<string, RecentInstances> {
    return pipe(
      this.recentInstances$.value,
      A.filter((i) => {
        // NOTE: Never remove vendored instances from recent instances list.
        if (i.kind === "vendored") {
          console.log(
            `[InstanceService] Preserving vendored instance: ${i.displayName}`
          )
          return true
        }
        return i.serverUrl !== serverUrl
      }),
      (filtered) => this.setRecentInstances(filtered)
    )
  }

  private removeInstanceTE(
    instance: Instance
  ): TE.TaskEither<string, OperationResult> {
    return pipe(
      O.fromNullable(instance.bundleName),
      O.fold(
        () =>
          TE.left(`Instance ${instance.displayName} has no bundle to remove`),
        (bundleName) =>
          pipe(
            this.performRemoveTE(bundleName, instance.serverUrl),
            TE.chain((response) =>
              this.validateRemoveResponseTE(response, instance.displayName)
            ),
            TE.chainFirst(() =>
              this.removeFromRecentInstancesTE(instance.serverUrl)
            ),
            TE.map(
              (): OperationResult => ({
                success: true,
                message: `Successfully removed ${instance.displayName}`,
              })
            )
          )
      )
    )
  }

  private clearCacheTE(): TE.TaskEither<string, OperationResult> {
    return pipe(
      TE.tryCatch(
        () => clear(),
        (error) => `Failed to clear cache: ${error}`
      ),
      TE.chainFirst(() => {
        const vendoredInstance = this.recentInstances$.value.find(
          (i) => i.kind === "vendored"
        )
        const instancesToKeep = vendoredInstance ? [vendoredInstance] : []
        return this.setRecentInstances(instancesToKeep)
      }),
      TE.map(
        (): OperationResult => ({
          success: true,
          message: "Cache cleared successfully",
        })
      )
    )
  }

  private createOrGetInstanceTE(
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string
  ): TE.TaskEither<string, Instance> {
    return pipe(
      this.findInstanceByUrl(serverUrl),
      O.fold(
        () => {
          console.log(
            `[InstanceService] Instance not found, downloading new: ${serverUrl}`
          )
          return pipe(
            this.downloadInstanceTE(serverUrl, instanceKind, displayName),
            TE.chainFirst((newInstance) =>
              this.addToRecentInstancesTE(newInstance)
            )
          )
        },
        (existing) => {
          console.log(
            `[InstanceService] Using existing instance: ${existing.displayName}`
          )
          return TE.right(existing)
        }
      )
    )
  }

  private addToRecentInstancesTE(
    instance: Instance
  ): TE.TaskEither<string, RecentInstances> {
    console.log(
      `[InstanceService] Adding to recent instances: ${instance.displayName}`
    )

    console.log(
      "[DEBUG] Current recentInstances$ before adding:",
      this.recentInstances$.value
    )

    return pipe(
      this.recentInstances$.value,
      A.prepend(instance),
      (withNew) => {
        console.log("[DEBUG] After prepending:", withNew)
        return withNew
      },
      sortByLastUsedDesc,
      (afterSort) => {
        console.log("[DEBUG] After sorting:", afterSort)
        return afterSort
      },
      (updated) => {
        console.log("[DEBUG] About to save to store:", updated)
        return this.setRecentInstances(updated)
      }
    )
  }

  private connectToInstanceTE(
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string,
    options?: Partial<LoadOptions>
  ): TE.TaskEither<string, OperationResult> {
    return pipe(
      this.normalizeUrlE(serverUrl),
      TE.fromEither,
      TE.chain((normalizedUrl) =>
        pipe(
          this.createOrGetInstanceTE(normalizedUrl, instanceKind, displayName),
          TE.chain((instance) => this.loadInstanceTE(instance, options)),
          TE.map(
            (): OperationResult => ({
              success: true,
              message: `Successfully connected to ${displayName || serverUrl}`,
            })
          )
        )
      )
    )
  }

  private findInstanceByUrl(serverUrl: string): O.Option<Instance> {
    const extractHost = (url: string): string =>
      url.startsWith("app://")
        ? url.split("/")[2]
        : pipe(
            E.tryCatch(
              () => new URL(url).host,
              () => url
            ),
            E.getOrElse((fallback) => fallback)
          )

    const targetHost = extractHost(serverUrl)

    console.log(
      `[InstanceService] Looking up ${targetHost} in ${JSON.stringify(this.recentInstances$.value, null, 2)}`
    )

    return pipe(
      this.recentInstances$.value,
      A.findFirst((instance) => extractHost(instance.serverUrl) === targetHost)
    )
  }

  private updateInstanceLastUsed(
    instance: Instance
  ): TE.TaskEither<string, void> {
    console.log(
      `[InstanceService] Updating last used for: ${instance.displayName}`
    )

    return pipe(
      this.recentInstances$.value,
      A.map((i) =>
        i.serverUrl === instance.serverUrl
          ? { ...i, lastUsed: new Date().toISOString() }
          : i
      ),
      sortByLastUsedDesc,
      (updated) => this.setRecentInstances(updated),
      TE.map(() => undefined)
    )
  }

  private disconnectTE(): TE.TaskEither<string, OperationResult> {
    return pipe(
      this.performCloseTE(),
      TE.chain((response) => this.validateCloseResponseTE(response)),
      TE.map(
        (): OperationResult => ({
          success: true,
          message: "Disconnected successfully",
        })
      ),
      TE.orElse((error) => {
        if (error.includes("Cannot close main window")) {
          console.log(
            `[InstanceService] Disconnected (main window remains open)`
          )
          return TE.right({
            success: true,
            message: "Disconnected (main window remains open)",
          })
        }
        return TE.left(error)
      })
    )
  }
}

const desktopInstanceService = getService(DesktopInstanceService)

export const def: InstancePlatformDef = desktopInstanceService
