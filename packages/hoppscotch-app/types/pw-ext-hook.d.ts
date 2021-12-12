import { AxiosRequestConfig } from "axios"
import { NetworkResponse } from "~/helpers/network"

export interface PWExtensionHook {
  getVersion: () => { major: number; minor: number }
  sendRequest: (
    req: AxiosRequestConfig & { wantsBinary: boolean }
  ) => Promise<NetworkResponse>
  cancelRunningRequest: () => void
}
