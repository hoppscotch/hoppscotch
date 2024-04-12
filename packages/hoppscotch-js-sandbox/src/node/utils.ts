import { createRequire } from "module"

const nodeRequire = createRequire(import.meta.url)
const ivm = nodeRequire("isolated-vm")

// Helper function to recursively wrap methods in `ivm.Reference`
export const getSerializedAPIMethods = (
  namespaceObj: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(namespaceObj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = getSerializedAPIMethods(value as Record<string, unknown>)
    } else if (typeof value === "function") {
      result[key] = new ivm.Reference(value)
    } else {
      result[key] = value
    }
  }

  return result
}
