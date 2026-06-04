/**
 * JQ WASM Lazy Loader
 * Dynamically imports jq-wasm module only when needed
 * Prevents blocking main thread with WASM module loading
 */

let jqInstance: any = null
let jqLoadingPromise: Promise<any> | null = null

/**
 * Lazy load jq-wasm module
 * Only loads once and caches the result
 */
export async function getJQInstance() {
  // Return cached instance if available
  if (jqInstance) {
    return jqInstance
  }

  // If loading is in progress, wait for it
  if (jqLoadingPromise) {
    return jqLoadingPromise
  }

  // Start loading
  jqLoadingPromise = (async () => {
    try {
      // Dynamic import to prevent blocking initial load
      const jq = await import('jq-wasm')
      jqInstance = jq
      return jq
    } catch (error) {
      console.error('Failed to load jq-wasm:', error)
      jqLoadingPromise = null
      throw error
    }
  })()

  return jqLoadingPromise
}

/**
 * Execute JQ filter on JSON data
 * Lazily loads jq-wasm on first use
 */
export async function executeJQFilter(
  input: any,
  filter: string
): Promise<{
  exitCode: number
  stdout?: string | object
  stderr?: string
}> {
  try {
    const jq = await getJQInstance()
    return await jq.raw(input, filter)
  } catch (error) {
    console.error('JQ filter execution failed:', error)
    throw error
  }
}

/**
 * Check if jq module is already loaded
 */
export function isJQLoaded(): boolean {
  return jqInstance !== null
}

/**
 * Preload jq-wasm in the background
 * Can be called during idle time for smoother interaction
 */
export async function preloadJQ(): Promise<void> {
  if (!isJQLoaded() && !jqLoadingPromise) {
    try {
      await getJQInstance()
    } catch (error) {
      // Preload failures are non-critical
      console.debug('JQ preload failed:', error)
    }
  }
}
