import {
  GLOBAL_ENV_LATEST_VERSION,
  type GlobalEnvironment,
} from "@hoppscotch/data"

/**
 * Coerce any value to a valid latest-version `GlobalEnvironment` wrapper.
 * Accepts the wrapper itself, a bare variables array (legacy/older
 * backends), or malformed input. Passes the wrapper through identity-
 * preserving when `v` already matches; schema migration is verzod's job
 * on the load path, not this dispatcher boundary.
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
