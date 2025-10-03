import { Observable } from "rxjs"
import { Component } from "vue"

import { type LoadOptions } from "@hoppscotch/plugin-appload"

export type InstanceKind = "on-prem" | "cloud" | "cloud-org" | "vendored"

export type Instance = {
  kind: InstanceKind
  serverUrl: string
  displayName: string
  version: string
  lastUsed: string
  bundleName?: string
}

export const VENDORED_INSTANCE_CONFIG: Instance = {
  kind: "vendored" as const,
  serverUrl: "app://hoppscotch",
  displayName: "Hoppscotch Desktop",
  version: "25.9.0",
  lastUsed: new Date().toISOString(),
  bundleName: "Hoppscotch",
}

export type ConnectionState =
  | { status: "idle" }
  | { status: "connecting"; target: string }
  | { status: "connected"; instance: Instance }
  | { status: "error"; target: string; message: string }

export type OperationResult = {
  success: boolean
  message: string
  data?: any
}

export type InstancePlatformDef = {
  /**
   * Whether instance switching is enabled for this platform
   */
  instanceSwitchingEnabled: boolean

  /**
   * Custom instance switcher component to replace the default UI
   */
  customInstanceSwitcherComponent?: Component

  /**
   * Returns an observable stream of the current connection state
   */
  getConnectionStateStream?: () => Observable<ConnectionState>

  /**
   * Returns an observable stream of recent instances
   */
  getRecentInstancesStream?: () => Observable<Instance[]>

  /**
   * Returns an observable stream of the current active instance
   */
  getCurrentInstanceStream?: () => Observable<Instance | null>

  /**
   * Gets the current connection state synchronously
   */
  getCurrentConnectionState?: () => ConnectionState

  /**
   * Gets the list of recent instances synchronously
   */
  getRecentInstances?: () => Instance[]

  /**
   * Gets the current active instance synchronously
   */
  getCurrentInstance?: () => Instance | null

  /**
   * Connects to an instance with the given options
   */
  connectToInstance?: (
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string,
    options?: Partial<LoadOptions>
  ) => Promise<OperationResult>

  /**
   * Downloads an instance bundle without connecting
   */
  downloadInstance?: (
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string
  ) => Promise<OperationResult>

  /**
   * Loads a previously downloaded instance
   */
  loadInstance?: (
    instance: Instance,
    options?: Partial<LoadOptions>
  ) => Promise<OperationResult>

  /**
   * Removes an instance and its associated data
   */
  removeInstance?: (instance: Instance) => Promise<OperationResult>

  /**
   * Disconnects from the current instance
   */
  disconnect?: () => Promise<OperationResult>

  /**
   * Clears all cached instances and data
   */
  clearCache?: () => Promise<OperationResult>

  /**
   * Validates and normalizes a server URL
   */
  normalizeUrl?: (url: string) => string | null

  /**
   * Hook called before connecting to an instance
   * Return false to prevent the connection
   */
  beforeConnect?: (
    serverUrl: string,
    instanceKind: InstanceKind,
    displayName?: string
  ) => Promise<boolean>

  /**
   * Hook called after successful connection
   */
  afterConnect?: (instance: Instance) => Promise<void>

  /**
   * Hook called before disconnecting from an instance
   * Return false to prevent the disconnection
   */
  beforeDisconnect?: (instance: Instance) => Promise<boolean>

  /**
   * Hook called after successful disconnection
   */
  afterDisconnect?: () => Promise<void>

  /**
   * Hook called before removing an instance
   * Return false to prevent the removal
   */
  beforeRemove?: (instance: Instance) => Promise<boolean>

  /**
   * Hook called after successful instance removal
   */
  afterRemove?: (instance: Instance) => Promise<void>

  /**
   * Custom error handling for connection failures
   */
  onConnectionError?: (error: string, target: string) => void

  /**
   * Custom error handling for download failures
   */
  onDownloadError?: (error: string, serverUrl: string) => void

  /**
   * Custom error handling for load failures
   */
  onLoadError?: (error: string, instance: Instance) => void

  /**
   * Custom error handling for removal failures
   */
  onRemoveError?: (error: string, instance: Instance) => void

  /**
   * Validates if a server URL is reachable and compatible
   */
  validateServerUrl?: (url: string) => Promise<{
    valid: boolean
    version?: string
    instanceKind?: InstanceKind
    error?: string
  }>

  /**
   * Configuration options for instance management
   */
  config?: {
    /**
     * Maximum number of recent instances to keep
     */
    maxRecentInstances?: number

    /**
     * Default window options for loaded instances
     */
    defaultWindowOptions?: LoadOptions["window"]

    /**
     * Whether to automatically reconnect to the last instance on startup
     */
    autoReconnect?: boolean

    /**
     * Timeout for connection attempts in milliseconds
     */
    connectionTimeout?: number

    /**
     * Whether to show confirmation dialogs for destructive operations
     */
    confirmDestructiveOperations?: boolean
  }
}
