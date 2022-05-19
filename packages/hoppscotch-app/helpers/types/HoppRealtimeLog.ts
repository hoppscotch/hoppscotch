export type HoppRealtimeLogLine = {
  payload: string
  source: string
  color?: string
  ts: number | undefined
}

export type HoppRealtimeLog = HoppRealtimeLogLine[]
