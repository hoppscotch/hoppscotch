import {
  GLOBAL_ENV_LATEST_VERSION,
  type GlobalEnvironment,
} from "@hoppscotch/data"

/**
 * Coerce any incoming value to a valid latest-version `GlobalEnvironment`
 * wrapper (`{ v: GLOBAL_ENV_LATEST_VERSION, variables: [...] }`).
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
 *
 * Version handling: when the input has a recognized current `v` we pass
 * the wrapper through unchanged so downstream identity checks
 * (`distinctUntilChanged`) stay stable. When `v` is missing, wrong, or
 * non-numeric we rebuild with the latest version — schema migration
 * across versions is verzod's responsibility on the load path, not
 * this dispatcher boundary.
 */
export const coerceGlobalEnvironment = (
  entries: unknown
): GlobalEnvironment => {
  if (Array.isArray(entries)) {
    return {
      v: GLOBAL_ENV_LATEST_VERSION,
      variables: entries,
    } as GlobalEnvironment
  }
  if (
    entries &&
    typeof entries === "object" &&
    "variables" in entries &&
    Array.isArray((entries as { variables: unknown }).variables)
  ) {
    const wrapper = entries as {
      v?: unknown
      variables: GlobalEnvironment["variables"]
    }
    if (wrapper.v === GLOBAL_ENV_LATEST_VERSION) {
      return wrapper as GlobalEnvironment
    }
    return {
      v: GLOBAL_ENV_LATEST_VERSION,
      variables: wrapper.variables,
    } as GlobalEnvironment
  }
  return {
    v: GLOBAL_ENV_LATEST_VERSION,
    variables: [],
  } as GlobalEnvironment
}
