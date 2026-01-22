import { invoke } from '@tauri-apps/api/core'

export interface DownloadOptions {
  serverUrl: string
}

export interface DownloadResponse {
  success: boolean
  bundleName: string
  serverUrl: string
  version: string
}

export interface WindowOptions {
  title?: string
  width?: number
  height?: number
  resizable?: boolean
}

export interface LoadOptions {
  bundleName: string
  /**
   * Optional host override for the webview URL.
   *
   * When provided, the webview will be loaded with `app://{host}/` instead of
   * `app://{bundleName}/`. This enables cloud-for-orgs support where the same
   * bundle serves multiple organization subdomains.
   *
   * The host will be sanitized (dots become underscores) for URL compatibility.
   * The JavaScript bundle can read `window.location.hostname` to determine
   * the organization context.
   *
   * @example
   * // Load Hoppscotch bundle as acme.hoppscotch.io
   * load({ bundleName: "Hoppscotch", host: "acme.hoppscotch.io" })
   * // Results in: window.location.hostname === "acme_hoppscotch_io"
   */
  host?: string;
  inline?: boolean;
  window?: WindowOptions;
}

export interface LoadResponse {
  success: boolean
  windowLabel: string
}

export interface CloseOptions {
  windowLabel: string
}

export interface CloseResponse {
  success: boolean
}

export interface RemoveOptions {
  bundleName: string
  serverUrl: string
}

export interface RemoveResponse {
  success: boolean
  bundleName: string
}

export async function download(options: DownloadOptions): Promise<DownloadResponse> {
  return await invoke<DownloadResponse>('plugin:appload|download', { options })
}

export async function load(options: LoadOptions): Promise<LoadResponse> {
  return await invoke<LoadResponse>('plugin:appload|load', { options })
}

export async function close(options: CloseOptions): Promise<CloseResponse> {
  return await invoke<CloseResponse>('plugin:appload|close', { options })
}

export async function remove(options: RemoveOptions): Promise<RemoveResponse> {
  return await invoke<RemoveResponse>('plugin:appload|remove', { options })
}

export async function clear(): Promise<void> {
  return await invoke('plugin:appload|clear')
}
