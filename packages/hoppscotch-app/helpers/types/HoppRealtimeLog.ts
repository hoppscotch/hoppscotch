export type HoppRealtimeLogLine = {
  prefix?: string
  payload: string
  source: string
  color?: string
  ts: number | undefined
}

export type HoppRealtimeLog = HoppRealtimeLogLine[]
