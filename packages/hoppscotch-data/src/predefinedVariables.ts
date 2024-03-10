export type PredefinedVariable = {
  key: `$${string}`
  value: () => string
}

export const HOPP_PREDEFINED_VARIABLES: PredefinedVariable[] = [
  {
    key: "$guid", value: () => "THIS_IS_THE_GUID_VALUE"
  },
]
