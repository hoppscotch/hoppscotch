export type PredefinedVariable = {
  key: `$${string}`
  description: string
  value: () => string
}

export const HOPP_SUPPORTED_PREDEFINED_VARIABLES: PredefinedVariable[] = [
  {
    key: "$guid",
    description: 'A v4 style GUID.',
    value: () => "FAKE_GUID_VALUE_EXAMPLE"
  },
  {
    key: "$nowISO",
    description: "Current date and time in ISO-8601 format.",
    value: () => new Date().toISOString()
  },

  // TODO: Support various other predefined variables
]
