export type HoppRealtimeLogLine = {
  payload: string
  source: string
  color?: string
  ts: number
}

export type HoppRealtimeLog = HoppRealtimeLogLine[]
