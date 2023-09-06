export const knownRealtimeContentTypes = {
  JSON: "application/json",
  Raw: "text/plain",
} as const

export type ValidRealtimeContentTypes = keyof typeof knownRealtimeContentTypes
export const validRealtimeContentTypes = Object.keys(knownRealtimeContentTypes);
