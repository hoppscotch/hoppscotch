/**
 * Create a function that will only run the given function once and caches the result.
 */
export function lazy<T>(fn: () => T): () => T {
  let funcRan = false
  let result: T | null = null

  return () => {
    if (!funcRan) {
      result = fn()
      funcRan = true

      return result
    }
    return result!
  }
}
