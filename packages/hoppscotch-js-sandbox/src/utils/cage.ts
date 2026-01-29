import { FaradayCage } from "faraday-cage"

// Cached cage instance to avoid repeated WASM module allocations.
let cachedCage: FaradayCage | null = null

// Detect if running in a test environment
const isTestEnvironment =
  typeof process !== "undefined" && process.env.VITEST === "true"

/**
 * Returns a FaradayCage instance, creating and caching it on first access.
 * In test environments, always creates a fresh cage to avoid QuickJS GC corruption.
 */
export const acquireCage = async (): Promise<FaradayCage> => {
  // In test environments, create a fresh cage to avoid GC corruption
  if (isTestEnvironment) {
    return FaradayCage.create()
  }

  // In production, cache the cage for performance
  if (!cachedCage) {
    cachedCage = await FaradayCage.create()
  }

  return cachedCage
}
