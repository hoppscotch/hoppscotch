import type { GlobalEnvironment } from "@hoppscotch/data"

/**
 * Coerce any incoming value to a valid v2 `GlobalEnvironment` wrapper
 * (`{ v: 2, variables: [...] }`).
 *
 * Three shapes can reach the store dispatcher in the wild:
 *   - the wrapper itself (current FE schema)
 *   - a bare variables array (older backends, or schema drift between
 *     instances on a self-hosted deployment)
 *   - a malformed / nullish value (corrupt persistence, race, future bug)
 *
 * Backend changes can't be guaranteed across self-hosted instances, so
 * the FE must absorb all three. This helper keeps that coercion pure
 * and unit-testable, separate from the dispatcher's side effects.
 */
export const coerceGlobalEnvironment = (
  entries: unknown
): GlobalEnvironment => {
  if (Array.isArray(entries)) {
    return { v: 2, variables: entries }
  }
  if (
    entries &&
    typeof entries === "object" &&
    "variables" in entries &&
    Array.isArray((entries as { variables: unknown }).variables)
  ) {
    return entries as GlobalEnvironment
  }
  return { v: 2, variables: [] }
}
