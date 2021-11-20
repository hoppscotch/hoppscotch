export type HoppRealtimeLogLine = {
  payload: string
  source: string
  color?: string
  ts: string
}

export type HoppRealtimeLog = HoppRealtimeLogLine[]
