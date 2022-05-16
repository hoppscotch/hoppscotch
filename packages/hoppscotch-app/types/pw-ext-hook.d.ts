import { AxiosRequestConfig } from "axios"
import { NetworkResponse } from "~/helpers/network"
import { ExtensionStatus } from "~/newstore/HoppExtension"

export interface PWExtensionHook {
  getVersion: () => { major: number; minor: number }
  sendRequest: (
    req: AxiosRequestConfig & { wantsBinary: boolean }
  ) => Promise<NetworkResponse>
  cancelRunningRequest: () => void
}

export type HoppExtensionStatusHook = {
  status: ExtensionStatus
  _subscribers: {
    status?: ((...args: any[]) => any)[] | undefined
  }
  subscribe(prop: "status", func: (...args: any[]) => any): void
}
