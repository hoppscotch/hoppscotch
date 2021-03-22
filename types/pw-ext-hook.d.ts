interface PWExtensionRequestInfo {
  method: string
  url: string
  data: any & { wantsBinary: boolean }
}

interface PWExtensionResponse {
  data: any
  config?: {
    timeData?: {
      startTime: number
      endTime: number
    }
  }
}

interface PWExtensionHook {
  getVersion: () => { major: number, minor: number }
  sendRequest: (req: PWExtensionRequestInfo) => Promise<PWExtensionResponse>
  cancelRunningRequest: () => void
}
